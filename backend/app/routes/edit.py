from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
import asyncio
import hashlib
from pathlib import Path

router = APIRouter(prefix="/api/edit", tags=["剪辑编辑"])


class CropRequest(BaseModel):
    video_id: str
    start_time: float
    end_time: float
    output_filename: Optional[str] = None


class MergeRequest(BaseModel):
    video_ids: list[str]
    output_filename: Optional[str] = None


class RotateRequest(BaseModel):
    video_id: str
    degrees: int  # 90, 180, 270
    output_filename: Optional[str] = None


class ExportRequest(BaseModel):
    video_id: str
    format: str = "mp4"
    resolution: str = "original"  # original, 1080p, 720p
    output_filename: Optional[str] = None


@router.post("/crop")
async def crop_video(req: CropRequest):
    """裁剪视频时间段"""
    from ..services.ffmpeg import crop_video
    db_path = Path(__file__).parent.parent.parent.parent / "data" / "teslacam.db"
    import sqlite3
    conn = sqlite3.connect(db_path)
    row = conn.execute("SELECT filepath FROM videos WHERE id = ?", (req.video_id,)).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Video not found")
    
    output_dir = Path(__file__).parent.parent.parent.parent / "exports"
    output_dir.mkdir(parents=True, exist_ok=True)
    output_path = output_dir / (req.output_filename or f"crop_{hashlib.md5(req.video_id.encode()).hexdigest()[:8]}.mp4")
    
    success = await crop_video(row["filepath"], str(output_path), req.start_time, req.end_time)
    return {"success": success, "output_path": str(output_path)}


@router.post("/merge")
async def merge_videos(req: MergeRequest):
    """拼接多个视频"""
    from ..services.ffmpeg import merge_videos
    db_path = Path(__file__).parent.parent.parent.parent / "data" / "teslacam.db"
    import sqlite3
    conn = sqlite3.connect(db_path)
    placeholders = ",".join("?" * len(req.video_ids))
    rows = conn.execute(f"SELECT filepath FROM videos WHERE id IN ({placeholders})", req.video_ids).fetchall()
    if len(rows) != len(req.video_ids):
        raise HTTPException(status_code=404, detail="One or more videos not found")
    
    output_dir = Path(__file__).parent.parent.parent.parent / "exports"
    output_dir.mkdir(parents=True, exist_ok=True)
    output_path = output_dir / (req.output_filename or f"merge_{hashlib.md5(','.join(req.video_ids).encode()).hexdigest()[:8]}.mp4")
    
    success = await merge_videos([r["filepath"] for r in rows], str(output_path))
    return {"success": success, "output_path": str(output_path)}


@router.post("/rotate")
async def rotate_video(req: RotateRequest):
    """旋转视频"""
    from ..services.ffmpeg import rotate_video
    db_path = Path(__file__).parent.parent.parent.parent / "data" / "teslacam.db"
    import sqlite3
    conn = sqlite3.connect(db_path)
    row = conn.execute("SELECT filepath FROM videos WHERE id = ?", (req.video_id,)).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Video not found")
    
    output_dir = Path(__file__).parent.parent.parent.parent / "exports"
    output_dir.mkdir(parents=True, exist_ok=True)
    output_path = output_dir / (req.output_filename or f"rotate_{req.degrees}_{hashlib.md5(req.video_id.encode()).hexdigest()[:8]}.mp4")
    
    success = await rotate_video(row["filepath"], str(output_path), req.degrees)
    return {"success": success, "output_path": str(output_path)}


@router.post("/export")
async def export_video(req: ExportRequest):
    """提交导出任务"""
    import sqlite3
    import json
    from datetime import datetime
    from pathlib import Path
    
    db_path = Path(__file__).parent.parent.parent.parent / "data" / "teslacam.db"
    conn = sqlite3.connect(db_path)
    row = conn.execute("SELECT filepath FROM videos WHERE id = ?", (req.video_id,)).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Video not found")
    
    # 创建导出任务记录
    task_id = hashlib.md5(f"{req.video_id}_{datetime.now().isoformat()}".encode()).hexdigest()[:16]
    conn.execute(
        "INSERT INTO export_tasks (id, video_id, format, resolution, status, progress, output_filename, created_at) VALUES (?, ?, ?, ?, 'pending', 0, ?, ?)",
        (task_id, req.video_id, req.format, req.resolution, req.output_filename, datetime.now().isoformat())
    )
    conn.commit()
    conn.close()
    
    return {"task_id": task_id, "status": "pending"}


@router.get("/tasks/{task_id}")
async def get_export_task(task_id: str):
    """查询导出任务进度"""
    import sqlite3
    from pathlib import Path
    db_path = Path(__file__).parent.parent.parent.parent / "data" / "teslacam.db"
    conn = sqlite3.connect(db_path)
    row = conn.execute("SELECT * FROM export_tasks WHERE id = ?", (task_id,)).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Task not found")
    return dict(row)
