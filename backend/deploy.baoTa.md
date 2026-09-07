# 宝塔面板部署 Teslacam 后端

## 前置条件
- 服务器已安装宝塔面板
- Python 3.8+ 环境（宝塔软件商店可一键安装）
- ffmpeg 已安装（宝塔软件商店 → 搜索 ffmpeg → 安装）

---

## 步骤一：上传代码到服务器

### 方式 A：Git 拉取（推荐）
```bash
# 登录服务器后执行
cd /www/wwwroot
git clone https://github.com/tigeryull/teslacam.git
cd teslacam
```

### 方式 B：SCP 上传
```bash
# 在你的 Mac 上执行
scp -r backend/ root@你的服务器IP:/www/wwwroot/teslacam/
```

---

## 步骤二：安装依赖

```bash
cd /www/wwwroot/teslacam/backend

# 创建虚拟环境
python3 -m venv venv
source venv/bin/activate

# 安装依赖
pip install -r requirements.txt

# 测试启动
uvicorn app.main:app --host 127.0.0.1 --port 8000
```

如果能正常启动，Ctrl+C 退出，继续下一步。

---

## 步骤三：用 Supervisor 守护进程（宝塔方式）

### 宝塔面板操作：
1. 进入 **宝塔面板** → **软件商店** → 搜索 **Supervisor** → 安装
2. 安装完成后，点击 **进程守护** → **添加守护进程**

配置如下：
```
名称：teslacam-backend
启动用户：www
启动命令：/www/wwwroot/teslacam/backend/venv/bin/uvicorn
运行目录：/www/wwwroot/teslacam/backend
进程数量：1
日志文件：/www/wwwroot/teslacam/backend/logs/uvicorn.log
```

---

## 步骤四：配置 Nginx 反向代理

### 宝塔面板操作：
1. 进入 **网站** → **添加站点**（如果没有域名的话可以用 IP）
2. 进入该网站的 **反向代理** → **添加反向代理**

配置如下：
```
代理名称：teslacam-api
目标URL：http://127.0.0.1:8000
```

然后在 **自定义拦截规则** 中粘贴：
```nginx
location /api/ {
    proxy_pass http://127.0.0.1:8000;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_read_timeout 300s;  # 视频处理需要较长时间
    proxy_send_timeout 300s;
}
```

> 如果你已经有一个网站放了前端，把上面的 `/api/` 作为子路径配在同一个网站的 Nginx 里即可。

---

## 步骤五：配置前端连接后端

修改 `frontend/src/utils/api.ts` 第 2 行：

```typescript
const BACKEND_URL = 'https://你的域名'
// 或者
const BACKEND_URL = ''  // 如果前后端同域名
```

然后重新构建并部署前端：
```bash
cd frontend
npm run build
# 上传 dist/ 到宝塔的网站根目录
```

---

## 目录结构（服务器上）

```
/www/wwwroot/teslacam/
├── backend/
│   ├── app/               # Python 应用代码
│   ├── uploads/           # 上传的视频文件（自动创建）
│   ├── exports/           # 导出结果（自动创建）
│   ├── data/              # SQLite 数据库（自动创建）
│   ├── logs/              # 运行日志
│   ├── venv/              # Python 虚拟环境
│   └── requirements.txt
├── frontend/
│   └── dist/              # 构建产物（部署到网站根目录）
└── README.md
```

---

## 常见问题

### 1. ffmpeg 找不到
```bash
# 确认安装
which ffmpeg
ffmpeg -version

# 如果没安装，宝塔软件商店搜 ffmpeg 安装
```

### 2. 端口被占用
```bash
# 查看占用 8000 端口的进程
lsof -i :8000
# 杀掉旧进程
kill -9 <PID>
```

### 3. 视频处理超时
在 Nginx 配置里加了 `proxy_read_timeout 300s`，确保大视频能处理完。

### 4. 数据库位置
SQLite 数据库默认在 `/www/wwwroot/teslacam/backend/data/teslacam.db`，定期备份即可。
