# Teslacam 部署到宝塔面板

## 快速部署（通过 BT Panel API 已准备好，只需执行以下命令）

在服务器上执行（通过 VNC 或 SSH）：

```bash
# 1. 执行一键部署
bash /www/wwwroot/deploy_teslacam.sh

# 2. 将 Nginx 配置包含到网站配置中
# 编辑你的网站 Nginx 配置，添加:
# include /www/server/panel/vhost/nginx/teslacam_api.conf;
# 或者手动添加反向代理规则

# 3. 重载 Nginx
nginx -t && nginx -s reload

# 4. 部署前端（构建后上传 dist/ 到网站根目录）
# 或者通过宝塔面板的网站设置直接上传
```

## 通过 BT MCP API 完成的操作
- ✅ 已创建部署脚本: /www/wwwroot/deploy_teslacam.sh
- ✅ 已创建 Nginx 配置: /www/server/panel/vhost/nginx/teslacam_api.conf
- ⏳ 待执行: bash /www/wwwroot/deploy_teslacam.sh
- ⏳ 待配置: Nginx 反向代理
