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
  BACKEND_IMAGE="${TARGET}:backend-${TAG}"
  FRONTEND_IMAGE="${TARGET}:frontend-${TAG}"
else
  BACKEND_IMAGE="${TARGET}/new-api-backend:${TAG}"
  FRONTEND_IMAGE="${TARGET}/new-api-frontend:${TAG}"
fi

echo "==> 构建后端镜像: ${BACKEND_IMAGE}"
docker build -f Dockerfile.backend -t "${BACKEND_IMAGE}" .

echo "==> 构建前端镜像: ${FRONTEND_IMAGE}"
docker build -f Dockerfile.frontend -t "${FRONTEND_IMAGE}" .
docker build -f Dockerfile.frontend -t ymy2345/api_web:0.1.1  .
echo "==> 推送后端镜像"
docker push "${BACKEND_IMAGE}"

echo "==> 推送前端镜像"
docker push "${FRONTEND_IMAGE}"

echo
echo "完成。可通过以下方式一键启动："
echo "BACKEND_IMAGE=${BACKEND_IMAGE} FRONTEND_IMAGE=${FRONTEND_IMAGE} docker compose -f docker-compose.oneclick.yml up -d"
