下面给你一份可直接照做的教程：把 fafaapi 的后端 + 前端，通过 Cloudflare 暴露到公网。
1) 目标架构（推荐）
一个服务端口：127.0.0.1:13023（fafaapi）
Cloudflare Tunnel 对外提供：
https://cloudgame911.xyz
https://www.cloudgame911.xyz
https://api.cloudgame911.xyz（可选）
前端页面和 API 都走同一个后端（生产推荐）
2) 先把后端跑起来
在项目根目录 fafaapi：
# 后端端口
# .env 里确保：
# PORT=13023

# 首次需要先构建前端静态文件（给 go:embed 用）
cd /home/nyx/fafaapi/web
bun install
bun run build

# 回到根目录启动后端
cd /home/nyx/fafaapi
go run main.go
# 后端端口# .env 里确保：# PORT=13023# 首次需要先构建前端静态文件（给 go:embed 用）cd /home/nyx/fafaapi/webbun installbun run build# 回到根目录启动后端cd /home/nyx/fafaapigo run main.go
验证本地后端：
curl -i http://localhost:13023/api/status
curl -i http://localhost:13023/api/status
3) Cloudflare 域名托管确认
你已做过大部分，这里给标准检查：
whois cloudgame911.xyz
dig NS cloudgame911.xyz @8.8.8.8 +short
whois cloudgame911.xyzdig NS cloudgame911.xyz @8.8.8.8 +short
应看到 NS 是：
carmelo.ns.cloudflare.com
collins.ns.cloudflare.com
4) 配置 Tunnel（核心）
4.1 创建/绑定（已创建可跳过）
cloudflared tunnel create fafaapi
cloudflared tunnel route dns fafaapi cloudgame911.xyz
cloudflared tunnel route dns fafaapi www.cloudgame911.xyz
cloudflared tunnel route dns fafaapi api.cloudgame911.xyz
cloudflared tunnel create fafaapicloudflared tunnel route dns fafaapi cloudgame911.xyzcloudflared tunnel route dns fafaapi www.cloudgame911.xyzcloudflared tunnel route dns fafaapi api.cloudgame911.xyz
4.2 ~/.cloudflared/config.yml
用这个稳定版（你当前环境建议）：
tunnel: fafaapi
credentials-file: /home/nyx/.cloudflared/a3050022-d6ff-43dc-90de-4f39c506e331.json
protocol: http2
edge-ip-version: "4"
ha-connections: 1

ingress:
  - hostname: cloudgame911.xyz
    service: http://localhost:13023
  - hostname: www.cloudgame911.xyz
    service: http://localhost:13023
  - hostname: api.cloudgame911.xyz
    service: http://localhost:13023
  - service: http_status:404
tunnel: fafaapicredentials-file: /home/nyx/.cloudflared/a3050022-d6ff-43dc-90de-4f39c506e331.jsonprotocol: http2edge-ip-version: "4"ha-connections: 1ingress:  - hostname: cloudgame911.xyz    service: http://localhost:13023  - hostname: www.cloudgame911.xyz    service: http://localhost:13023  - hostname: api.cloudgame911.xyz    service: http://localhost:13023  - service: http_status:404
4.3 启动 Tunnel
cloudflared tunnel run fafaapi
cloudflared tunnel run fafaapi
5) 后台里必须改的参数
登录 fafaapi 后台：
控制台 -> 设置 -> 系统设置
把 ServerAddress 改成：
https://api.cloudgame911.xyz（或你想作为主入口的域名）
保存
这会影响首页“模型基址”展示、OAuth 回调提示等。
6) GitHub OAuth（前后端联动）
GitHub OAuth App 里填：
Homepage URL：https://api.cloudgame911.xyz
Authorization callback URL：https://api.cloudgame911.xyz/oauth/github
把 Client ID / Client Secret 填回后台对应项并保存。
7) 验证清单
dig CNAME api.cloudgame911.xyz @8.8.8.8 +short
curl -I https://api.cloudgame911.xyz
curl -i https://api.cloudgame911.xyz/api/status
dig CNAME api.cloudgame911.xyz @8.8.8.8 +shortcurl -I https://api.cloudgame911.xyzcurl -i https://api.cloudgame911.xyz/api/status
浏览器访问：
https://api.cloudgame911.xyz
https://cloudgame911.xyz
8) 常见报错对照
go:embed web/dist: no matching files found
→ 先 cd web && bun run build
vite proxy ECONNREFUSED 127.0.0.1:13023
→ 后端没启动或端口不一致
TLS handshake ... EOF 且 IP 是 198.18.x.x
→ 被代理/Fake-IP 劫持，建议把 cloudflared 跑在公网 Linux/Windows 主机，不要跑在被 TUN 干扰的 WSL
如果你要，我可以下一步再给你两份：
1) fafaapi 的 systemd 服务
2) cloudflared 的 systemd 服务
这样服务器重启后会自动拉起，全自动运行。