from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class VideoInfo(BaseModel):
    id: str
    filename: str
    filepath: str
    folder_name: Optional[str] = None
    camera_angle: Optional[str] = None  # front, rear, side, dash, interior
    duration: Optional[float] = None
    file_size: Optional[int] = None
    resolution: Optional[str] = None
    recorded_at: Optional[datetime] = None
    imported_at: datetime = Field(default_factory=datetime.now)
    thumbnail_path: Optional[str] = None


class VideoListResponse(BaseModel):
    videos: list[VideoInfo]
    total: int
    groups: dict[str, list[VideoInfo]]  # grouped by date string


class ImportResult(BaseModel):
    imported: int
    skipped: int
    duplicates: int
    videos: list[VideoInfo]
