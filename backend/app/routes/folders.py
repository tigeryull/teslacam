import hashlib
from fastapi import APIRouter, HTTPException
from ..services.scanner import scan_folder, deduplicate
from ..models.video import ImportResult

router = APIRouter(prefix="/api/folders", tags=["导入管理"])


@router.post("/scan", response_model=ImportResult)
async def scan_and_import(folder_path: str):
    """扫描文件夹并导入视频"""
    import shutil
    from pathlib import Path
    from datetime import datetime
    import sqlite3
    
    db_path = Path(__file__).parent.parent.parent.parent / "data" / "teslacam.db"
    db_path.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(db_path)
    conn.execute("""
        CREATE TABLE IF NOT EXISTS videos (
            id TEXT PRIMARY KEY,
            filename TEXT NOT NULL,
            filepath TEXT NOT NULL,
            folder_name TEXT,
            camera_angle TEXT,
            duration REAL,
            file_size INTEGER,
            resolution TEXT,
            recorded_at TEXT,
            imported_at TEXT DEFAULT CURRENT_TIMESTAMP,
            thumbnail_path TEXT
        )
    """)
    conn.commit()
    
    videos = scan_folder(folder_path)
    videos, dup_count = deduplicate(videos)
    
    imported = 0
    skipped = 0
    result_videos = []
    
    for v in videos:
        video_id = hashlib.md5(f"{v['filename']}_{v['file_size']}".encode()).hexdigest()[:16]
        exists = conn.execute("SELECT id FROM videos WHERE id = ?", (video_id,)).fetchone()
        if exists:
            skipped += 1
            continue
        conn.execute(
            "INSERT INTO videos (id, filename, filepath, folder_name, camera_angle, file_size, recorded_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
            (video_id, v["filename"], v["filepath"], v["folder_name"], v["camera_angle"], v["file_size"],
             v.get("recorded_at", datetime.now()).isoformat())
        )
        imported += 1
        result_videos.append(v)
    
    conn.commit()
    conn.close()
    return ImportResult(imported=imported, skipped=skipped, duplicates=dup_count, videos=result_videos)


@router.get("/list")
async def list_videos(date_filter: str | None = None, limit: int = 100):
    """获取视频列表，可按日期过滤"""
    import sqlite3
    from datetime import datetime
    db_path = Path(__file__).parent.parent.parent.parent / "data" / "teslacam.db"
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    
    query = "SELECT * FROM videos"
    params = []
    if date_filter:
        query += " WHERE recorded_at LIKE ?"
        params.append(f"{date_filter}%")
    query += f" ORDER BY recorded_at DESC LIMIT {limit}"
    
    rows = conn.execute(query, params).fetchall()
    videos = [dict(r) for r in rows]
    
    # 按日期分组
    groups = {}
    for v in videos:
        date_str = v["recorded_at"][:10] if v.get("recorded_at") else "unknown"
        groups.setdefault(date_str, []).append(v)
    
    return {"videos": videos, "total": len(videos), "groups": groups}


@router.delete("/{video_id}")
async def delete_video(video_id: str):
    """删除视频记录"""
    import sqlite3
    from pathlib import Path
    db_path = Path(__file__).parent.parent.parent.parent / "data" / "teslacam.db"
    conn = sqlite3.connect(db_path)
    conn.execute("DELETE FROM videos WHERE id = ?", (video_id,))
    conn.commit()
    return {"deleted": conn.rowcount > 0}
