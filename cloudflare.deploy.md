# Cloudflare Pages 部署指南

## ✅ 当前部署状态

**生产环境已部署**: https://teslacam-f2n.pages.dev

---

## 手动重新部署

```bash
cd teslacam
wrangler pages deploy frontend/dist --project-name teslacam
```

---

## 配置 GitHub 自动部署

1. 登录 [Cloudflare Dashboard](https://dash.cloudflare.com)
2. 进入 **Workers & Pages** → **teslacam** → **Settings**
3. 找到 **Builds & Deployments** 部分
4. 点击 **Connect to Git**
5. 授权 GitHub，选择 `tigeryull/teslacam` 仓库
6. 配置：
   - **Production branch**: `main`
   - **Build command**: `cd frontend && npm run build`
   - **Build output directory**: `frontend/dist`
7. 点击 **Save and Deploy**

之后每次 push 到 main 分支会自动触发部署。

---

## 自定义域名

如需绑定自己的域名：

1. 进入 **teslacam** → **Triggers** → **Custom Domains**
2. 添加你的域名
3. 在域名 DNS 提供商处添加 CNAME 记录：
   ```
   CNAME → teslacam-f2n.pages.dev
   ```
