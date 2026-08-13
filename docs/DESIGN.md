# Teslacam 产品规划文档

> 版本：v0.1  
> 日期：2026-08-13  
> 状态：规划中

---

## 一、产品定位

一款本地运行的 Web 应用，帮助用户从行车记录仪（SD卡/USB）导入视频，
按时间线组织，支持多视角剪辑、拼接、导出。

**核心价值**：让行车记录仪视频的整理和分享变得简单高效。

---

## 二、目标用户

- Tesla 车主（多摄像头视频管理）
- 行车记录仪用户（70mai、VIOFO、BlackVue 等）
- 需要剪辑行车视频分享的普通用户

---

## 三、功能详细设计

### 3.1 导入管理

| 功能 | 描述 | 优先级 |
|---|---|---|
| 文件夹扫描 | 选择本地目录，递归扫描视频文件 | P0 |
| 目录解析 | 识别 Front/Rear/Side/Dash 等文件夹命名 | P0 |
| 时间轴分组 | 按年月日自动归类 | P0 |
| 元数据提取 | 从文件名/EXIF 解析时间、角度、速度 | P1 |
| 智能去重 | 相同时间戳重复文件标记 | P1 |
| 批量导入 | 一次性导入多个文件夹 | P2 |

### 3.2 视频播放

| 功能 | 描述 | 优先级 |
|---|---|---|
| 多视角同步播放 | 前/后/内/左/右五视角并排 | P0 |
| 时间轴拖拽 | 秒级精度进度控制 | P0 |
| 关键帧缩略图 | 快速定位 | P1 |
| 元数据浮窗 | 悬浮显示时间/GPS/速度 | P1 |
| 播放列表 | 同一天的视频自动串联 | P2 |

### 3.3 剪辑编辑

| 功能 | 描述 | 优先级 |
|---|---|---|
| 时间段裁剪 | 选择开始/结束时间截取片段 | P0 |
| 多镜头拼接 | 不同相机片段拼接成一条 | P0 |
| 画面调整 | 旋转90°/180°、水平翻转 | P1 |
| 变速 | 0.5x~4x 变速播放/导出 | P1 |
| 音频处理 | 静音、音量调节、背景音乐 | P2 |
| 水印/字幕 | 时间戳水印、自定义文字 | P2 |
| AI事件检测 | 自动识别急刹、碰撞等事件 | P3 |

### 3.4 导出分享

| 功能 | 描述 | 优先级 |
|---|---|---|
| 格式选择 | MP4 (H.264/H.265)、MOV | P0 |
| 分辨率 | 原画/1080p/720p | P0 |
| 批量导出 | 一次导出多个片段 | P1 |
| 导出进度 | 实时进度条+预估时间 | P0 |
| 分享链接 | 本地网络临时分享 | P2 |

---

## 四、技术架构

### 4.1 系统架构

```
┌──────────────────────────────────────────────────────┐
│                    浏览器 (React SPA)                 │
│  Import │ Timeline │ Player │ Editor │ Export         │
└─────────────────────┬────────────────────────────────┘
                      │ HTTP/WebSocket
┌─────────────────────▼────────────────────────────────┐
│              FastAPI 后端服务                         │
│  Routes  │  Services  │  SQLite DB                   │
└─────────────────────┬────────────────────────────────┘
                      │ 调用
┌─────────────────────▼────────────────────────────────┐
│                ffmpeg (视频处理引擎)                   │
│  裁剪 │ 拼接 │ 转码 │ 水印 │ 变速                     │
└──────────────────────────────────────────────────────┘
```

### 4.2 技术选型理由

| 技术 | 选型理由 |
|---|---|
| React + TypeScript | 组件化开发，类型安全，社区生态成熟 |
| Tailwind CSS | 快速迭代，响应式设计，无需写额外 CSS |
| Video.js | 多格式支持，插件丰富，多视频同步播放 |
| FastAPI | Python 异步高性能，与 ffmpeg 集成自然 |
| ffmpeg | 行业标准视频处理工具，功能全面 |
| SQLite | 轻量本地存储，无需额外数据库服务 |

---

## 五、API 设计

### 5.1 导入相关

```
GET  /api/folders/scan          # 扫描文件夹
POST /api/folders/import        # 导入视频
GET  /api/videos                # 视频列表（按日期分组）
GET  /api/videos/{id}           # 视频详情
DELETE /api/videos/{id}         # 删除视频
```

### 5.2 编辑相关

```
POST /api/edit/crop             # 裁剪时间段
POST /api/edit/merge            # 拼接视频
POST /api/edit/rotate           # 旋转画面
POST /api/edit/speed            # 变速
POST /api/edit/watermark        # 添加水印
POST /api/edit/export           # 提交导出任务
GET  /api/export/{task_id}      # 查询导出进度
GET  /api/export/{task_id}/download  # 下载导出文件
```

### 5.3 计划任务

```
GET  /api/tasks                 # 查看导出任务列表
DELETE /api/tasks/{id}          # 取消任务
```

---

## 六、数据库设计

### videos 表
```sql
CREATE TABLE videos (
    id TEXT PRIMARY KEY,
    filename TEXT NOT NULL,
    filepath TEXT NOT NULL,
    folder_name TEXT,
    camera_angle TEXT,
    duration REAL,
    file_size BIGINT,
    resolution TEXT,
    recorded_at TIMESTAMP,
    imported_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    thumbnail_path TEXT,
    metadata JSON
);
```

### export_tasks 表
```sql
CREATE TABLE export_tasks (
    id TEXT PRIMARY KEY,
    video_ids TEXT[],
    output_filename TEXT,
    format TEXT DEFAULT 'mp4',
    resolution TEXT DEFAULT 'original',
    status TEXT DEFAULT 'pending',
    progress REAL DEFAULT 0,
    output_path TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP
);
```

---

## 七、UI 设计要点

- **深色模式为主**：视频类应用适合暗色背景
- **左侧边栏导航**：导入 / 时间线 / 编辑 / 导出
- **时间线视图**：横向滚动的时间轴，类似 Premiere 的简化版
- **多屏播放**：五视角网格布局，支持同步/独立播放
- **响应式**：适配桌面端和移动端

---

## 八、部署方案

### 8.1 前端部署 — Cloudflare Pages

```
触发方式：push to main 分支自动部署
构建命令：cd frontend && npm run build
输出目录：frontend/dist
```

### 8.2 后端部署选项

| 方案 | 优点 | 缺点 |
|---|---|---|
| Fly.io | 全球边缘部署，便宜 | 需要配置 |
| Railway | 一键部署，免费额度 | 免费层有时限 |
| Cloudflare Workers | 边缘计算，超低延迟 | 需要改写成 WASM |
| 本地运行 | 无部署成本，隐私最好 | 需手动维护 |

### 8.3 建议部署路径

阶段一：本地开发运行（当前）  
阶段二：后端部署到 Railway（测试版）  
阶段三：前端 Cloudflare Pages + 后端 Railway 分离部署

---

## 九、里程碑规划

| 阶段 | 目标 | 预计工时 |
|---|---|---|
| MVP | 文件夹导入 + 视频列表 + 单视频播放 | 2周 |
| v0.2 | 多视角同步播放 + 时间段裁剪 | 1周 |
| v0.3 | 视频拼接 + 导出功能 | 1周 |
| v0.4 | 水印/字幕 + 变速 | 1周 |
| v1.0 | 完整发布 + 文档 | 1周 |

---

## 十、待确认事项

- [ ] 目标用户场景（自用 vs 对外）
- [ ] 是否打包为桌面应用（Electron/Tauri）
- [ ] 支持的具体品牌及文件命名规则
- [ ] 是否需要云同步
- [ ] 界面风格偏好
