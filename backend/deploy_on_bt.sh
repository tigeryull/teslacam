#!/bin/bash
# 宝塔面板一键部署 Teslacam 后端
# 使用方法：bash deploy_on_bt.sh
# 前提：已在服务器上 git clone 并 pip install 完成

set -e

APP_DIR="/www/wwwroot/teslacam/backend"
LOG_DIR="$APP_DIR/logs"
PID_FILE="$APP_DIR/run.pid"

echo "═══════════════════════════════════════"
echo "  Teslacam 宝塔面板部署脚本"
echo "═══════════════════════════════════════"

# 检查 Python 环境
if [ ! -f "$APP_DIR/venv/bin/activate" ]; then
    echo "❌ 虚拟环境不存在，请先执行："
    echo "   cd $APP_DIR && python3 -m venv venv && source venv/bin/activate && pip install -r requirements.txt"
    exit 1
fi

# 检查 ffmpeg
if ! command -v ffmpeg &>/dev/null; then
    echo "⚠️  ffmpeg 未安装，请通过宝塔面板软件商店安装 ffmpeg"
fi

# 创建日志目录
mkdir -p "$LOG_DIR"

# 检查是否已在运行
if [ -f "$PID_FILE" ] && kill -0 "$(cat $PID_FILE)" 2>/dev/null; then
    echo "✅ 后端已在运行 (PID: $(cat $PID_FILE))"
    echo "   重启中..."
    kill "$(cat $PID_FILE)" 2>/dev/null || true
    sleep 2
fi

# 启动后端
echo "🚀 启动 Teslacam 后端..."
cd "$APP_DIR"
source venv/bin/activate
nohup uvicorn app.main:app --host 127.0.0.1 --port 8000 \
    --log-level info \
    > "$LOG_DIR/uvicorn.log" 2>&1 &
echo $! > "$PID_FILE"

sleep 2

# 验证
if kill -0 "$(cat $PID_FILE)" 2>/dev/null; then
    echo "✅ 后端启动成功！PID: $(cat $PID_FILE)"
    echo "   健康检查: curl http://127.0.0.1:8000/api/health"
else
    echo "❌ 启动失败，查看日志: tail -f $LOG_DIR/uvicorn.log"
    exit 1
fi

echo ""
echo "═══════════════════════════════════════"
echo "  下一步：配置反向代理"
echo "═══════════════════════════════════════"
echo ""
echo "在宝塔面板中操作："
echo "  1. 进入你的网站设置 → 反向代理"
echo "  2. 添加反向代理："
echo "     代理名称: teslacam-api"
echo "     目标URL: http://127.0.0.1:8000"
echo "     发送目录: /api"
echo ""
echo "3. 如果是新域名，还需要配置 Nginx 自定义规则："
echo "   location /api/ {"
echo "       proxy_pass http://127.0.0.1:8000;"
echo "       proxy_set_header Host \$host;"
echo "       proxy_read_timeout 300s;"
echo "       proxy_send_timeout 300s;"
echo "   }"
echo ""
echo "4. 部署前端：将 frontend/dist/ 上传到网站根目录"
