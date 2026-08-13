# Cloudflare Pages 部署指南

## 方案一：手动连接（推荐，最简单）

1. 登录 [Cloudflare Dashboard](https://dash.cloudflare.com)
2. 进入 **Workers & Pages** → **Create application** → **Pages**
3. 选择 **Connect to Git**
4. 授权访问 GitHub，选择 `tigeryull/teslacam` 仓库
5. 配置构建设置：
   - **Project name**: `teslacam`
   - **Production branch**: `main`
   - **Build command**: `cd frontend && npm run build`
   - **Build output directory**: `frontend/dist`
   - **Root directory**: （留空）
6. 点击 **Save and Deploy**

部署完成后，访问 `https://teslacam.pages.dev`

---

## 方案二：GitHub Actions 自动部署

1. 获取 Cloudflare API Token：
   - 登录 Cloudflare Dashboard
   - **My Profile** → **API Tokens** → **Create Token**
   - 使用 **Edit Cloudflare Pages** 模板，选择对应账户/项目
   - 复制生成的 Token

2. 获取 Account ID：
   - Cloudflare Dashboard 右下角可查看 Account ID

3. 在 GitHub 仓库设置中添加 Secret：
   - `tigeryull/teslacam` → **Settings** → **Secrets and variables** → **Actions**
   - 添加：
     - `CLOUDFLARE_API_TOKEN` = 你的 API Token
     - `CLOUDFLARE_ACCOUNT_ID` = 你的 Account ID

4. 推送代码后会自动触发部署

---

## 后端部署（Fly.io）

后端使用 FastAPI，建议部署到 Fly.io：

```bash
# 安装 flyctl
brew install flyctl

# 登录
fly auth login

# 初始化（在 backend 目录下）
fly launch --no-deploy

# 部署
fly deploy
```

或者直接使用 Railway / Render 等更简单的平台。
