# 🚗 Teslacam — 车载记录仪视频管理 & 编辑系统

本地运行的 Web 应用，从行车记录仪导入视频，按时间线组织，支持多视角剪辑、拼接、导出。

## 功能模块

### 1️⃣ 导入管理
- SD卡/USB 文件夹扫描，递归识别 MP4/MOV
- Tesla 风格目录自动解析（Dashboard/Front/Rear/Sentry）
- 按日期自动分组（年-月-日视图）
- 元数据提取：录制时间、相机角度、速度、GPS
- 智能去重

### 2️⃣ 视频播放
- 多摄像头同步播放（前/后/内/左/右五视角）
- 时间轴精确拖拽（到秒级）
- 关键帧缩略图快速定位
- 元数据浮窗（时间/GPS/速度）

### 3️⃣ 剪辑编辑
- 时间段裁剪（开始/结束点选择）
- 多镜头拼接
- 画面调整：旋转、水平翻转
- 变速播放/导出（0.5x ~ 4x）
- 音频处理：静音、音量调节、背景音乐
- 时间戳水印 / 自定义字幕

### 4️⃣ 导出分享
- 格式：MP4 (H.264/H.265)、MOV
- 分辨率：原画 / 1080p / 720p
- 批量导出
- 实时进度条 + 预估时间
- 本地网络分享链接

## 技术栈

| 层 | 技术 |
|---|---|
| 前端 | React + TypeScript + Tailwind CSS |
| 视频播放 | Video.js |
| 后端 | Python FastAPI |
| 视频处理 | ffmpeg |
| 数据库 | SQLite |
| 部署 | Cloudflare Pages (前端) + Fly.io / Railway (后端) |

## 快速开始

```bash
# 安装依赖
pip install -r backend/requirements.txt
cd frontend && npm install

# 启动后端
cd backend && uvicorn app.main:app --reload

# 启动前端
cd frontend && npm run dev
```

访问 http://localhost:8000

## 项目结构

```
teslacam/
├── backend/
│   ├── app/
│   │   ├── main.py
│   │   ├── routes/       # API 路由
│   │   ├── services/     # ffmpeg、扫描、导出服务
│   │   └── models/       # 数据模型
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── pages/        # 页面组件
│   │   ├── components/   # 通用组件
│   │   └── types/        # TypeScript 类型
│   └── package.json
├── uploads/              # 原始视频存放
├── exports/              # 导出结果
├── data/                 # SQLite 数据库
└── docs/                 # 设计文档
```

## 部署

- **前端**：Cloudflare Pages（自动 CI/CD）
- **后端**：Fly.io / Railway / Cloudflare Workers
- **数据库**：SQLite 文件存储（本地）或 Neon（云端）

## 支持的品牌

Tesla、70mai、VIOFO、BlackVue、MiDash、Thinkware 等（通过文件夹命名规则适配）
