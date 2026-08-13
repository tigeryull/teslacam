from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from pydantic import BaseModel
from typing import Optional
import asyncio
import hashlib
import json
from pathlib import Path

router = APIRouter(prefix="/api/edit", tags=["剪辑编辑"])


def _get_db():
    import sqlite3
    db_path = Path(__file__).parent.parent.parent.parent / "data" / "teslacam.db"
    db_path.parent.mkdir(parents=True, exist_ok=True)
    return sqlite3.connect(db_path)


def _get_output_dir():
    return Path(__file__).parent.parent.parent.parent / "exports"


class CropRequest(BaseModel):
    video_id: str
    start_time: float
    end_time: float
    output_filename: Optional[str] = None
    watermark_text: Optional[str] = None
    watermark_font_size: int = 24
    watermark_position: str = "bottom-right"
    watermark_font_color: str = "white"


class MergeRequest(BaseModel):
    video_ids: list[str]
    output_filename: Optional[str] = None


class RotateRequest(BaseModel):
    video_id: str
    degrees: int
    output_filename: Optional[str] = None


class ExportRequest(BaseModel):
    video_id: str
    format: str = "mp4"
    resolution: str = "original"
    output_filename: Optional[str] = None
    watermark_text: Optional[str] = None
    watermark_font_size: int = 24
    watermark_position: str = "bottom-right"
    watermark_font_color: str = "white"


@router.post("/crop")
async def crop_video(req: CropRequest):
    """裁剪视频时间段（可选加水印）"""
    from ..services.ffmpeg import crop_with_watermark, crop_video
    conn = _get_db()
    row = conn.execute("SELECT filepath FROM videos WHERE id = ?", (req.video_id,)).fetchone()
    if not row:
        conn.close()
        raise HTTPException(status_code=404, detail="Video not found")

    output_dir = _get_output_dir()
    output_dir.mkdir(parents=True, exist_ok=True)
    out_name = req.output_filename or f"crop_{hashlib.md5(req.video_id.encode()).hexdigest()[:8]}.mp4"
    output_path = output_dir / out_name

    kwargs = dict(
        input_path=row["filepath"],
        output_path=str(output_path),
        start_time=req.start_time,
        end_time=req.end_time,
    )
    if req.watermark_text:
        kwargs.update(dict(
            text=req.watermark_text,
            font_size=req.watermark_font_size,
            position=req.watermark_position,
            font_color=req.watermark_font_color,
        ))
        success = await crop_with_watermark(**kwargs)
    else:
        success = await crop_video(**kwargs)

    conn.close()
    return {"success": success, "output_path": str(output_path)}


@router.post("/merge")
async def merge_videos(req: MergeRequest):
    """拼接多个视频"""
    from ..services.ffmpeg import merge_videos
    conn = _get_db()
    placeholders = ",".join("?" * len(req.video_ids))
    rows = conn.execute(f"SELECT filepath FROM videos WHERE id IN ({placeholders})", req.video_ids).fetchall()
    conn.close()
    if len(rows) != len(req.video_ids):
        raise HTTPException(status_code=404, detail="One or more videos not found")

    output_dir = _get_output_dir()
    output_dir.mkdir(parents=True, exist_ok=True)
    output_path = output_dir / (req.output_filename or f"merge_{hashlib.md5(','.join(req.video_ids).encode()).hexdigest()[:8]}.mp4")

    success = await merge_videos([r["filepath"] for r in rows], str(output_path))
    return {"success": success, "output_path": str(output_path)}


@router.post("/rotate")
async def rotate_video(req: RotateRequest):
    """旋转视频"""
    from ..services.ffmpeg import rotate_video
    conn = _get_db()
    row = conn.execute("SELECT filepath FROM videos WHERE id = ?", (req.video_id,)).fetchone()
    conn.close()
    if not row:
        raise HTTPException(status_code=404, detail="Video not found")

    output_dir = _get_output_dir()
    output_dir.mkdir(parents=True, exist_ok=True)
    output_path = output_dir / (req.output_filename or f"rotate_{req.degrees}_{hashlib.md5(req.video_id.encode()).hexdigest()[:8]}.mp4")

    success = await rotate_video(row["filepath"], str(output_path), req.degrees)
    return {"success": success, "output_path": str(output_path)}


@router.post("/export")
async def export_video(req: ExportRequest):
    """提交导出任务"""
    conn = _get_db()
    row = conn.execute("SELECT filepath FROM videos WHERE id = ?", (req.video_id,)).fetchone()
    if not row:
        conn.close()
        raise HTTPException(status_code=404, detail="Video not found")

    task_id = hashlib.md5(f"{req.video_id}_{req.output_filename}_{req.resolution}".encode()).hexdigest()[:16]
    watermark = json.dumps({
        "text": req.watermark_text,
        "font_size": req.watermark_font_size,
        "position": req.watermark_position,
        "font_color": req.watermark_font_color,
    }) if req.watermark_text else None

    conn.execute(
        """INSERT OR REPLACE INTO export_tasks
           (id, video_id, format, resolution, status, progress,
            output_filename, watermark_config, created_at)
           VALUES (?, ?, ?, ?, 'pending', 0, ?, ?, ?)""",
        (task_id, req.video_id, req.format, req.resolution,
         req.output_filename, watermark, __import__('datetime').datetime.now().isoformat())
    )
    conn.commit()
    conn.close()
    return {"task_id": task_id, "status": "pending"}


@router.get("/tasks/{task_id}")
async def get_export_task(task_id: str):
    """查询导出任务进度"""
    conn = _get_db()
    row = conn.execute("SELECT * FROM export_tasks WHERE id = ?", (task_id,)).fetchone()
    conn.close()
    if not row:
        raise HTTPException(status_code=404, detail="Task not found")
    return dict(row)


@router.post("/upload")
async def upload_videos(
    files: list[UploadFile] = File(...),
    folder_name: str = Form("")
):
    """上传视频文件（浏览器场景，支持多文件）"""
    import sqlite3
    from datetime import datetime
    from ..services.ffmpeg import get_video_info

    conn = _get_db()
    results = []

    for file in files:
        content = await file.read()
        ext = Path(file.filename).suffix or ".mp4"
        safe_name = hashlib.md5(f"{file.filename}_{datetime.now().isoformat()}_{len(content)}".encode()).hexdigest()[:8]
        dest_path = Path(__file__).parent.parent.parent.parent / "uploads" / f"{safe_name}{ext}"
        dest_path.parent.mkdir(parents=True, exist_ok=True)
        dest_path.write_bytes(content)

        # 获取视频信息
        try:
            info = await get_video_info(str(dest_path))
            fmt = info.get("format", {})
            streams = info.get("streams", [])
            vs = next((s for s in streams if s.get("codec_type") == "video"), {})
            dur = float(fmt.get("duration", 0))
            w = vs.get("width")
            h = vs.get("height")
        except Exception:
            dur, w, h = 0, None, None

        video_id = hashlib.md5(f"{file.filename}_{len(content)}".encode()).hexdigest()[:16]
        already = conn.execute("SELECT id FROM videos WHERE id = ?", (video_id,)).fetchone()

        if already:
            results.append({"id": already[0], "skipped": True, "filename": file.filename})
            continue

        conn.execute(
            """INSERT INTO videos
               (id, filename, filepath, folder_name, file_size, duration, resolution, recorded_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
            (video_id, file.filename, str(dest_path), folder_name or Path(file.filename).stem,
             len(content), dur,
             f"{w}x{h}" if w else None,
             datetime.now().isoformat())
        )
        results.append({
            "id": video_id,
            "filename": file.filename,
            "filepath": str(dest_path),
            "duration": dur,
            "resolution": f"{w}x{h}" if w else None,
            "file_size": len(content),
            "skipped": False,
        })

    conn.commit()
    conn.close()
    return {"uploaded": len(results), "results": results}
