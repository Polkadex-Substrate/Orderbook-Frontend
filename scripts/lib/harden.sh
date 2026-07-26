#!/usr/bin/env bash
#
# Hardening helpers, sourced by install.sh.
#
# SCOPE, honestly stated: this hardens the *host and service* around a
# public, read-only web application. It does not make a machine "secure" —
# that depends on your network, your SSH key hygiene, patching cadence and
# what else runs on the box. Each function below states what it defends
# against so you can judge whether it's worth enabling.
#
# Nothing here is enabled implicitly except the service sandbox: firewall,
# SSH changes, fail2ban and automatic updates all require explicit flags,
# because silently reconfiguring SSH or a firewall on someone's server is a
# good way to lock them out of it.

# ── Kernel / sysctl ─────────────────────────────────────────────────────
# Defends against: SYN floods, IP spoofing, ICMP redirect and source-route
# attacks, and reduces info leaked to an attacker probing the host.
harden_sysctl() {
  log "Applying kernel network hardening (sysctl)"
  [ "$DRY_RUN" -eq 1 ] && { echo "  [dry-run] write /etc/sysctl.d/99-$SERVICE_NAME.conf"; return; }
  cat > "/etc/sysctl.d/99-$SERVICE_NAME.conf" <<'EOF'
# SYN flood resistance
net.ipv4.tcp_syncookies = 1
net.ipv4.tcp_max_syn_backlog = 4096
net.ipv4.tcp_synack_retries = 2

# Reject spoofed packets (reverse path filtering)
net.ipv4.conf.all.rp_filter = 1
net.ipv4.conf.default.rp_filter = 1

# Ignore ICMP redirects and source-routed packets — both are used to
# redirect traffic through an attacker.
net.ipv4.conf.all.accept_redirects = 0
net.ipv4.conf.default.accept_redirects = 0
net.ipv4.conf.all.secure_redirects = 0
net.ipv4.conf.all.send_redirects = 0
net.ipv4.conf.default.send_redirects = 0
net.ipv4.conf.all.accept_source_route = 0
net.ipv4.conf.default.accept_source_route = 0
net.ipv6.conf.all.accept_redirects = 0
net.ipv6.conf.default.accept_redirects = 0
net.ipv6.conf.all.accept_source_route = 0

# Log packets with impossible addresses
net.ipv4.conf.all.log_martians = 1

# Don't respond to broadcast pings (smurf amplification)
net.ipv4.icmp_echo_ignore_broadcasts = 1
net.ipv4.icmp_ignore_bogus_error_responses = 1

# Restrict kernel pointer and dmesg exposure to unprivileged users
kernel.kptr_restrict = 2
kernel.dmesg_restrict = 1

# Harden ptrace: a compromised process can't attach to its siblings
kernel.yama.ptrace_scope = 1

# ASLR, fully randomised
kernel.randomize_va_space = 2

# Restrict core dumps of setuid binaries
fs.suid_dumpable = 0

# Protect against hardlink/symlink races in world-writable dirs (/tmp)
fs.protected_hardlinks = 1
fs.protected_symlinks = 1
EOF
  sysctl --system >/dev/null 2>&1 || warn "sysctl reload reported errors (often benign in containers)"
}

# ── Cloudflare origin IP ranges ─────────────────────────────────────────
# Fetched at install time rather than hardcoded: Cloudflare does change these,
# and a stale baked-in list silently locks out real visitors. Cached under
# /etc so nginx and the firewall use the same snapshot.
CF_IP_CACHE=/etc/orderbook-fe/cloudflare-ips
CF_IPS_FETCHED=0
cloudflare_fetch_ips() {
  # Fetch once per run — called from both the nginx and firewall stages.
  [ "$CF_IPS_FETCHED" = "1" ] && return 0

  # In dry-run, still fetch (it is a read-only GET) but write to a temp file
  # instead of /etc. Skipping the fetch would make the preview claim 80/443
  # are opened to the world when the real run restricts them to Cloudflare —
  # a dry-run that misrepresents the firewall is worse than no dry-run.
  if [ "$DRY_RUN" -eq 1 ]; then
    CF_IP_CACHE="$(mktemp)"
    echo "  [dry-run] fetch Cloudflare IP ranges -> $CF_IP_CACHE"
  fi

  local dir; dir="$(dirname "$CF_IP_CACHE")"
  mkdir -p "$dir"
  local v4 v6
  v4="$(curl -fsS --max-time 20 https://www.cloudflare.com/ips-v4 2>/dev/null || true)"
  v6="$(curl -fsS --max-time 20 https://www.cloudflare.com/ips-v6 2>/dev/null || true)"
  # Sanity-check rather than trust: a captive portal or error page would
  # otherwise be written straight into a firewall rule.
  if ! echo "$v4" | grep -Eq '^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+/[0-9]+$'; then
    warn "Could not fetch Cloudflare IPv4 ranges — leaving 80/443 open to all."
    return 1
  fi
  printf '%s\n%s\n' "$v4" "$v6" | grep -E '^[0-9a-fA-F:.]+/[0-9]+$' > "$CF_IP_CACHE"
  CF_IPS_FETCHED=1
  log "Cloudflare ranges cached: $(wc -l < "$CF_IP_CACHE") prefixes"
  return 0
}

# ── Host firewall ───────────────────────────────────────────────────────
# Defends against: direct access to the app port and to any other service
# listening on the box. The app itself should only be reachable via the
# reverse proxy.
#
# With Cloudflare in front, 80/443 are additionally restricted to Cloudflare's
# ranges. Without that, anyone who learns the origin IP can bypass Cloudflare
# entirely — along with its WAF, rate limiting and bot rules — by sending a
# Host header directly. DNS history sites make origin IPs easy to find.
harden_firewall() {
  local ssh_port="${1:-22}"
  local cf_only="${2:-0}"
  local cf_ranges=""

  if [ "$cf_only" = "1" ] && cloudflare_fetch_ips && [ -s "$CF_IP_CACHE" ]; then
    cf_ranges="$(cat "$CF_IP_CACHE")"
    log "Configuring host firewall (default deny; 80/443 restricted to Cloudflare)"
  else
    [ "$cf_only" = "1" ] && warn "Falling back to open 80/443."
    log "Configuring host firewall (default deny inbound)"
  fi

  if command -v ufw >/dev/null; then
    run "ufw --force reset"
    run "ufw default deny incoming"
    run "ufw default allow outgoing"
    run "ufw allow ${ssh_port}/tcp comment 'ssh'"
    if [ -n "$cf_ranges" ]; then
      while read -r cidr; do
        [ -n "$cidr" ] || continue
        run "ufw allow from $cidr to any port 80  proto tcp comment 'cloudflare'"
        run "ufw allow from $cidr to any port 443 proto tcp comment 'cloudflare'"
      done <<< "$cf_ranges"
    else
      run "ufw allow 80/tcp comment 'http'"
      run "ufw allow 443/tcp comment 'https'"
    fi
    run "ufw --force enable"
  elif command -v firewall-cmd >/dev/null; then
    run "systemctl enable --now firewalld"
    run "firewall-cmd --permanent --add-service=ssh"
    [ "$ssh_port" != "22" ] && run "firewall-cmd --permanent --add-port=${ssh_port}/tcp"
    if [ -n "$cf_ranges" ]; then
      # rich rules scope the ports to Cloudflare sources
      while read -r cidr; do
        [ -n "$cidr" ] || continue
        local fam=ipv4; case "$cidr" in *:*) fam=ipv6 ;; esac
        run "firewall-cmd --permanent --add-rich-rule='rule family=\"$fam\" source address=\"$cidr\" port port=\"80\" protocol=\"tcp\" accept'"
        run "firewall-cmd --permanent --add-rich-rule='rule family=\"$fam\" source address=\"$cidr\" port port=\"443\" protocol=\"tcp\" accept'"
      done <<< "$cf_ranges"
    else
      run "firewall-cmd --permanent --add-service=http"
      run "firewall-cmd --permanent --add-service=https"
    fi
    run "firewall-cmd --reload"
  elif command -v nft >/dev/null; then
    [ "$DRY_RUN" -eq 1 ] && { echo "  [dry-run] write /etc/nftables.conf"; return; }
    local web_rule='tcp dport { 80, 443 } accept'
    if [ -n "$cf_ranges" ]; then
      local v4list v6list
      v4list="$(echo "$cf_ranges" | grep -v ':' | paste -sd, -)"
      v6list="$(echo "$cf_ranges" | grep ':'    | paste -sd, -)"
      web_rule="ip saddr { $v4list } tcp dport { 80, 443 } accept"
      [ -n "$v6list" ] && web_rule="$web_rule
    ip6 saddr { $v6list } tcp dport { 80, 443 } accept"
    fi
    cat > /etc/nftables.conf <<EOF
#!/usr/sbin/nft -f
flush ruleset
table inet filter {
  chain input {
    type filter hook input priority 0; policy drop;
    ct state established,related accept
    ct state invalid drop
    iif lo accept
    ip protocol icmp accept
    ip6 nexthdr ipv6-icmp accept
    tcp dport { $ssh_port } accept
    $web_rule
  }
  chain forward { type filter hook forward priority 0; policy drop; }
  chain output  { type filter hook output  priority 0; policy accept; }
}
EOF
    run "systemctl enable --now nftables"
    run "nft -f /etc/nftables.conf"
  else
    warn "No supported firewall tool found (ufw/firewalld/nft) — skipping.
     The app port $PORT may be reachable directly from the network."
    return
  fi

  if [ -n "$cf_ranges" ]; then
    log "Firewall: ssh(${ssh_port}) open; 80/443 only from Cloudflare"
  else
    log "Firewall: inbound limited to ssh(${ssh_port}), 80, 443"
  fi

  # Docker installs its own iptables DOCKER chain, which is consulted BEFORE
  # ufw's rules — a published port is then reachable regardless of what ufw
  # reports. Worth saying out loud on a host that has Docker installed.
  if command -v docker >/dev/null; then
    warn "Docker is installed on this host. Docker bypasses ufw by writing its
     own iptables rules, so any container started with '-p 3000:3000' will be
     internet-reachable even though ufw says otherwise. Publish to
     '127.0.0.1:PORT:PORT' instead."
  fi
}

# ── The app must not be reachable except through the proxy ──────────────
# Defends against: bypassing the proxy's rate limits, headers and TLS by
# hitting :3000 directly.
harden_bind_localhost() {
  log "Binding the app to 127.0.0.1 only (reachable via the proxy)"
  if [ "$DRY_RUN" -eq 0 ]; then
    sed -i 's/^HOSTNAME=.*/HOSTNAME=127.0.0.1/' "$ENV_FILE" 2>/dev/null || true
    grep -q '^HOSTNAME=' "$ENV_FILE" || echo "HOSTNAME=127.0.0.1" >> "$ENV_FILE"
  fi
}

# ── fail2ban ────────────────────────────────────────────────────────────
# Defends against: SSH brute force, and (with the nginx jails) crude HTTP
# floods and scanner noise.
harden_fail2ban() {
  log "Installing fail2ban"
  pkg_install fail2ban || { warn "fail2ban unavailable for this distro — skipping"; return; }
  [ "$DRY_RUN" -eq 1 ] && return
  cat > /etc/fail2ban/jail.d/"$SERVICE_NAME".local <<EOF
[DEFAULT]
bantime  = 1h
findtime = 10m
maxretry = 5
backend  = auto

[sshd]
enabled = true

[nginx-http-auth]
enabled = true

[nginx-botsearch]
enabled = true
EOF
  run "systemctl enable --now fail2ban" || warn "could not start fail2ban"
}

# ── Unattended security updates ─────────────────────────────────────────
# Defends against: known-CVE exploitation of the OS and of Node.
harden_auto_updates() {
  log "Enabling automatic security updates"
  case "$PKG" in
    apt)
      pkg_install unattended-upgrades
      [ "$DRY_RUN" -eq 1 ] && return
      cat > /etc/apt/apt.conf.d/20auto-upgrades <<'EOF'
APT::Periodic::Update-Package-Lists "1";
APT::Periodic::Unattended-Upgrade "1";
EOF
      run "systemctl enable --now unattended-upgrades" || true
      ;;
    dnf)
      pkg_install dnf-automatic
      [ "$DRY_RUN" -eq 0 ] && sed -i 's/^apply_updates.*/apply_updates = yes/' \
        /etc/dnf/automatic.conf 2>/dev/null || true
      run "systemctl enable --now dnf-automatic.timer" || true
      ;;
    yum)
      pkg_install yum-cron
      run "systemctl enable --now yum-cron" || true
      ;;
    zypper)
      run "systemctl enable --now transactional-update.timer" 2>/dev/null \
        || warn "enable openSUSE automatic updates manually"
      ;;
    *)
      warn "No automatic-update mechanism configured for $PKG — patch manually"
      ;;
  esac
}

# ── SSH ─────────────────────────────────────────────────────────────────
# Defends against: password guessing and root login.
# DANGEROUS if you don't already have a working key — hence the guard.
harden_ssh() {
  local cfg=/etc/ssh/sshd_config
  [ -f "$cfg" ] || { warn "no sshd_config — skipping SSH hardening"; return; }

  # Refuse to disable passwords unless at least one authorized_keys exists,
  # otherwise this locks the operator out of their own server.
  local has_keys=0
  for f in /root/.ssh/authorized_keys /home/*/.ssh/authorized_keys; do
    [ -s "$f" ] && has_keys=1
  done
  if [ "$has_keys" -eq 0 ]; then
    warn "No authorized_keys found anywhere — NOT touching SSH.
     Set up key-based login first, then re-run with --harden-ssh."
    return
  fi

  log "Hardening SSH (key-only, no root login)"
  [ "$DRY_RUN" -eq 1 ] && return
  cp "$cfg" "$cfg.bak.$(date +%Y%m%d%H%M%S)"
  mkdir -p /etc/ssh/sshd_config.d
  cat > /etc/ssh/sshd_config.d/99-"$SERVICE_NAME".conf <<'EOF'
PermitRootLogin no
PasswordAuthentication no
KbdInteractiveAuthentication no
ChallengeResponseAuthentication no
PermitEmptyPasswords no
MaxAuthTries 3
LoginGraceTime 30
X11Forwarding no
AllowAgentForwarding no
AllowTcpForwarding no
ClientAliveInterval 300
ClientAliveCountMax 2
EOF
  # Older sshd ignores the drop-in dir; fall back to editing the main file.
  if ! grep -q "^Include /etc/ssh/sshd_config.d/" "$cfg"; then
    warn "sshd has no Include directive; applying settings to $cfg directly"
    sed -i 's/^#*PermitRootLogin.*/PermitRootLogin no/;s/^#*PasswordAuthentication.*/PasswordAuthentication no/' "$cfg"
  fi
  if sshd -t 2>/dev/null; then
    run "systemctl reload sshd 2>/dev/null || systemctl reload ssh"
  else
    warn "sshd config test FAILED — reverting SSH changes"
    rm -f /etc/ssh/sshd_config.d/99-"$SERVICE_NAME".conf
  fi
}

# ── nginx: security headers, rate limits, TLS posture ───────────────────
# Defends against: clickjacking, MIME sniffing, referrer leakage, request
# floods, oversized bodies, and version disclosure.
nginx_hardening_snippet() {
  cat <<'EOF'
    # Do not advertise the nginx version.
    server_tokens off;

    # Clickjacking: the app has no reason to be framed.
    add_header X-Frame-Options "DENY" always;
    # MIME sniffing.
    add_header X-Content-Type-Options "nosniff" always;
    # Limit referrer leakage to third parties.
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    # Deny device APIs the app doesn't use.
    add_header Permissions-Policy "camera=(), microphone=(), geolocation=(), payment=(), usb=()" always;
    # Isolate the browsing context, but ALLOW POPUPS to keep talking to us.
    # Plain "same-origin" severs window.opener for cross-origin popups, which
    # breaks every wallet that authenticates in a popup — Coinbase Smart
    # Wallet logs an explicit error, and WalletConnect's popup flow silently
    # never returns. "same-origin-allow-popups" keeps the isolation that
    # matters (other origins still cannot reference this window) while
    # letting our own popups post back.
    add_header Cross-Origin-Opener-Policy "same-origin-allow-popups" always;

    # NOTE: no Content-Security-Policy here. A wallet dApp loads scripts and
    # opens sockets to wallet extensions, RPC endpoints and indexers; a CSP
    # written blind would break the app. Add one once you have enumerated
    # those origins — report-only first.

    # Cap request size: this app accepts no uploads.
    client_max_body_size 1m;
    client_body_timeout 15s;
    client_header_timeout 15s;
    send_timeout 30s;

    # Cloudflare stacks CF-Connecting-IP, CF-Ray, CF-Visitor, CF-IPCountry and
    # X-Forwarded-For on top of the browser's cookies. Past nginx's default
    # (4 8k) the response is a bare 400 with no explanation — which shows up
    # as random static assets failing while the HTML loads fine.
    large_client_header_buffers 8 32k;
EOF
}

# ── Cloudflare real client IP ───────────────────────────────────────────
# Without this, every request appears to originate from a Cloudflare edge IP.
# That breaks rate limiting in the worst possible way: limit_req keys on
# $binary_remote_addr, so a few thousand users collapse into a handful of
# buckets and legitimate traffic gets throttled while an attacker behind a
# different edge sails through. Logs and fail2ban are equally useless.
#
# Written to a conf.d snippet so it applies http-wide.
cloudflare_realip_conf() {
  local out="/etc/nginx/conf.d/01-$SERVICE_NAME-cloudflare.conf"
  [ "$DRY_RUN" -eq 1 ] && { echo "  [dry-run] write $out"; return; }
  [ -s "$CF_IP_CACHE" ] || { warn "No Cloudflare IP cache — skipping real_ip config."; return; }
  {
    echo "# Generated by install.sh — Cloudflare edge ranges."
    echo "# Refresh after Cloudflare changes them: re-run the installer."
    while read -r cidr; do
      [ -n "$cidr" ] && echo "set_real_ip_from $cidr;"
    done < "$CF_IP_CACHE"
    # CF-Connecting-IP is set by Cloudflare and cannot be spoofed by a client
    # once set_real_ip_from restricts trust to Cloudflare's ranges.
    echo "real_ip_header CF-Connecting-IP;"
  } > "$out"
  log "nginx: real client IP restored from CF-Connecting-IP"
}
