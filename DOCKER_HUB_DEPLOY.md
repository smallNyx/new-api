# Docker Hub 发布与一键启动

## 1) 登录 Docker Hub

```bash
docker login
```

## 2) 构建并推送前后端镜像

```bash
chmod +x scripts/docker-build-push.sh scripts/docker-up.sh
./scripts/docker-build-push.sh <你的DockerHub用户名或组织> <tag>
```

示例：

```bash
./scripts/docker-build-push.sh nyx911 v1
```

会推送两个镜像：

- `<namespace>/new-api-backend:<tag>`
- `<namespace>/new-api-frontend:<tag>`

如果你只有一个仓库（例如 `ymy2345/api`），可用单仓库模式：

```bash
./scripts/docker-build-push.sh ymy2345/api latest --single-repo
```

会推送为：

- `ymy2345/api:backend-latest`
- `ymy2345/api:frontend-latest`

## 3) 一键启动

```bash
./scripts/docker-up.sh <你的DockerHub用户名或组织> <tag>
```

示例：

```bash
./scripts/docker-up.sh nyx911 v1
```

单仓库模式：

```bash
./scripts/docker-up.sh ymy2345/api latest --single-repo
```

默认端口：

- 前端：`80`
- 后端：`13023`

说明：

- `docker-compose.oneclick.yml` 只启动前端与后端两个容器。
- 后端配置全部来自项目根目录 `.env`（通过 `env_file: .env` 注入）。
- 请在 `.env` 中提前配置好远程数据库（例如 Supabase 的 `SQL_DSN`）。

可通过环境变量覆盖：

```bash
FRONTEND_PORT=8080 BACKEND_PORT=13023 ./scripts/docker-up.sh nyx911 v1
```

## 4) 关键文件

- `Dockerfile.backend`：后端镜像构建
- `Dockerfile.frontend`：前端镜像构建（Nginx）
- `deploy/nginx/new-api.conf`：前端容器中的反向代理配置（`/api`、`/mj`、`/pg` -> backend）
- `docker-compose.oneclick.yml`：前后端一键编排（后端读取 `.env`）

## 5) 服务器一键部署脚本（含 Cloudflare Tunnel）

```bash
chmod +x scripts/deploy-cloudflare-oneclick.sh
DOCKERHUB_REPO=ymy2345/api IMAGE_TAG=latest \
DOMAIN_ROOT=cloudgame911.xyz DOMAIN_WWW=www.cloudgame911.xyz DOMAIN_API=api.cloudgame911.xyz \
./scripts/deploy-cloudflare-oneclick.sh
```

常用可选参数：

- `BACKEND_PORT` / `FRONTEND_PORT`：后端和前端映射端口（默认 `13023` / `80`）
- `TUNNEL_NAME`：Cloudflare Tunnel 名称（默认 `new-api`）
- `SETUP_TUNNEL=false`：只部署容器，不配置 tunnel
- `INSTALL_SYSTEMD_SERVICE=false`：只写 `~/.cloudflared/config.yml`，不装系统服务
