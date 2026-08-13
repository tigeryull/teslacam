"""ffmpeg 视频处理服务封装"""
import subprocess
import asyncio
from pathlib import Path
from typing import Optional


async def get_video_info(filepath: str) -> dict:
    """获取视频元数据（时长、分辨率、编码等）"""
    cmd = [
        "ffprobe", "-v", "quiet", "-print_format", "json",
        "-show_format", "-show_streams", filepath
    ]
    result = await asyncio.create_subprocess_exec(
        *cmd, stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE
    )
    stdout, _ = await result.communicate()
    import json
    return json.loads(stdout)


async def crop_video(
    input_path: str,
    output_path: str,
    start_time: float,
    end_time: float,
    codec: str = "libx264",
    preset: str = "medium"
) -> bool:
    """裁剪视频时间段"""
    duration = end_time - start_time
    cmd = [
        "ffmpeg", "-y",
        "-ss", str(start_time),
        "-i", input_path,
        "-t", str(duration),
        "-c:v", codec,
        "-preset", preset,
        "-c:a", "aac",
        output_path
    ]
    result = await asyncio.create_subprocess_exec(*cmd)
    await result.communicate()
    return result.returncode == 0


async def merge_videos(input_paths: list[str], output_path: str) -> bool:
    """拼接多个视频"""
    list_file = output_path + ".txt"
    with open(list_file, "w") as f:
        for path in input_paths:
            f.write(f"file '{path}'\n")
    
    cmd = [
        "ffmpeg", "-y",
        "-f", "concat",
        "-safe", "0",
        "-i", list_file,
        "-c", "copy",
        output_path
    ]
    result = await asyncio.create_subprocess_exec(*cmd)
    await result.communicate()
    Path(list_file).unlink(missing_ok=True)
    return result.returncode == 0


async def rotate_video(input_path: str, output_path: str, degrees: int) -> bool:
    """旋转视频"""
    transpose_map = {90: "1", 180: "0", 270: "2"}
    transpose = transpose_map.get(degrees, "0")
    cmd = [
        "ffmpeg", "-y",
        "-i", input_path,
        "-vf", f"transpose={transpose}",
        "-c:a", "copy",
        output_path
    ]
    result = await asyncio.create_subprocess_exec(*cmd)
    await result.communicate()
    return result.returncode == 0
