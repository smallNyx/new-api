#!/usr/bin/env bash
set -euo pipefail

if [[ $# -lt 1 ]]; then
  echo "用法1: $0 <dockerhub_namespace> [tag]"
  echo "示例1: $0 myname latest"
  echo "用法2: $0 <dockerhub_repo> [tag] --single-repo"
  echo "示例2: $0 myname/api latest --single-repo"
  exit 1
fi

TARGET="$1"
TAG="${2:-latest}"
MODE="${3:-namespace}"

if [[ "${MODE}" == "--single-repo" ]]; then
  export BACKEND_IMAGE="${TARGET}:backend-${TAG}"
  export FRONTEND_IMAGE="${TARGET}:frontend-${TAG}"
else
  export BACKEND_IMAGE="${TARGET}/new-api-backend:${TAG}"
  export FRONTEND_IMAGE="${TARGET}/new-api-frontend:${TAG}"
fi

echo "==> 拉取镜像"
docker compose -f docker-compose.oneclick.yml pull

echo "==> 一键启动"
docker compose -f docker-compose.oneclick.yml up -d

echo
echo "服务已启动："
echo "- 前端: http://localhost:${FRONTEND_PORT:-80}"
echo "- 后端: http://localhost:${BACKEND_PORT:-13023}"
