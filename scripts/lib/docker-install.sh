#!/usr/bin/env bash
#
# Distro-aware Docker Engine installation, sourced by build-release.sh.
#
# Installs docker-ce plus the buildx and compose plugins from Docker's own
# repository where one exists, falling back to distro packages elsewhere. The
# plugins matter: `docker.io` / `docker` in most distro repos ships neither,
# and build-release.sh's --platform flag needs buildx while docker-compose.yml
# needs `docker compose`.
#
# Deliberately NOT using https://get.docker.com — it is Docker's official
# convenience script, but piping a remote script into a root shell is a worse
# habit than adding a signed apt/dnf repo, and it refuses to run on several of
# the distros the installer already supports.
#
# Requires: log/warn/die and run() from the calling script.

# Reuse the same detection logic and ordering as install.sh. RHEL-family
# before fedora: Rocky/Alma/Amazon all carry "fedora" in ID_LIKE.
docker_detect_pkg() {
  local os_id="" os_like=""
  if [ -r /etc/os-release ]; then
    # shellcheck disable=SC1091
    . /etc/os-release
    os_id="${ID:-}"; os_like="${ID_LIKE:-}"
  fi
  case "$os_id $os_like" in
    *alpine*)                                   echo apk ;;
    *debian*|*ubuntu*|*raspbian*|*linuxmint*)   echo apt ;;
    *amzn*)                                     echo amzn ;;
    *rhel*|*centos*|*rocky*|*almalinux*)        command -v dnf >/dev/null && echo dnf || echo yum ;;
    *fedora*)                                   echo dnf ;;
    *suse*|*sles*|*opensuse*)                   echo zypper ;;
    *arch*|*manjaro*)                           echo pacman ;;
    *)
      for c in apt-get dnf yum zypper pacman apk; do
        command -v "$c" >/dev/null && { echo "${c%-get}"; return; }
      done
      echo ""
      ;;
  esac
}

# Privilege escalation only where needed, so this works when invoked as a
# normal user with sudo available.
docker_sudo() {
  if [ "$(id -u)" -eq 0 ]; then "$@"
  elif command -v sudo >/dev/null; then sudo "$@"
  else die "need root (or sudo) to install Docker"
  fi
}

install_docker() {
  local pkg; pkg="$(docker_detect_pkg)"
  [ -n "$pkg" ] || die "could not determine the package manager — install Docker manually"

  log "Installing Docker Engine (package manager: $pkg)"

  case "$pkg" in
    apt)
      local id codename arch
      # shellcheck disable=SC1091
      . /etc/os-release
      id="$ID"
      # Ubuntu derivatives (Mint, Pop!_OS) set VERSION_CODENAME to their own
      # release name, which Docker's repo does not have. UBUNTU_CODENAME is
      # the upstream one.
      codename="${UBUNTU_CODENAME:-$VERSION_CODENAME}"
      case "$id" in
        ubuntu|debian) : ;;
        linuxmint|pop|zorin) id=ubuntu ;;
        raspbian)            id=debian ;;
        *) id=debian ;;
      esac
      arch="$(dpkg --print-architecture)"

      docker_sudo env DEBIAN_FRONTEND=noninteractive apt-get update
      docker_sudo env DEBIAN_FRONTEND=noninteractive apt-get install -y \
        ca-certificates curl gnupg
      docker_sudo install -m 0755 -d /etc/apt/keyrings
      docker_sudo sh -c "curl -fsSL https://download.docker.com/linux/$id/gpg \
        -o /etc/apt/keyrings/docker.asc"
      docker_sudo chmod a+r /etc/apt/keyrings/docker.asc
      docker_sudo sh -c "echo 'deb [arch=$arch signed-by=/etc/apt/keyrings/docker.asc] \
https://download.docker.com/linux/$id $codename stable' > /etc/apt/sources.list.d/docker.list"
      docker_sudo env DEBIAN_FRONTEND=noninteractive apt-get update
      docker_sudo env DEBIAN_FRONTEND=noninteractive apt-get install -y \
        docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
      ;;

    dnf|yum)
      local id
      # shellcheck disable=SC1091
      . /etc/os-release
      id="$ID"; case "$id" in rocky|almalinux|centos) id=centos ;; esac
      docker_sudo "$pkg" install -y dnf-plugins-core || docker_sudo "$pkg" install -y yum-utils
      docker_sudo sh -c "curl -fsSL https://download.docker.com/linux/$id/docker-ce.repo \
        -o /etc/yum.repos.d/docker-ce.repo"
      docker_sudo "$pkg" install -y \
        docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
      ;;

    amzn)
      # Amazon Linux has no Docker CE repo. AL2023 ships docker in the main
      # repo; AL2 needs amazon-linux-extras. Neither provides the compose
      # plugin, so install it by hand.
      if command -v dnf >/dev/null; then
        docker_sudo dnf install -y docker
      else
        docker_sudo amazon-linux-extras install -y docker
      fi
      local plugin_dir=/usr/libexec/docker/cli-plugins
      docker_sudo mkdir -p "$plugin_dir"
      if [ ! -x "$plugin_dir/docker-compose" ]; then
        docker_sudo sh -c "curl -fsSL \
'https://github.com/docker/compose/releases/latest/download/docker-compose-linux-$(uname -m)' \
-o $plugin_dir/docker-compose" && docker_sudo chmod +x "$plugin_dir/docker-compose" \
          || warn "compose plugin not installed — 'docker compose' will be unavailable"
      fi
      ;;

    zypper)  docker_sudo zypper --non-interactive install docker docker-compose ;;
    pacman)  docker_sudo pacman -Sy --noconfirm docker docker-buildx docker-compose ;;
    apk)     docker_sudo apk add --no-cache docker docker-cli-buildx docker-cli-compose ;;
  esac

  # Start the daemon. Alpine is OpenRC; everything else systemd.
  if [ "$pkg" = apk ]; then
    docker_sudo rc-update add docker default 2>/dev/null || true
    docker_sudo rc-service docker start 2>/dev/null || true
  else
    docker_sudo systemctl enable --now docker 2>/dev/null \
      || warn "could not enable the docker service automatically"
  fi

  command -v docker >/dev/null || die "Docker installation failed"
  log "Installed $(docker --version 2>/dev/null || echo docker)"

  # A non-root user needs group membership, and that only takes effect on a
  # NEW login — the current shell will keep getting permission denied.
  if [ "$(id -u)" -ne 0 ] && ! docker info >/dev/null 2>&1; then
    docker_sudo usermod -aG docker "$USER" 2>/dev/null || true
    die "Added $USER to the 'docker' group, but group membership only applies to
new logins. Log out and back in (or run: newgrp docker), then re-run this script."
  fi
}

# Check for Docker and install it if missing, subject to the caller's policy.
#   $1 = 1 to install without asking, 0 to prompt / refuse
ensure_docker() {
  local auto="${1:-0}"

  if command -v docker >/dev/null && docker info >/dev/null 2>&1; then
    return 0
  fi

  if command -v docker >/dev/null; then
    # Installed but unreachable — installing again will not help.
    if [ "$(id -u)" -ne 0 ] && ! groups 2>/dev/null | grep -qw docker; then
      die "Docker is installed but this user cannot reach the daemon.
Run: sudo usermod -aG docker $USER   then log out and back in."
    fi
    die "Docker is installed but the daemon is not responding.
Try: sudo systemctl start docker"
  fi

  if [ "$auto" -eq 1 ]; then
    install_docker
  elif [ -t 0 ]; then
    printf 'Docker is not installed. Install Docker Engine now? [y/N] '
    read -r reply
    case "$reply" in
      [yY]*) install_docker ;;
      *)     die "Docker is required for image builds (use --tarball for a bare-metal build)" ;;
    esac
  else
    die "docker is not installed.
Re-run with --install-docker to install it automatically, or use --tarball."
  fi
}
