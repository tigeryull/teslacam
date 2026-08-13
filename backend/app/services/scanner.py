"""视频文件扫描 & 去重服务"""
import hashlib
import re
from pathlib import Path
from datetime import datetime
from typing import Optional


CAMERA_FOLDERS = {
    "front": ["front", "Front Camera", "Front.jpg"],
    "rear": ["rear", "Rear Camera", "Rear.jpg"],
    "side_left": ["side_left", "left", "Left Camera"],
    "side_right": ["side_right", "right", "Right Camera"],
    "interior": ["interior", "inside", "Interior Camera"],
    "dash": ["dashboard", "dash", "Dashboard"],
}

VIDEO_EXTENSIONS = {".mp4", ".mov", ".m4v", ".ts"}


def detect_camera_angle(folder_name: str) -> Optional[str]:
    """根据文件夹名检测相机角度"""
    folder_lower = folder_name.lower()
    for angle, keywords in CAMERA_FOLDERS.items():
        for kw in keywords:
            if kw.lower() in folder_lower:
                return angle
    return None


def parse_tesla_filename(filename: str) -> dict:
    """解析 Tesla 行车记录仪文件名
    格式：YYYY-MM-DD_HH-MM-SS--front--*.mp4
    """
    pattern = r"(\d{4}-\d{2}-\d{2})_(\d{2}-\d{2}-\d{2})--(\w+)--"
    match = re.match(pattern, filename)
    if match:
        date_str, time_str, angle = match.groups()
        recorded_at = datetime.strptime(f"{date_str} {time_str.replace('-', ':')}", "%Y-%m-%d %H:%M:%S")
        return {"recorded_at": recorded_at, "camera_angle": angle}
    return {}


def scan_folder(folder_path: str) -> list[dict]:
    """扫描文件夹中的所有视频文件"""
    videos = []
    root = Path(folder_path)
    
    for ext in VIDEO_EXTENSIONS:
        for filepath in root.rglob(f"*{ext}"):
            video_info = {
                "filename": filepath.name,
                "filepath": str(filepath),
                "folder_name": filepath.parent.name,
                "camera_angle": detect_camera_angle(filepath.parent.name),
                "file_size": filepath.stat().st_size,
            }
            # 尝试从文件名解析时间
            parsed = parse_tesla_filename(filepath.stem)
            if parsed:
                video_info.update(parsed)
            else:
                # 回退到文件修改时间
                video_info["recorded_at"] = datetime.fromtimestamp(filepath.stat().st_mtime)
            videos.append(video_info)
    
    return sorted(videos, key=lambda v: v.get("recorded_at") or datetime.min)


def deduplicate(videos: list[dict]) -> tuple[list[dict], int]:
    """去重：相同文件名+大小的视频只保留一个"""
    seen = set()
    unique = []
    dup_count = 0
    for v in videos:
        key = (v["filename"], v["file_size"])
        if key in seen:
            dup_count += 1
        else:
            seen.add(key)
            unique.append(v)
    return unique, dup_count
