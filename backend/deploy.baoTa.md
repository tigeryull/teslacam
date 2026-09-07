# 宝塔面板部署 Teslacam 后端

## 方式一：使用 API 脚本自动部署（推荐）

### 1. 获取宝塔 API 密钥

登录宝塔面板 → **设置** → **API接口** → 复制 **接口密钥**

### 2. 在你的 Mac 上运行部署脚本

```bash
cd /Users/max/Documents/ChatGPT/teslacam

python3 backend/bt_deploy.py \
  --host https://你的服务器IP:面板端口 \
  --bt_user admin \
  --bt_sk 你的API密钥 \
  --domain teslacam.yourdomain.com \
  --repo https://github.com/tigeryull/teslacam.git
```

### 3. 按脚本提示在服务器上完成后续步骤

---

## 方式二：手动一键部署（更可靠）

### 第一步：在服务器上执行（SSH 登录）

```bash
# 1. 克隆代码
cd /www/wwwroot && git clone https://github.com/tigeryull/teslacam.git

# 2. 安装 Python 虚拟环境
cd /www/wwwroot/teslacam/backend
python3 -m venv venv
source venv/bin/activate

# 3. 安装依赖
pip install -r requirements.txt

# 4. 测试启动（按 Ctrl+C 退出）
uvicorn app.main:app --host 127.0.0.1 --port 8000
```

### 第二步：用宝塔一键部署脚本启动

```bash
# 上传部署脚本到服务器
scp backend/deploy_on_bt.sh root@你的服务器IP:/www/wwwroot/teslacam/backend/

# 在服务器上执行
cd /www/wwwroot/teslacam/backend
bash deploy_on_bt.sh
```

### 第三步：配置反向代理

进入宝塔面板 → 你的网站 → **反向代理** → **添加反向代理**

| 配置项 | 值 |
|---|---|
| 代理名称 | `teslacam-api` |
| 目标URL | `http://127.0.0.1:8000` |
| 发送目录 | `/api` |

在**自定义拦截规则**中添加：
```nginx
proxy_read_timeout 300s;
proxy_send_timeout 300s;
```

### 第四步：部署前端

```bash
# 本地构建
cd /Users/max/Documents/ChatGPT/teslacam/frontend
npm run build

# 上传到服务器（替换为你的实际路径）
scp -r dist/* root@你的服务器IP:/www/wwwroot/teslacam.yourdomain.com/
```

更新前端配置，修改 `frontend/src/utils/api.ts` 第 2 行：
```typescript
const BACKEND_URL = ''  // 前后端同域名，保持空字符串
```

然后重新构建并上传。

---

## 目录结构（服务器上）

```
/www/wwwroot/teslacam/
├── backend/
│   ├── app/                   # FastAPI 应用
│   ├── uploads/               # 上传的视频（自动创建）
│   ├── exports/               # 导出结果（自动创建）
│   ├── data/                  # SQLite 数据库（自动创建）
│   ├── logs/                  # 运行日志
│   ├── venv/                  # Python 虚拟环境
│   └── requirements.txt
├── frontend/
│   └── dist/                  # 构建产物
└── deploy_on_bt.sh           # 一键启动脚本
```

---

## 常用运维命令

```bash
# 查看后端状态
cat /www/wwwroot/teslacam/backend/run.pid && ps aux | grep uvicorn

# 重启后端
cd /www/wwwroot/teslacam/backend && bash deploy_on_bt.sh

# 查看日志
tail -f /www/wwwroot/teslacam/backend/logs/uvicorn.log

# 停止后端
kill $(cat /www/wwwroot/teslacam/backend/run.pid)

# 检查 ffmpeg
which ffmpeg && ffmpeg -version
```

---

## 常见问题

### 1. ffmpeg 未安装
```bash
# 宝塔软件商店搜索 ffmpeg 安装
# 或命令行
apt-get update && apt-get install -y ffmpeg
```

### 2. 端口被占用
```bash
lsof -i :8000
kill -9 <PID>
```

### 3. 视频处理超时
反向代理配置中已添加 `proxy_read_timeout 300s`，确保大文件能处理完。

### 4. 数据库备份
```bash
cp /www/wwwroot/teslacam/backend/data/teslacam.db ~/backup/teslacam-$(date +%Y%m%d).db
```
