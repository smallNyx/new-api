#!/usr/bin/env bash
set -euo pipefail

# 一键部署脚本（云服务器）
# 功能：
# 1) 启动前后端容器（使用 docker-compose.oneclick.yml）
# 2) 可选安装 cloudflared
# 3) 自动创建/复用 Tunnel，写入 ~/.cloudflared/config.yml
# 4) 可选安装 systemd 服务并启动
#
# 使用示例：
# chmod +x scripts/deploy-cloudflare-oneclick.sh
# DOCKERHUB_REPO=ymy2345/api IMAGE_TAG=latest \
# DOMAIN_ROOT=cloudgame911.xyz DOMAIN_API=api.cloudgame911.xyz DOMAIN_WWW=www.cloudgame911.xyz \
# ./scripts/deploy-cloudflare-oneclick.sh

log() {
  echo "[deploy] $*"
}

err() {
  echo "[deploy][ERROR] $*" >&2
  exit 1
}

require_cmd() {
  command -v "$1" >/dev/null 2>&1 || err "缺少命令: $1"
}

# -------- 可配置项（通过环境变量覆盖）--------
PROJECT_DIR="${PROJECT_DIR:-$PWD}"
DOCKERHUB_REPO="${DOCKERHUB_REPO:-ymy2345/api}"
IMAGE_TAG="${IMAGE_TAG:-latest}"
BACKEND_IMAGE="${BACKEND_IMAGE:-${DOCKERHUB_REPO}:backend-${IMAGE_TAG}}"
FRONTEND_IMAGE="${FRONTEND_IMAGE:-${DOCKERHUB_REPO}:frontend-${IMAGE_TAG}}"

BACKEND_PORT="${BACKEND_PORT:-13023}"
FRONTEND_PORT="${FRONTEND_PORT:-80}"

TUNNEL_NAME="${TUNNEL_NAME:-new-api}"
TUNNEL_UUID="${TUNNEL_UUID:-}"
DOMAIN_ROOT="${DOMAIN_ROOT:-cloudgame911.xyz}"
DOMAIN_WWW="${DOMAIN_WWW:-www.cloudgame911.xyz}"
DOMAIN_API="${DOMAIN_API:-api.cloudgame911.xyz}"

INSTALL_CLOUDFLARED="${INSTALL_CLOUDFLARED:-true}"
SETUP_TUNNEL="${SETUP_TUNNEL:-true}"
INSTALL_SYSTEMD_SERVICE="${INSTALL_SYSTEMD_SERVICE:-true}"

CLOUDFLARED_CONFIG_DIR="${CLOUDFLARED_CONFIG_DIR:-$HOME/.cloudflared}"
CLOUDFLARED_CONFIG_FILE="${CLOUDFLARED_CONFIG_FILE:-$HOME/.cloudflared/config.yml}"

# -------- 前置检查 --------
require_cmd docker
require_cmd curl

if [[ ! -f "${PROJECT_DIR}/docker-compose.oneclick.yml" ]]; then
  err "未找到 ${PROJECT_DIR}/docker-compose.oneclick.yml"
fi

if [[ ! -f "${PROJECT_DIR}/.env" ]]; then
  err "未找到 ${PROJECT_DIR}/.env（后端依赖此文件中的 SQL_DSN 等配置）"
fi

if [[ ! -f "$HOME/.docker/config.json" ]]; then
  err "未检测到 Docker 登录信息，请先执行: docker login"
fi

cd "${PROJECT_DIR}"

log "使用镜像:"
log "  BACKEND_IMAGE=${BACKEND_IMAGE}"
log "  FRONTEND_IMAGE=${FRONTEND_IMAGE}"

log "拉取并启动容器..."
BACKEND_IMAGE="${BACKEND_IMAGE}" \
FRONTEND_IMAGE="${FRONTEND_IMAGE}" \
BACKEND_PORT="${BACKEND_PORT}" \
FRONTEND_PORT="${FRONTEND_PORT}" \
docker compose -f docker-compose.oneclick.yml pull

BACKEND_IMAGE="${BACKEND_IMAGE}" \
FRONTEND_IMAGE="${FRONTEND_IMAGE}" \
BACKEND_PORT="${BACKEND_PORT}" \
FRONTEND_PORT="${FRONTEND_PORT}" \
docker compose -f docker-compose.oneclick.yml up -d --force-recreate

log "等待后端启动..."
sleep 4
docker logs --tail 60 new-api-backend || true

log "本机连通性检查..."
curl -fsS "http://127.0.0.1:${BACKEND_PORT}/api/status" >/dev/null || \
  err "后端健康检查失败：http://127.0.0.1:${BACKEND_PORT}/api/status"
curl -fsSI "http://127.0.0.1:${FRONTEND_PORT}" >/dev/null || \
  err "前端健康检查失败：http://127.0.0.1:${FRONTEND_PORT}"
log "容器服务检查通过"

# -------- Cloudflare Tunnel --------
if [[ "${SETUP_TUNNEL}" == "true" ]]; then
  if [[ "${INSTALL_CLOUDFLARED}" == "true" ]] && ! command -v cloudflared >/dev/null 2>&1; then
    log "安装 cloudflared..."
    tmp_deb="/tmp/cloudflared-linux-amd64.deb"
    curl -fL -o "${tmp_deb}" "https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb"
    sudo dpkg -i "${tmp_deb}"
    rm -f "${tmp_deb}"
  fi

  require_cmd cloudflared
  mkdir -p "${CLOUDFLARED_CONFIG_DIR}"

  if [[ -z "${TUNNEL_UUID}" ]]; then
    log "准备创建/复用 Tunnel：${TUNNEL_NAME}"
    log "若首次执行会打开浏览器登录 Cloudflare。"

    if [[ ! -f "${CLOUDFLARED_CONFIG_DIR}/cert.pem" ]]; then
      cloudflared tunnel login
    fi

    set +e
    create_out="$(cloudflared tunnel create "${TUNNEL_NAME}" 2>&1)"
    create_code=$?
    set -e

    if [[ ${create_code} -eq 0 ]]; then
      # 输出形如: Created tunnel new-api with id xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
      TUNNEL_UUID="$(echo "${create_out}" | sed -nE 's/.*with id ([0-9a-f-]{36}).*/\1/p' | head -n1)"
    else
      # 已存在时尝试从 tunnel list 里取
      TUNNEL_UUID="$(cloudflared tunnel list | awk -v name="${TUNNEL_NAME}" '$2==name {print $1; exit}')"
      [[ -n "${TUNNEL_UUID}" ]] || err "创建 Tunnel 失败，且未找到已存在 Tunnel。原始输出: ${create_out}"
    fi
  fi

  cred_file="${CLOUDFLARED_CONFIG_DIR}/${TUNNEL_UUID}.json"
  [[ -f "${cred_file}" ]] || err "未找到 Tunnel 凭据文件: ${cred_file}"

  log "配置 DNS 路由..."
  cloudflared tunnel route dns "${TUNNEL_NAME}" "${DOMAIN_ROOT}" || true
  cloudflared tunnel route dns "${TUNNEL_NAME}" "${DOMAIN_WWW}" || true
  cloudflared tunnel route dns "${TUNNEL_NAME}" "${DOMAIN_API}" || true

  log "写入 ${CLOUDFLARED_CONFIG_FILE}"
  cat > "${CLOUDFLARED_CONFIG_FILE}" <<EOF
tunnel: ${TUNNEL_UUID}
credentials-file: ${cred_file}
protocol: http2
edge-ip-version: "4"
ha-connections: 1
ingress:
  - hostname: ${DOMAIN_ROOT}
    service: http://localhost:${FRONTEND_PORT}
  - hostname: ${DOMAIN_WWW}
    service: http://localhost:${FRONTEND_PORT}
  - hostname: ${DOMAIN_API}
    service: http://localhost:${BACKEND_PORT}
  - service: http_status:404
EOF

  if [[ "${INSTALL_SYSTEMD_SERVICE}" == "true" ]]; then
    log "安装并启动 cloudflared systemd 服务..."
    sudo mkdir -p /etc/cloudflared
    sudo cp "${CLOUDFLARED_CONFIG_FILE}" /etc/cloudflared/config.yml
    sudo cp "${cred_file}" "/etc/cloudflared/${TUNNEL_UUID}.json"
    if [[ -f "${CLOUDFLARED_CONFIG_DIR}/cert.pem" ]]; then
      sudo cp "${CLOUDFLARED_CONFIG_DIR}/cert.pem" /etc/cloudflared/cert.pem
    fi

    cloudflared_bin="$(command -v cloudflared)"
    sudo tee /etc/systemd/system/cloudflared.service >/dev/null <<EOF
[Unit]
Description=cloudflared
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
ExecStart=${cloudflared_bin} --config /etc/cloudflared/config.yml tunnel run
Restart=always
RestartSec=5s

[Install]
WantedBy=multi-user.target
EOF

    sudo systemctl daemon-reload
    sudo systemctl enable --now cloudflared
    sudo systemctl --no-pager --full status cloudflared | sed -n '1,12p'
  fi
fi

log "部署完成。"
echo
echo "访问地址："
echo "  前端: https://${DOMAIN_ROOT}"
echo "  前端: https://${DOMAIN_WWW}"
echo "  后端: https://${DOMAIN_API}/api/status"
echo
echo "本机排障命令："
echo "  docker logs -f new-api-backend"
echo "  docker logs -f new-api-frontend"
echo "  curl -s http://127.0.0.1:${BACKEND_PORT}/api/status"
