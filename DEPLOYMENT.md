# Deploying OFE (apps/hestia) to a standalone server

Next.js 15 in `output: "standalone"` mode - the build emits a self-contained
`server.js` plus a pruned `node_modules`. No Vercel, no serverless runtime
required: any box with Node 22 (or Docker) can serve it.

**Node 22 is a hard floor.** `@hyperbridge/sdk` declares
`engines.node ">=22.x.x"` and yarn refuses to install on anything older. Node
20 also reached end of life in April 2026. The floor is pinned in five places
- `Dockerfile`, `.nvmrc`, `package.json` `engines`, `scripts/install.sh`
(`NODE_MIN`) and `scripts/build-release.sh`; move all five together.

---

## The one thing that will bite you

**`NEXT_PUBLIC_*` values are baked in at build time.**
They cannot be changed by restarting the container with a different env.
Changing one means rebuilding the image. They also ship to every browser -
never put a real secret in one. Everything else (`GRAPHQL_URL`,
`POLKADEX_CHAIN`, …) is read server-side and can vary per environment.

The same is true of everything in `next.config.js`'s `env:` block, not just
the `NEXT_PUBLIC_` prefix. Anything there that is referenced from client code
ends up in the browser bundle.

The `@aksumite/*` and `@mitrabook/*` libraries are consumed **from npm** - the
repo no longer vendors their source, so `git clone && yarn install &&
yarn build` is the whole story. The workspace packages that *are* built here
are `packages/{core,chart,format,eslint-config,tsconfig}`.

Start from `apps/hestia/.env.example`; it documents every key and what breaks
without it.

---

## Deploying (one command)

On the target host, once:

```bash
cp scripts/deploy.conf.example scripts/deploy.conf
$EDITOR scripts/deploy.conf          # set DOMAIN, TLS mode, hardening
```

Thereafter, every deploy:

```bash
sudo scripts/deploy.sh               # or: sudo yarn deploy
sudo scripts/deploy.sh --dry-run     # preview, changes nothing
```

It chains pull → build image → repack as tarball (from that image, so there is
no second compile) → verify the artifact → install → health-check, and stops at
the first failure.

The verification is the point. Running these steps by hand is how a payload
missing `.next/static` reached production: each step succeeded in isolation, the
app served HTML, and every JS chunk returned 400 - which looks like a proxy or
CDN fault, not a packaging one. `deploy.sh` counts the static JS files in the
tarball **before** the installer can overwrite a working install, then checks a
real asset URL afterwards, not just `/`.

Useful flags: `--no-pull`, `--no-build` (reuse the local image), `--no-harden`,
`--plain-tls`, `--domain`, `--env`, `--keep-backups <n>`, `--replace-env`.

`scripts/deploy.conf` is gitignored - it describes one host, not the project.

### Is it idempotent?

Re-running converges on the same end state - the install tree, systemd unit,
nginx vhost and hardening files are all rewritten from scratch each time, so
running twice leaves the same result as running once. Four caveats, all
deliberate:

- **Old installs are moved aside, not deleted.** `/opt/orderbook-fe` becomes
  `/opt/orderbook-fe.bak.<timestamp>`, and each is ~140 MB. They are pruned to
  the 3 most recent (`--keep-backups`, `0` disables). Pruning runs *early*, at
  the moment the old tree is moved, so the newest backup is always retained
  even if the deploy fails afterwards - a rollback target survives every
  outcome.
- **The runtime env file is NOT replaced.** An existing
  `/etc/orderbook-fe/orderbook-fe.env` is kept so hand-edits on the server
  survive a redeploy. The consequence is that editing the *source* env and
  redeploying changes nothing: the installer now warns when the two differ.
  Use `--replace-env` to overwrite (the previous file is saved as `.prev`).
  `NEXT_PUBLIC_*` values are unaffected either way - they are compiled in at
  build time and need a rebuild.
- **`--harden` resets the firewall.** `ufw --force reset` clears all rules and
  re-adds them, so there is a sub-second window with no firewall. The SSH rule
  is re-added before the firewall is re-enabled, so you will not be locked out,
  but do not run it over a link you cannot afford to lose.
- **Cloudflare IP ranges are re-fetched each run.** Intentional - they change,
  and a stale list either blocks real visitors or leaves the origin open.

The service restarts on every run, so expect a few seconds of downtime. This is
a single-host deploy, not a rolling one.

---

## Building

One script, two modes, one env file:

```bash
cp apps/hestia/.env.example apps/hestia/.env
$EDITOR apps/hestia/.env

scripts/build-release.sh              # Docker image  (DEFAULT)
scripts/build-release.sh --tarball    # tarball for install.sh
```

`yarn release` runs the same script. Flags: `--env <file>`, `--repo <name>`,
`--tag <tag>`, `--push`, `--platform <arch>`, `--install-docker`, and
`--skip-install` (tarball mode only).

**Docker on a fresh server.** If Docker is missing, the script offers to
install it - prompting on a terminal, or non-interactively with
`--install-docker` (for CI). It adds Docker's own signed repository and
installs `docker-ce` plus the **buildx and compose plugins**, which the distro
`docker.io` / `docker` packages do not include and which `--platform` and
`docker compose` respectively require. Amazon Linux has no Docker CE repo, so
it uses the distro package and fetches the compose plugin separately.

Note `docker` in Debian/Ubuntu is an unrelated X11 dock applet - `apt-get
install docker` installs the wrong thing. That is why this is scripted.

If you install Docker as a non-root user, the script adds you to the `docker`
group and stops: group membership only applies to a **new login**, so it can't
usefully continue in the current shell.

It warns about any Dockerfile `ARG` that has no value in your env file, so a
silently-empty build var shows up at build time rather than in production.

> **Do not run `docker compose build` on its own.** Compose interpolates
> `${VAR}` from the shell or a *root* `.env` - `env_file:` applies only to the
> running container, not to build args. A bare `docker compose build` bakes
> every value empty, including `NEXT_PUBLIC_PROJECT_ID`, without which the app
> throws at boot. Use the script, or
> `docker compose --env-file apps/hestia/.env build`.

---

## Option A - Release tarball + installer (plain VM, no Docker)

Build a self-contained artifact on a build machine, ship it, install it. The
installer handles Node, a service account, the systemd (or OpenRC) unit, and
optionally an nginx reverse proxy.

```bash
scripts/build-release.sh --tarball
```

If you have already built the Docker image on that host, skip the second
build entirely - the runner stage *is* the assembled standalone tree:

```bash
scripts/build-release.sh --tarball --from-image orderbook-fe:latest
```

That needs no Node, no yarn and no 4 GB rebuild; it extracts `/app` from the
image, verifies `apps/hestia/server.js` and `.next/static` are present, and
records the source image in the `RELEASE` file.

Either way you get `dist/orderbook-fe-<version>-<sha>.tar.gz` plus a
`.sha256`. Copy it to the server and run the bundled installer:

```bash
scp dist/orderbook-fe-*.tar.gz user@host:/tmp/
ssh user@host
cd /tmp && tar xzf orderbook-fe-*.tar.gz
sudo orderbook-fe/install.sh --domain orderbook.example.com
```

Supported: Debian/Ubuntu/Raspbian, RHEL/CentOS/Rocky/Alma, Fedora,
openSUSE/SLES, Arch/Manjaro, Amazon Linux 2 and 2023 (systemd), and Alpine
(OpenRC). The installer detects the distribution, installs Node 22 if the
system's is older, verifies the version it actually got (Arch and Alpine
install "whatever is current", which may not be new enough), and refuses to
run anywhere it can't identify a package manager.

Useful flags - `--port`, `--user`, `--prefix`, `--env <file>`, `--with-nginx`,
`--no-start`, and `--dry-run` to see every action without touching the host.

Re-running the installer upgrades in place: the previous install is moved to
`/opt/orderbook-fe.bak.<timestamp>` and an existing
`/etc/orderbook-fe/orderbook-fe.env` is preserved. Remove it all with
`sudo /tmp/orderbook-fe/uninstall.sh --purge`.

**The tarball is environment-specific.** `NEXT_PUBLIC_*` values are compiled
into the browser bundle at build time, so a build made with staging values
cannot be repointed at production by editing the env file on the server -
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
headers, and - when a proxy is configured - rebinds the app to 127.0.0.1 so it
cannot be reached directly.

Add `--harden-ssh` to enforce key-only SSH with no root login. It **refuses to
run if no `authorized_keys` exists anywhere**, validates the config with
`sshd -t`, and reverts if the test fails. Use `--ssh-port` if you run SSH
somewhere other than 22.

Preview everything first - this changes system state:

```bash
sudo orderbook-fe/install.sh --domain example.com --harden --dry-run
```

Deliberately **not** done: no Content-Security-Policy is set. A wallet dApp
loads scripts and opens sockets to extensions, RPC endpoints and indexers; a
CSP written without enumerating those origins would break the app. Add one in
report-only mode once you know them.

### TLS behind Cloudflare

Use `--cloudflare` instead of certbot when Cloudflare proxies the hostname
(orange cloud). Create an Origin Certificate in the dashboard under
**SSL/TLS → Origin Server → Create Certificate**, save the two files, then:

```bash
sudo install -d -m 0700 /etc/ssl/cloudflare
sudo install -m 0600 origin.pem /etc/ssl/cloudflare/origin.pem
sudo install -m 0600 origin.key /etc/ssl/cloudflare/origin.key

sudo orderbook-fe/install.sh \
  --domain testnet.orderbook.polkadex.ee \
  --cloudflare --harden
```

`--cloudflare` does three things beyond writing a 443 vhost:

1. **Restores the real client IP.** Without it every request appears to come
   from a Cloudflare edge address, so `limit_req` - which keys on
   `$binary_remote_addr` - collapses all users into a handful of buckets and
   throttles legitimate traffic while an attacker on another edge is
   unaffected. Logs and fail2ban are equally blind. The installer fetches
   Cloudflare's published ranges, writes `set_real_ip_from` for each, and sets
   `real_ip_header CF-Connecting-IP`.
2. **Restricts 80/443 to Cloudflare's ranges** (with `--harden`). Origin IPs
   are easy to find in DNS history; without this, anyone can send a Host
   header straight to the origin and skip Cloudflare's WAF and rate limiting
   entirely.
3. **Caches the range list** at `/etc/orderbook-fe/cloudflare-ips` so nginx
   and the firewall agree. Cloudflare changes these occasionally - re-run the
   installer to refresh.

Set the Cloudflare SSL mode to **Full (strict)**. An Origin CA certificate is
trusted only by Cloudflare, so any other mode either fails or silently
downgrades the edge-to-origin hop.

**Wildcards match exactly one label - at both ends.** This bites twice:

- *At the edge*, Cloudflare's free Universal SSL covers only `example.com` and
  `*.example.com`. A third-level name like `testnet.orderbook.example.com` has
  **no edge certificate**, and the TLS handshake fails outright. Fix: use a
  second-level hostname, or buy Advanced Certificate Manager (with Total TLS
  to auto-issue for every proxied hostname).
- *At the origin*, a `*.example.com` cert likewise fails to cover a
  third-level name. Cloudflare then returns **526 Invalid SSL certificate**,
  which names neither the certificate nor the hostname.

The installer now refuses to proceed unless the origin certificate actually
covers `--domain`, and prints what it covers versus what is needed. It also
verifies the certificate and key are a matching pair (they must be copied from
the same "Create Certificate" screen - Cloudflare shows the private key only
once) and that the certificate has not expired. All three checks run *before*
nginx is reconfigured, so a bad certificate cannot take the site down.

Add `--cf-origin-pull` for Authenticated Origin Pulls: nginx then requires a
client certificate that only Cloudflare holds, so a direct connection to the
origin is refused even from an allowed IP range. Strongest option; verify the
site still loads immediately after enabling it.

## Option B - Docker (default)

The repo ships a multi-stage `Dockerfile` and `docker-compose.yml`. The build
context is the **repo root**.

```bash
scripts/build-release.sh                       # -> orderbook-fe:<version>-<sha> + :latest
IMAGE_REPO=orderbook-fe IMAGE_TAG=latest docker compose up -d
```

`IMAGE_REPO` and `IMAGE_TAG` are read from the environment and default to
`orderbook-fe:latest`. Point `IMAGE_REPO` at a registry path to push:

```bash
scripts/build-release.sh --repo <registry>/orderbook-fe --push
```

Serves on host port **8000** → container 3000 (change in `docker-compose.yml`).
Health check hits `/` every 30s; `docker compose ps` shows healthy/unhealthy.

The final image is ~94 MB and contains no build-time secrets - the `ARG`/`ENV`
block lives in the `builder` stage and `runner` is a separate `FROM` that only
copies artifacts. Confirm with:

```bash
docker inspect orderbook-fe:latest --format '{{json .Config.Env}}'
# only PATH, NODE_VERSION, YARN_VERSION, NODE_ENV, PORT, HOSTNAME
```

BuildKit emits `SecretsUsedInArgOrEnv` warnings for `DEFAULT_TRANSFER_TOKEN`
(a ticker symbol - false positive), `GOOGLE_API_KEY` and `READ_ONLY_TOKEN`
(read by client code, so public by design either way), and `SENTRY_AUTH` (a
genuine build-time secret, but never present in the final image).

**Build needs ~4 GB RAM** - `NODE_OPTIONS=--max_old_space_size=4096` is set
because the `@polkadot/api` + chart graph exceeds 2 GB. On a small VPS the
build is OOM-killed with a bare `exit code 137`. Add swap, or build elsewhere
and ship the image.

### Build times

`COPY . .` invalidates the build layer on any source change, so the build step
always re-runs. What it must not do is re-run *from scratch*, which is what a
10-minute rebuild after a one-line edit means.

The Dockerfile keeps three BuildKit cache mounts across builds on the same
host: Next's incremental compiler cache (`.next/cache`), turbo's task cache
(`.turbo`), and the yarn download cache. None of them end up in the image.
Expect the first build after a change to these to be full-length (cold cache),
and subsequent ones to be substantially shorter.

Other levers:

- `sudo scripts/deploy.sh --no-build` reuses the existing local image. Use it
  when re-running the installer after a config change with no code change.
- `--build-arg TURBO_CONCURRENCY=2` parallelises turbo. Default is 1 because
  the Next build alone peaks near 4 GB and a second concurrent task will OOM a
  small VPS. Check `free -h` before raising it.
- Docker prunes cache mounts under disk pressure. If a build is unexpectedly
  slow again, `docker system df` will show whether the cache was evicted.

## Option C - Manual (bare Node 22 + systemd)

```bash
yarn install --frozen-lockfile
yarn build      # turbo builds @orderbook/{core,chart,format} then hestia
```

`--frozen-lockfile` requires `yarn.lock` to be committed - it is, and it must
stay that way. It was `.gitignore`d until 2026-07-26, which made clean-clone
and Docker builds impossible and let every machine resolve dependencies
independently.

The standalone output is not self-contained on disk until you place the two
directories Next deliberately excludes:

```bash
cp -r apps/hestia/public        apps/hestia/.next/standalone/apps/hestia/
cp -r apps/hestia/.next/static  apps/hestia/.next/standalone/apps/hestia/.next/
```

Then `apps/hestia/.next/standalone/` is the entire deployable artifact - copy
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

nginx equivalent - note the WebSocket upgrade headers, which this app needs
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

## Smoke-testing a build before exposing it

Don't publish the port to test. On the build/target host, bind to loopback:

```bash
docker run --rm -p 127.0.0.1:3000:3000 --env-file apps/hestia/.env orderbook-fe:latest
```

and tunnel from your workstation:

```bash
ssh -N -L 3000:127.0.0.1:3000 user@host      # then open http://localhost:3000
```

Two reasons this is not just about firewalls:

- **`localhost` is a secure context; `http://<ip>:3000` is not.** On an
  insecure origin the browser withholds `crypto.subtle`, service-worker
  registration and clipboard APIs, so wallet connect and the PWA fail for
  reasons unrelated to the build.
- **Docker bypasses ufw.** It writes its own iptables rules, so `-p 3000:3000`
  is reachable from the internet even when `ufw status` reports the port
  closed. Always bind published ports to `127.0.0.1` unless a port is
  genuinely meant to be public.

## Post-deploy checks

1. `curl -I https://your-domain/` → 200, and `/` redirects to
   `/trading/<LANDING_PAGE>`.
2. Open the site with devtools: **no** "Project ID is not defined" boot error
   (that's `NEXT_PUBLIC_PROJECT_ID` missing), no anonymous `{}` WalletConnect
   errors.
3. Chart renders - if "Chart data not available", read the console line
   `[GraphV2] getCandles failed…` and check `GRAPHQL_URL` plus the engine
   (see `../orderbook/KNOWN-ISSUES.md`).
4. Faucet nav enabled and `/faucet` reachable (needs `NEXT_PUBLIC_ENABLE_FAUCET`
   plus `NEXT_PUBLIC_FAUCET_URL`/`_API_KEY`).
5. Bridge page connects a wallet and lists destination accounts.

## Updating

Tarball install - build a new release and re-run the installer; it backs up
the old tree and preserves your env file:

```bash
scripts/build-release.sh --tarball
scp dist/orderbook-fe-*.tar.gz user@host:/tmp/
ssh user@host 'cd /tmp && tar xzf orderbook-fe-*.tar.gz && sudo orderbook-fe/install.sh'
```

Docker:

```bash
git pull
scripts/build-release.sh
IMAGE_REPO=orderbook-fe IMAGE_TAG=latest docker compose up -d
```

## Notes

- **Sentry**: `SENTRY_AUTH` is only needed to upload source maps at build
  time. Without it the build still succeeds, sourcemaps just aren't uploaded.
- **PWA/service worker**: enabled in production. After deploying a new version
  users may need one reload to pick it up; the SW is generated per build.
- **Scaling**: the app is stateless - run N containers behind a load balancer.
  No sticky sessions needed (chain/GraphQL websockets are made from the
  browser, not the server).
