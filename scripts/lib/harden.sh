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

# ── Host firewall ───────────────────────────────────────────────────────
# Defends against: direct access to the app port and to any other service
# listening on the box. The app itself should only be reachable via the
# reverse proxy.
harden_firewall() {
  local ssh_port="${1:-22}"
  log "Configuring host firewall (default deny inbound)"

  if command -v ufw >/dev/null; then
    run "ufw --force reset"
    run "ufw default deny incoming"
    run "ufw default allow outgoing"
    run "ufw allow ${ssh_port}/tcp comment 'ssh'"
    run "ufw allow 80/tcp comment 'http'"
    run "ufw allow 443/tcp comment 'https'"
    run "ufw --force enable"
  elif command -v firewall-cmd >/dev/null; then
    run "systemctl enable --now firewalld"
    run "firewall-cmd --permanent --add-service=ssh"
    run "firewall-cmd --permanent --add-service=http"
    run "firewall-cmd --permanent --add-service=https"
    [ "$ssh_port" != "22" ] && run "firewall-cmd --permanent --add-port=${ssh_port}/tcp"
    run "firewall-cmd --reload"
  elif command -v nft >/dev/null; then
    [ "$DRY_RUN" -eq 1 ] && { echo "  [dry-run] write /etc/nftables.conf"; return; }
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
    tcp dport { $ssh_port, 80, 443 } accept
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
  log "Firewall: inbound limited to ssh(${ssh_port}), 80, 443"
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
    # Isolate the browsing context.
    add_header Cross-Origin-Opener-Policy "same-origin" always;

    # NOTE: no Content-Security-Policy here. A wallet dApp loads scripts and
    # opens sockets to wallet extensions, RPC endpoints and indexers; a CSP
    # written blind would break the app. Add one once you have enumerated
    # those origins — report-only first.

    # Cap request size: this app accepts no uploads.
    client_max_body_size 1m;
    client_body_timeout 15s;
    client_header_timeout 15s;
    send_timeout 30s;
EOF
}
