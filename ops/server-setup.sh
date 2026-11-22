#!/bin/sh
set -eu

if [ "$(id -u)" -ne 0 ]; then
    echo "server-setup.sh: run it with sudo" >&2
    exit 1
fi

. /etc/os-release
if [ "${ID:-}" != ubuntu ]; then
    echo "server-setup.sh: this script prepares Ubuntu only (found ${ID:-an unknown system})" >&2
    exit 1
fi

if ! command -v docker >/dev/null 2>&1; then
    apt-get update
    apt-get install -y ca-certificates curl
    install -m 0755 -d /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
    chmod a+r /etc/apt/keyrings/docker.asc
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu ${VERSION_CODENAME} stable" \
        > /etc/apt/sources.list.d/docker.list
    apt-get update
    apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
fi
systemctl enable --now docker

apt-get install -y ufw
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw allow 443/udp
ufw --force enable

if [ -z "$(swapon --noheadings 2>/dev/null || true)" ]; then
    total_kb="$(sed -n 's/^MemTotal: *\([0-9]*\) kB$/\1/p' /proc/meminfo)"
    if [ "$total_kb" -lt 4000000 ]; then
        fallocate -l 2G /swapfile
        chmod 600 /swapfile
        mkswap /swapfile
        swapon /swapfile
        grep -q '^/swapfile ' /etc/fstab || echo '/swapfile none swap sw 0 0' >> /etc/fstab
    fi
fi

echo "server-setup.sh: Docker, the firewall (22, 80, 443) and swap are ready"
