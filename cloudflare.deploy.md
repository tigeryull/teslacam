# Teslacam 部署指南

## 项目地址
- GitHub: https://github.com/tigeryull/teslacam
- 前端: https://teslacam-f2n.pages.dev

---

## 后端部署方案对比

| 方案 | 免费额度 | 难度 | 适合场景 |
|---|---|---|---|
| **Railway** | $5/月额度 | ⭐ 最简单 | 快速上线，零配置 |
| **Render** | 免费（15分钟休眠） | ⭐⭐ 简单 | 低频使用，个人项目 |
| **Fly.io** | $5/月额度（按用量） | ⭐⭐ 中等 | 需要全局边缘部署 |
| **本地运行** | 免费 | ⭐ 最简单 | 自用开发测试 |

---

## 方案一：Railway（推荐）

### 步骤

1. **安装 Railway CLI**
   ```bash
   npm install -g @railway/cli
   # 或
   brew install railway
   ```

2. **登录并初始化**
   ```bash
   cd /Users/max/Documents/ChatGPT/teslacam
   railway login
   railway init -n teslacam-backend
   ```

3. **连接 GitHub 仓库（可选）**
   ```bash
   railway link
   # 选择 GitHub 仓库 tigeryull/teslacam
   ```

4. **部署**
   ```bash
   railway up
   ```

5. **获取后端 URL**
   ```bash
   railway link
   railway vars  # 查看服务信息
   ```

6. **配置前端连接后端**
   修改 `frontend/src/utils/api.ts` 第 2 行：
   ```typescript
   const BACKEND_URL = 'https://teslacam-backend-xxx.railway.app'
   ```
   重新构建并部署前端到 Cloudflare。

---

## 方案二：Render

### 步骤

1. 登录 https://render.com
2. 点击 **New +** → **Public Website**
3. 连接 GitHub 仓库 `tigeryull/teslacam`
4. 配置：
   - **Name**: `teslacam-backend`
   - **Root Directory**: `backend`
   - **Runtime**: `Python 3`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
5. 点击 **Create Web Service**

> 注意：Render 免费版服务会在 15 分钟无请求后休眠，首次访问需要等待约 30 秒冷启动。

---

## 方案三：Fly.io

### 步骤

1. **安装 flyctl**
   ```bash
   brew install flyctl
   fly auth login
   ```

2. **部署**
   ```bash
   cd /Users/max/Documents/ChatGPT/teslacam
   fly launch --no-deploy
   # 编辑 fly.toml，将 app name 改为 teslacam-backend
   fly deploy
   ```

3. **查看 URL**
   ```bash
   fly apps open
   ```

---

## 本地开发运行

```bash
# 终端 1：启动后端
cd /Users/max/Documents/ChatGPT/teslacam/backend
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000

# 终端 2：启动前端
cd /Users/max/Documents/ChatGPT/teslacam/frontend
npm install
npm run dev
# 访问 http://localhost:3000
```

前端会自动代理 `/api` 请求到后端（vite.config.ts 配置了 proxy）。

---

## 目录结构

```
teslacam/
├── backend/
│   ├── app/              # FastAPI 应用
│   │   ├── main.py       # 入口
│   │   ├── routes/       # API 路由
│   │   ├── services/     # ffmpeg、扫描、导出服务
│   │   └── models/       # 数据模型
│   ├── requirements.txt
│   ├── Dockerfile        # Docker 构建文件
│   ├── fly.toml          # Fly.io 配置
│   ├── railway.toml      # Railway 配置
│   └── render.yaml       # Render 配置
├── frontend/
│   ├── src/
│   │   ├── pages/        # 页面组件
│   │   └── utils/api.ts  # API 调用（配置后端地址）
│   └── package.json
├── .github/workflows/    # GitHub Actions
└── docs/DESIGN.md        # 产品设计文档
```
