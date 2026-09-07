#!/bin/bash
# BT Panel API 修复 + Teslacam 一键部署脚本
# 在服务器上执行此脚本即可

set -e

echo "═══════════════════════════════════════════"
echo "  Teslacam 宝塔面板一键部署"
echo "═══════════════════════════════════════════"

# ── 1. 检查并修复 BT API 访问 ──────────────────────────
echo ""
echo "[1/6] 检查宝塔面板 API 配置..."

BT_PORT=$(cat /www/server/panel/data/port.pl 2>/dev/null || echo "888")
BT_API_SK=$(cat /www/server/panel/data/api.json 2>/dev/null | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('bt_key',''))" 2>/dev/null || echo "")

if [ -z "$BT_API_SK" ]; then
    echo "⚠️  未找到 API 密钥，请确认宝塔面板已启用 API 接口"
    echo "   操作：宝塔面板 → 设置 → API接口 → 开启并复制密钥"
else
    echo "✅ API 密钥已找到"
fi

# 检查当前出口 IP 并添加到白名单
MY_IP=$(curl -s ifconfig.me 2>/dev/null || curl -s icanhazip.com 2>/dev/null)
echo "📍 当前服务器出口 IP: $MY_IP"

# 检查 IP 是否已在白名单
WHITELIST_FILE="/www/server/panel/data/iplist.txt"
if [ -f "$WHITELIST_FILE" ]; then
    if grep -q "$MY_IP" "$WHITELIST_FILE"; then
        echo "✅ IP 已在白名单中"
    else
        echo "→ 正在添加 IP 到白名单..."
        echo "$MY_IP" >> "$WHITELIST_FILE"
        echo "✅ IP 已添加"
    fi
else
    echo "⚠️  未找到白名单文件，尝试创建..."
    echo "$MY_IP" > /www/server/panel/data/iplist.txt
    chown www:www /www/server/panel/data/iplist.txt
    chmod 644 /www/server/panel/data/iplist.txt
fi

# 重启宝塔面板服务使配置生效
echo "→ 重启宝塔面板服务..."
systemctl restart bt-panel 2>/dev/null || /etc/init.d/bt restart 2>/dev/null || echo "（尝试手动重启）"
sleep 2

# ── 2. 克隆代码仓库 ──────────────────────────────────────
echo ""
echo "[2/6] 克隆代码仓库..."
cd /www/wwwroot
if [ -d "teslacam" ]; then
    echo "✅ 仓库已存在，更新代码..."
    cd teslacam && git pull
else
    git clone https://github.com/tigeryull/teslacam.git
    cd teslacam
fi

# ── 3. 安装 Python 依赖 ──────────────────────────────────
echo ""
echo "[3/6] 安装 Python 依赖..."
cd backend
if [ ! -d "venv" ]; then
    echo "→ 创建 Python 虚拟环境..."
    python3 -m venv venv
fi
source venv/bin/activate
pip install -q -r requirements.txt
echo "✅ 依赖安装完成"

# ── 4. 创建必要目录 ──────────────────────────────────────
echo ""
echo "[4/6] 创建数据目录..."
mkdir -p uploads exports data logs
chmod 755 uploads exports data logs
echo "✅ 目录创建完成"

# ── 5. 启动后端服务 ──────────────────────────────────────
echo ""
echo "[5/6] 启动后端服务..."
if [ -f "run.pid" ] && kill -0 $(cat run.pid) 2>/dev/null; then
    echo "→ 停止旧进程..."
    kill $(cat run.pid) 2>/dev/null || true
    sleep 2
fi

nohup uvicorn app.main:app --host 127.0.0.1 --port 8000 \
    --log-level info \
    > logs/uvicorn.log 2>&1 &
echo $! > run.pid
echo "✅ 后端已启动 (PID: $(cat run.pid))"

sleep 2

# 验证后端是否正常
if curl -s http://127.0.0.1:8000/api/health | grep -q ok; then
    echo "✅ 后端健康检查通过"
else
    echo "⚠️  后端启动成功但健康检查未通过，请查看日志: tail -f logs/uvicorn.log"
fi

# ── 6. 配置反向代理 ──────────────────────────────────────
echo ""
echo "[6/6] 配置 Nginx 反向代理..."

# 查找网站配置文件
SITE_CONF=$(find /www/server/panel/vhost/nginx -name "*.conf" -type f 2>/dev/null | head -1)
if [ -z "$SITE_CONF" ]; then
    SITE_CONF="/www/server/panel/vhost/nginx/default.conf"
fi

if [ ! -f "$SITE_CONF" ]; then
    echo "⚠️  未找到 Nginx 配置文件，需要手动配置反向代理"
    echo "   请将以下内容添加到你的网站 Nginx 配置中："
    echo ""
    echo "   location /api/ {"
    echo "       proxy_pass http://127.0.0.1:8000;"
    echo "       proxy_set_header Host \$host;"
    echo "       proxy_set_header X-Real-IP \$remote_addr;"
    echo "       proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;"
    echo "       proxy_read_timeout 300s;"
    echo "       proxy_send_timeout 300s;"
    echo "   }"
else
    # 检查是否已有反向代理配置
    if grep -q "teslacam-api" "$SITE_CONF" 2>/dev/null; then
        echo "✅ 反向代理已配置"
    else
        echo "→ 正在添加反向代理配置..."
        # 备份原配置
        cp "$SITE_CONF" "${SITE_CONF}.bak"
        # 添加反向代理规则
        cat >> "$SITE_CONF" << 'NGINX'

# Teslacam API 反向代理
location /api/ {
    proxy_pass http://127.0.0.1:8000;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_read_timeout 300s;
    proxy_send_timeout 300s;
}
NGINX
        # 测试并重载 Nginx
        nginx -t 2>&1 && nginx -s reload
        echo "✅ 反向代理配置完成"
    fi
fi

# ── 完成 ────────────────────────────────────────────────
echo ""
echo "═══════════════════════════════════════════"
echo "  ✅ 部署完成！"
echo "═══════════════════════════════════════════"
echo ""
echo "  后端地址: http://127.0.0.1:8000"
echo "  日志位置: /www/wwwroot/teslacam/backend/logs/uvicorn.log"
echo "  数据库:   /www/wwwroot/teslacam/backend/data/teslacam.db"
echo ""
echo "  下一步：部署前端"
echo "  1. 本地执行: cd frontend && npm run build"
echo "  2. 上传 dist/ 到你的网站根目录"
echo "  3. 修改 frontend/src/utils/api.ts 第2行:"
echo "     const BACKEND_URL = ''  (前后端同域名)"
echo ""
