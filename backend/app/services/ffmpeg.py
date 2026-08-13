"""ffmpeg 视频处理服务封装"""
import subprocess
import asyncio
import json
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


async def add_watermark(
    input_path: str,
    output_path: str,
    text: str,
    font_size: int = 24,
    position: str = "bottom-right",  # top-left, top-right, bottom-left, bottom-right, center
    font_color: str = "white",
    margin: int = 20,
    codec: str = "libx264",
    preset: str = "fast"
) -> bool:
    """添加时间戳水印"""
    # 计算 x, y 位置
    pos_map = {
        "top-left":     ("margin_x", "margin_y"),
        "top-right":    "w-tw-margin_x", "margin_y"),
        "bottom-left":  ("margin_x", "h-th-margin_y"),
        "bottom-right": ("w-tw-margin_x", "h-th-margin_y"),
        "center":       "(w-tw)/2", "(h-th)/2"),
    }
    if position not in pos_map:
        position = "bottom-right"
    x_expr, y_expr = pos_map[position]

    # 转义特殊字符
    escaped_text = text.replace("'", "'\\''")

    vf = f"drawtext=text='{escaped_text}':fontcolor={font_color}:fontsize={font_size}:x={x_expr}:y={y_expr}:margin={margin}"

    cmd = [
        "ffmpeg", "-y",
        "-i", input_path,
        "-vf", vf,
        "-c:a", "copy",
        "-c:v", codec,
        "-preset", preset,
        output_path
    ]
    result = await asyncio.create_subprocess_exec(*cmd)
    await result.communicate()
    return result.returncode == 0


async def crop_with_watermark(
    input_path: str,
    output_path: str,
    start_time: float,
    end_time: float,
    text: str,
    font_size: int = 24,
    position: str = "bottom-right",
    font_color: str = "white",
    margin: int = 20,
    codec: str = "libx264",
    preset: str = "medium"
) -> bool:
    """裁剪 + 添加水印"""
    duration = end_time - start_time
    pos_map = {
        "top-left":     ("margin_x", "margin_y"),
        "top-right":    ("w-tw-margin_x", "margin_y"),
        "bottom-left":  ("margin_x", "h-th-margin_y"),
        "bottom-right": ("w-tw-margin_x", "h-th-margin_y"),
        "center":       ("(w-tw)/2", "(h-th)/2"),
    }
    x_expr, y_expr = pos_map.get(position, pos_map["bottom-right"])
    escaped_text = text.replace("'", "'\\''")

    vf = f"drawtext=text='{escaped_text}':fontcolor={font_color}:fontsize={font_size}:x={x_expr}:y={y_expr}:margin={margin}"

    cmd = [
        "ffmpeg", "-y",
        "-ss", str(start_time),
        "-i", input_path,
        "-t", str(duration),
        "-vf", vf,
        "-c:a", "aac",
        "-c:v", codec,
        "-preset", preset,
        output_path
    ]
    result = await asyncio.create_subprocess_exec(*cmd)
    await result.communicate()
    return result.returncode == 0
