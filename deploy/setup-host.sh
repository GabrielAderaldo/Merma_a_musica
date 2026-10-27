#!/usr/bin/env bash
# Prepara (ou atualiza) a VM para o Mermã (ADR-0017): swap, Podman 5, usuário de serviço, units, segredos e o bloco
# do Caddy do host. Pode rodar quantas vezes quiser: cada passo confere se já foi feito, e nenhum segredo é trocado.
#
# Roda NA VM, como root, de dentro de uma cópia da pasta deploy/:
#   sudo bash deploy/setup-host.sh <domínio>        ex.: sudo bash deploy/setup-host.sh merma.caninhagames.fortal.br
# Não sobe a API: a imagem chega depois, pelo merma-deploy.
set -euo pipefail

readonly DOMAIN=${1:?uso: setup-host.sh <domínio>}
HERE=$(cd "$(dirname "$0")" && pwd)
readonly HERE
# Usuário de serviço dono do pod (rootless, com linger).
readonly SVC=merma

# Swap de 2 GB: com o teto de memória dos containers (ADR-0017.R9), o OOM pega o Mermã antes dos outros sites da VM.
if ! swapon --show=NAME --noheadings | grep -qx /swapfile; then
  if [[ ! -f /swapfile ]]; then
    fallocate -l 2G /swapfile
    chmod 600 /swapfile
    mkswap /swapfile >/dev/null
  fi
  swapon /swapfile
fi
grep -q '^/swapfile ' /etc/fstab || echo '/swapfile none swap sw 0 0' >>/etc/fstab

# Podman 5.x do apt (o .pod e o Notify=healthy do Quadlet são do 5.0).
command -v podman >/dev/null || DEBIAN_FRONTEND=noninteractive apt-get install -y -q podman
podman --version | grep -q ' 5\.' || {
  echo "setup-host: precisa de Podman 5.x, achei $(podman --version)" >&2
  exit 1
}

# Usuário de serviço com linger: os containers sobem no boot sem ninguém logado.
id "$SVC" >/dev/null 2>&1 || useradd --create-home --shell /usr/sbin/nologin "$SVC"
loginctl enable-linger "$SVC"
uid=$(id -u "$SVC")
home=$(getent passwd "$SVC" | cut -d: -f6)
for _ in $(seq 1 40); do [[ -S /run/user/$uid/bus ]] && break; sleep 0.5; done

# Roda um comando como o usuário de serviço, com o systemd --user dele.
as_svc() {
  sudo -u "$SVC" XDG_RUNTIME_DIR="/run/user/$uid" DBUS_SESSION_BUS_ADDRESS="unix:path=/run/user/$uid/bus" "$@"
}

# Units do Quadlet, o merma-deploy e o api.env (o que não é segredo e muda por host).
units="$home/.config/containers/systemd"
install -d -o "$SVC" -g "$SVC" "$home/.config" "$home/.config/containers" "$units" "$home/.config/merma" "$home/bin"
install -m 644 -o "$SVC" -g "$SVC" "$HERE"/quadlet/*.pod "$HERE"/quadlet/*.container "$HERE"/quadlet/*.volume "$units/"
install -m 755 -o "$SVC" -g "$SVC" "$HERE/merma-deploy" "$home/bin/merma-deploy"
if [[ ! -f $home/.config/merma/api.env ]]; then
  printf 'PUBLIC_BASE_URL=https://%s\n' "$DOMAIN" >"$home/.config/merma/api.env"
  chown "$SVC:$SVC" "$home/.config/merma/api.env"
  chmod 600 "$home/.config/merma/api.env"
fi

# Segredos (ADR-0017.R4): gerados aqui, nunca exibidos, e só criados se faltarem. Hex para caber em URL sem escape.
secret() { as_svc podman secret exists "$1" || printf '%s' "$2" | as_svc podman secret create "$1" - >/dev/null; }
reveal() { as_svc podman secret inspect --showsecret --format '{{.SecretData}}' "$1"; }
secret merma-pg-password "$(openssl rand -hex 32)"
secret merma-redis-password "$(openssl rand -hex 32)"
secret merma-session-secret "$(openssl rand -hex 32)"
secret merma-audio-hmac-secret "$(openssl rand -hex 32)"
secret merma-metrics-token "$(openssl rand -hex 32)"
as_svc podman secret exists merma-postgres-url ||
  secret merma-postgres-url "postgres://merma:$(reveal merma-pg-password)@127.0.0.1:5432/merma"
as_svc podman secret exists merma-redis-url ||
  secret merma-redis-url "redis://:$(reveal merma-redis-password)@127.0.0.1:6379"

# Postgres e Redis no ar (o pod sobe junto). A API espera a imagem do merma-deploy.
as_svc systemctl --user daemon-reload
as_svc systemctl --user start merma-postgres.service merma-redis.service

# Caddy do host: importa /etc/caddy/sites/ e ganha o bloco do Mermã. Se a config nova não validar, volta a anterior
# antes de recarregar, para não derrubar os outros sites da VM.
install -d -m 755 /etc/caddy/sites /srv/merma/web
[[ -f /srv/merma/web/index.html ]] || install -m 644 "$HERE/caddy/placeholder/index.html" /srv/merma/web/index.html
cp /etc/caddy/Caddyfile /etc/caddy/Caddyfile.bak
[[ -f /etc/caddy/sites/merma.caddy ]] && cp /etc/caddy/sites/merma.caddy /etc/caddy/merma.caddy.bak
if ! grep -q '^import /etc/caddy/sites/\*\.caddy' /etc/caddy/Caddyfile; then
  { printf 'import /etc/caddy/sites/*.caddy\n\n'; cat /etc/caddy/Caddyfile.bak; } >/etc/caddy/Caddyfile
fi
sed "s/__MERMA_DOMAIN__/$DOMAIN/g" "$HERE/caddy/merma.caddy" >/etc/caddy/sites/merma.caddy
if ! caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile >/dev/null 2>&1; then
  cp /etc/caddy/Caddyfile.bak /etc/caddy/Caddyfile
  if [[ -f /etc/caddy/merma.caddy.bak ]]; then cp /etc/caddy/merma.caddy.bak /etc/caddy/sites/merma.caddy; else rm -f /etc/caddy/sites/merma.caddy; fi
  echo "setup-host: a config do Caddy não validou; voltei a anterior" >&2
  caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile 2>&1 | tail -3 >&2
  exit 1
fi
systemctl reload caddy

echo "setup-host: pronto. Postgres $(as_svc systemctl --user is-active merma-postgres.service), Redis $(as_svc systemctl --user is-active merma-redis.service), Caddy $(systemctl is-active caddy)"
echo "setup-host: falta a API: sudo -u $SVC XDG_RUNTIME_DIR=/run/user/$uid $home/bin/merma-deploy <imagem@sha256:…>"
