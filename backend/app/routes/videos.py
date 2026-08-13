from fastapi import APIRouter
from ..models.video import VideoInfo, VideoListResponse

router = APIRouter(prefix="/api/videos", tags=["视频管理"])


@router.get("")
async def get_videos(limit: int = 100, group_by_date: bool = True):
    """获取视频列表"""
    import sqlite3
    from pathlib import Path
    db_path = Path(__file__).parent.parent.parent.parent / "data" / "teslacam.db"
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    rows = conn.execute(f"SELECT * FROM videos ORDER BY recorded_at DESC LIMIT {limit}").fetchall()
    videos = [dict(r) for r in rows]
    return {"videos": videos, "total": len(videos)}


@router.get("/{video_id}")
async def get_video(video_id: str):
    """获取单个视频详情"""
    import sqlite3
    from pathlib import Path
    db_path = Path(__file__).parent.parent.parent.parent / "data" / "teslacam.db"
    conn = sqlite3.connect(db_path)
    row = conn.execute("SELECT * FROM videos WHERE id = ?", (video_id,)).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Video not found")
    return dict(row)
