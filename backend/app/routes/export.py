from fastapi import APIRouter, HTTPException
from pathlib import Path
import sqlite3

router = APIRouter(prefix="/api/export", tags=["导出"])


def _get_db():
    db_path = Path(__file__).parent.parent.parent.parent / "data" / "teslacam.db"
    return sqlite3.connect(db_path)


@router.get("/tasks")
async def list_tasks(limit: int = 50):
    """获取导出任务列表"""
    conn = _get_db()
    rows = conn.execute("SELECT * FROM export_tasks ORDER BY created_at DESC LIMIT ?", (limit,)).fetchall()
    conn.close()
    return {"tasks": [dict(r) for r in rows]}


@router.delete("/tasks/{task_id}")
async def cancel_task(task_id: str):
    """取消导出任务"""
    conn = _get_db()
    conn.execute("DELETE FROM export_tasks WHERE id = ?", (task_id,))
    conn.commit()
    conn.close()
    return {"cancelled": True}


@router.get("/tasks/{task_id}/download")
async def download_export(task_id: str):
    """下载导出文件"""
    import sqlite3
    conn = _get_db()
    row = conn.execute("SELECT * FROM export_tasks WHERE id = ?", (task_id,)).fetchone()
    conn.close()
    if not row or not row.get("output_path"):
        raise HTTPException(status_code=404, detail="Export file not found")
    output_path = Path(row["output_path"])
    if not output_path.exists():
        raise HTTPException(status_code=404, detail="Export file not found")
    return {"filename": output_path.name, "size": output_path.stat().st_size}
