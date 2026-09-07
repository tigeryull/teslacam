#!/bin/bash
# 一键部署脚本 - 复制到服务器执行即可
# 添加当前服务器出口 IP 到 BT 白名单并自动完成部署

# 获取本机出口 IP 并加入 BT Panel 白名单
MY_IP=$(curl -s ifconfig.me 2>/dev/null)
echo "$MY_IP" >> /www/server/panel/data/iplist.txt 2>/dev/null && chown www:www /www/server/panel/data/iplist.txt
systemctl restart bt-panel 2>/dev/null || /etc/init.d/bt restart 2>/dev/null
sleep 1

# 克隆并部署
cd /www/wwwroot && rm -rf teslacam && git clone https://github.com/tigeryull/teslacam.git
cd /www/wwwroot/teslacam/backend && python3 -m venv venv && source venv/bin/activate
pip install -q -r requirements.txt
mkdir -p uploads exports data logs
nohup uvicorn app.main:app --host 127.0.0.1 --port 8000 > logs/uvicorn.log 2>&1 &
echo "PID: $!"
echo "✅ 后端已启动，等待几秒后验证..."
sleep 3 && curl -s http://127.0.0.1:8000/api/health
