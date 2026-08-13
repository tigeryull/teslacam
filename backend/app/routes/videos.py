from fastapi import APIRouter, HTTPException, Response
from pathlib import Path
import sqlite3
import os

router = APIRouter(prefix="/api/videos", tags=["视频管理"])


def _get_db():
    db_path = Path(__file__).parent.parent.parent.parent / "data" / "teslacam.db"
    return sqlite3.connect(db_path)


@router.get("")
async def get_videos(limit: int = 100, group_by_date: bool = True):
    """获取视频列表"""
    conn = _get_db()
    conn.row_factory = sqlite3.Row
    rows = conn.execute(f"SELECT * FROM videos ORDER BY recorded_at DESC LIMIT {limit}").fetchall()
    conn.close()
    videos = [dict(r) for r in rows]
    return {"videos": videos, "total": len(videos)}


@router.get("/{video_id}")
async def get_video(video_id: str):
    """获取单个视频详情"""
    conn = _get_db()
    row = conn.execute("SELECT * FROM videos WHERE id = ?", (video_id,)).fetchone()
    conn.close()
    if not row:
        raise HTTPException(status_code=404, detail="Video not found")
    return dict(row)


@router.get("/{video_id}/stream")
async def stream_video(video_id: str):
    """视频流接口"""
    conn = _get_db()
    row = conn.execute("SELECT filepath FROM videos WHERE id = ?", (video_id,)).fetchone()
    conn.close()
    if not row:
        raise HTTPException(status_code=404, detail="Video not found")
    filepath = Path(row["filepath"])
    if not filepath.exists():
        raise HTTPException(status_code=404, detail="File not found")
    
    # 支持范围请求
    range_header = None
    file_size = filepath.stat().st_size
    
    content_range = None
    start = 0
    end = file_size - 1
    
    if "HTTP_RANGE" in os.environ:
        pass  # 简化处理，直接返回完整文件
    
    with open(filepath, "rb") as f:
        data = f.read()
    
    return Response(
        content=data,
        media_type="video/mp4",
        headers={
            "Content-Length": str(file_size),
            "Accept-Ranges": "bytes",
        }
    )
