# Deploying OFE (apps/hestia) to a standalone server

Next.js 15 in `output: "standalone"` mode — the build emits a self-contained
`server.js` plus a pruned `node_modules`. No Vercel, no serverless runtime
required: any box with Node 20 (or Docker) can serve it.

---

## The one thing that will bite you

**`NEXT_PUBLIC_*` values are baked in at build time.**
They cannot be changed by restarting the container with a different env.
Changing one means rebuilding the image. They also ship to every browser —
never put a real secret in one. Everything else (`GRAPHQL_URL`,
`POLKADEX_CHAIN`, …) is read server-side and can vary per environment.

The repo is otherwise **self-contained**: the `@mitrabook/*` libraries are
vendored at `packages/mitra/packages/*` as yarn workspace members, so
`git clone && yarn install && yarn build` is the whole story. (They used to
live in a sibling `mitra-ts/` repo consumed via `file:` deps, which yarn
*copied* rather than linked — the cause of many "my library fix isn't
showing up" incidents. Workspace members are symlinked; turbo builds them in
dependency order automatically.)

Start from `apps/hestia/.env.example`; it documents every key and what breaks
without it.

---

## Option A — Release tarball + installer (recommended for a plain VM)

Build a self-contained artifact on a build machine, ship it, install it. The
installer handles Node, a service account, the systemd (or OpenRC) unit, and
optionally an nginx reverse proxy.

```bash
cp apps/hestia/.env.example apps/hestia/.env
$EDITOR apps/hestia/.env
yarn release
```

That produces `dist/orderbook-fe-<version>-<sha>.tar.gz` plus a `.sha256`.
Copy it to the server and run the bundled installer:

```bash
scp dist/orderbook-fe-*.tar.gz user@host:/tmp/
ssh user@host
cd /tmp && tar xzf orderbook-fe-*.tar.gz
sudo orderbook-fe/install.sh --domain orderbook.example.com
```

Supported: Debian/Ubuntu/Raspbian, RHEL/CentOS/Rocky/Alma, Fedora,
openSUSE/SLES, Arch/Manjaro, Amazon Linux 2 and 2023 (systemd), and Alpine
(OpenRC). The installer detects the distribution, installs Node 20 if the
system's is older, and refuses to run anywhere it can't identify a package
manager.

Useful flags — `--port`, `--user`, `--prefix`, `--env <file>`, `--with-nginx`,
`--no-start`, and `--dry-run` to see every action without touching the host.

Re-running the installer upgrades in place: the previous install is moved to
`/opt/orderbook-fe.bak.<timestamp>` and an existing
`/etc/orderbook-fe/orderbook-fe.env` is preserved. Remove it all with
`sudo /tmp/orderbook-fe/uninstall.sh --purge`.

**The tarball is environment-specific.** `NEXT_PUBLIC_*` values are compiled
into the browser bundle at build time, so a build made with staging values
cannot be repointed at production by editing the env file on the server —
build once per environment. Everything else is read at runtime from
`/etc/orderbook-fe/orderbook-fe.env`.

### Hardening

The systemd sandbox is applied unconditionally: no capabilities, a seccomp
allow-list, `ProtectSystem=strict`, read-only application tree owned by root,
one writable path (`.next/cache`), and memory/process ceilings.

Host-level hardening is **opt-in**, because silently reconfiguring a firewall
or SSH on someone's server is how people get locked out of it:

```bash
sudo orderbook-fe/install.sh --domain orderbook.example.com --harden
```

`--harden` applies: kernel/sysctl network hardening (SYN cookies, no ICMP
redirects or source routing, `kptr_restrict`, `ptrace_scope`), a default-deny
firewall via ufw/firewalld/nftables allowing only 22/80/443, fail2ban with SSH
and nginx jails, automatic security updates, nginx rate limiting and security
headers, and — when a proxy is configured — rebinds the app to 127.0.0.1 so it
cannot be reached directly.

Add `--harden-ssh` to enforce key-only SSH with no root login. It **refuses to
run if no `authorized_keys` exists anywhere**, validates the config with
`sshd -t`, and reverts if the test fails. Use `--ssh-port` if you run SSH
somewhere other than 22.

Preview everything first — this changes system state:

```bash
sudo orderbook-fe/install.sh --domain example.com --harden --dry-run
```

Deliberately **not** done: no Content-Security-Policy is set. A wallet dApp
loads scripts and opens sockets to extensions, RPC endpoints and indexers; a
CSP written without enumerating those origins would break the app. Add one in
report-only mode once you know them.

## Option B — Docker

### Docker

The repo ships a multi-stage `Dockerfile` and `docker-compose.yml`.
**Build context is the parent directory**, not the repo.

```bash
cp apps/hestia/.env.example apps/hestia/.env
$EDITOR apps/hestia/.env          # fill in values

docker compose build
docker compose up -d
```

Serves on host port **8000** → container 3000 (change in `docker-compose.yml`).
Health check hits `/` every 30s; `docker compose ps` shows healthy/unhealthy.

Build needs ~4 GB RAM (`NODE_OPTIONS=--max_old_space_size=4096` is set for the
Next build; the `@polkadot/api` + chart graph exceeds the old 2 GB). On a small
VPS, build elsewhere and ship the image:

```bash
docker build -t ofe:$(git rev-parse --short HEAD) .
docker push <registry>/ofe:<tag>          # then pull on the server
```

## Option C — Manual (bare Node 20 + systemd)

```bash
yarn install --frozen-lockfile
yarn build      # turbo builds @mitrabook/* → @orderbook/* → hestia, in order
```

The standalone output is not self-contained on disk until you place the two
directories Next deliberately excludes:

```bash
cp -r apps/hestia/public        apps/hestia/.next/standalone/apps/hestia/
cp -r apps/hestia/.next/static  apps/hestia/.next/standalone/apps/hestia/.next/
```

Then `apps/hestia/.next/standalone/` is the entire deployable artifact — copy
it to the server and run `node apps/hestia/server.js`.

`/etc/systemd/system/ofe.service`:

```ini
[Unit]
Description=Polkadex Orderbook Frontend
After=network.target

[Service]
Type=simple
User=ofe
WorkingDirectory=/srv/ofe
Environment=NODE_ENV=production
Environment=PORT=3000
Environment=HOSTNAME=0.0.0.0
ExecStart=/usr/bin/node apps/hestia/server.js
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl enable --now ofe
```

---

## Reverse proxy (Options B and C)

Option A's installer writes this for you with `--with-nginx`. For the other
options, terminate TLS at nginx/Caddy and proxy to 3000. Caddy, which handles certs
automatically:

```
orderbook.example.com {
    reverse_proxy localhost:3000
}
```

nginx equivalent — note the WebSocket upgrade headers, which this app needs
for the chain connection and orderbook subscriptions:

```nginx
server {
    listen 443 ssl http2;
    server_name orderbook.example.com;
    # ssl_certificate ... (certbot)

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    # Immutable, content-hashed assets
    location /_next/static/ {
        proxy_pass http://127.0.0.1:3000;
        add_header Cache-Control "public, max-age=31536000, immutable";
    }
}
```

---

## Post-deploy checks

1. `curl -I https://your-domain/` → 200, and `/` redirects to
   `/trading/<LANDING_PAGE>`.
2. Open the site with devtools: **no** "Project ID is not defined" boot error
   (that's `NEXT_PUBLIC_PROJECT_ID` missing), no anonymous `{}` WalletConnect
   errors.
3. Chart renders — if "Chart data not available", read the console line
   `[GraphV2] getCandles failed…` and check `GRAPHQL_URL` plus the engine
   (see `../orderbook/KNOWN-ISSUES.md`).
4. Faucet nav enabled and `/faucet` reachable (needs `NEXT_PUBLIC_ENABLE_FAUCET`
   plus `NEXT_PUBLIC_FAUCET_URL`/`_API_KEY`).
5. Bridge page connects a wallet and lists destination accounts.

## Updating

Tarball install — build a new release and re-run the installer; it backs up
the old tree and preserves your env file:

```bash
yarn release
scp dist/orderbook-fe-*.tar.gz user@host:/tmp/
ssh user@host 'cd /tmp && tar xzf orderbook-fe-*.tar.gz && sudo orderbook-fe/install.sh'
```

Docker:

```bash
git pull
docker compose build && docker compose up -d
```

## Notes

- **Sentry**: `SENTRY_AUTH` is only needed to upload source maps at build
  time. Without it the build still succeeds, sourcemaps just aren't uploaded.
- **PWA/service worker**: enabled in production. After deploying a new version
  users may need one reload to pick it up; the SW is generated per build.
- **Scaling**: the app is stateless — run N containers behind a load balancer.
  No sticky sessions needed (chain/GraphQL websockets are made from the
  browser, not the server).
