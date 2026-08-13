import { useState, useRef, useEffect, useCallback } from 'react'
import { api } from '../utils/api'
import type { Video } from '../types'

type WatermarkPosition = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center'
type ActiveTab = 'crop' | 'merge' | 'rotate'

interface WatermarkConfig {
  enabled: boolean
  text: string
  fontSize: number
  position: WatermarkPosition
  fontColor: string
}

export default function EditPage() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('crop')
  const [videos, setVideos] = useState<Video[]>([])
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null)
  const [videoUrl, setVideoUrl] = useState<string>('')

  // 裁剪状态
  const [startTime, setStartTime] = useState(0)
  const [endTime, setEndTime] = useState(0)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [trimRange, setTrimRange] = useState<[number, number]>([0, 0])
  const [isDragging, setIsDragging] = useState<'start' | 'end' | 'range' | null>(null)
  const [dragStartX, setDragStartX] = useState(0)

  // 水印状态
  const [watermark, setWatermark] = useState<WatermarkConfig>({
    enabled: false,
    text: '',
    fontSize: 24,
    position: 'bottom-right',
    fontColor: 'white',
  })
  const [previewWatermark, setPreviewWatermark] = useState(false)

  // 输出设置
  const [outputName, setOutputName] = useState('')
  const [exporting, setExporting] = useState(false)
  const [exportProgress, setExportProgress] = useState<number | null>(null)

  // 旋转
  const [rotateDegrees, setRotateDegrees] = useState(0)

  const videoRef = useRef<HTMLVideoElement>(null)
  const timelineRef = useRef<HTMLDivElement>(null)

  // 加载视频列表
  useEffect(() => {
    api.listVideos().then((res: any) => setVideos(res.videos || [])).catch(console.error)
  }, [])

  // 加载视频
  const loadVideo = useCallback((v: Video) => {
    setSelectedVideo(v)
    if (videoUrl) URL.revokeObjectURL(videoUrl)
    const url = `/api/videos/${v.id}/stream`
    setVideoUrl(url)
    setStartTime(0)
    setEndTime(0)
    setTrimRange([0, 0])
    setDuration(0)
    setCurrentTime(0)
    setIsPlaying(false)
    setRotateDegrees(0)
    setOutputName('')
  }, [])

  // 时间轴宽度映射
  const timelineWidth = 600
  const xToTime = (x: number) => (x / timelineWidth) * duration

  // 处理鼠标/触摸拖动
  const handleTimelineMouseDown = (e: React.MouseEvent | React.TouchEvent, handle: 'start' | 'end' | 'range') => {
    e.preventDefault()
    setIsDragging(handle)
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
    setDragStartX(clientX)
  }

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent | TouchEvent) => {
      if (!isDragging || !timelineRef.current) return
      const rect = timelineRef.current.getBoundingClientRect()
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
      const dx = clientX - dragStartX
      const dt = (dx / rect.width) * duration

      if (isDragging === 'start') {
        const newStart = Math.max(0, Math.min(trimRange[1] - 0.5, startTime + dt))
        setStartTime(newStart)
        setTrimRange([newStart, trimRange[1]])
      } else if (isDragging === 'end') {
        const newEnd = Math.min(duration, Math.max(trimRange[0] + 0.5, endTime + dt))
        setEndTime(newEnd)
        setTrimRange([trimRange[0], newEnd])
      } else if (isDragging === 'range') {
        const range = trimRange[1] - trimRange[0]
        const newStart = Math.max(0, Math.min(duration - range, startTime + dt))
        const newEnd = newStart + range
        setStartTime(newStart)
        setEndTime(newEnd)
        setTrimRange([newStart, newEnd])
      }
      setDragStartX('touches' in e ? e.touches[0].clientX : e.clientX)
    }

    const handleMouseUp = () => {
      if (isDragging === 'range') {
          }
      setIsDragging(null)
    }

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove)
      window.addEventListener('mouseup', handleMouseUp)
      window.addEventListener('touchmove', handleMouseMove)
      window.addEventListener('touchend', handleMouseUp)
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
      window.removeEventListener('touchmove', handleMouseMove)
      window.removeEventListener('touchend', handleMouseUp)
    }
  }, [isDragging, dragStartX, trimRange, startTime, endTime, duration])

  // 视频事件
  const handleTimeUpdate = () => {
    const t = videoRef.current?.currentTime ?? 0
    setCurrentTime(t)
    // 自动循环播放裁剪区间
    if (t >= endTime && endTime > 0) {
      videoRef.current!.currentTime = startTime
    }
  }

  const handleLoadedMetadata = () => {
    const d = videoRef.current?.duration ?? 0
    setDuration(d)
    setEndTime(d)
    setTrimRange([0, d])
  }

  const togglePlay = () => {
    const v = videoRef.current
    if (!v) return
    if (isPlaying) {
      v.pause()
      // 跳到开始时间
      v.currentTime = startTime
    } else {
      v.currentTime = startTime
      v.play()
    }
    setIsPlaying(!isPlaying)
  }

  const handleTimelineClick = (e: React.MouseEvent) => {
    if (!timelineRef.current || isDragging) return
    const rect = timelineRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const t = Math.max(0, Math.min(duration, xToTime(x)))
    if (videoRef.current) videoRef.current.currentTime = t
    setCurrentTime(t)
  }

  // 导出裁剪
  const handleExport = async () => {
    if (!selectedVideo) return
    setExporting(true)
    setExportProgress(null)
    try {
      const params: any = {
        video_id: selectedVideo.id,
        start_time: startTime,
        end_time: endTime,
        output_filename: outputName || `clip_${selectedVideo.id}.mp4`,
      }
      if (watermark.enabled && watermark.text) {
        params.watermark_text = watermark.text
        params.watermark_font_size = watermark.fontSize
        params.watermark_position = watermark.position
        params.watermark_font_color = watermark.fontColor
      }
      if (rotateDegrees !== 0) {
        params.rotate = rotateDegrees
      }
      const res = await api.cropVideo(params) as { success: boolean; output_path: string }
      if (res.success) {
        alert('导出成功！\n\n' + res.output_path)
      } else {
        alert('导出失败，请检查后端日志')
      }
    } catch (e) {
      alert('导出失败: ' + e)
    } finally {
      setExporting(false)
      setExportProgress(null)
    }
  }

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60)
    const sec = Math.floor(s % 60)
    return `${m}:${String(sec).padStart(2, '0')}`
  }

  const getWatermarkText = () => {
    if (!watermark.enabled || !watermark.text) return ''
    const now = new Date()
    return watermark.text
      .replace('{date}', now.toLocaleDateString('zh-CN'))
      .replace('{time}', now.toLocaleTimeString('zh-CN'))
      .replace('{datetime}', now.toLocaleString('zh-CN'))
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">✂️ 剪辑编辑</h1>

      <div className="flex gap-6">
        {/* 左侧：视频预览区 */}
        <div className="flex-1">
          {/* Tab 切换 */}
          <div className="flex gap-2 mb-4 bg-gray-900 rounded-xl p-1 w-fit border border-gray-800">
            {([
              { key: 'crop', label: '裁剪' },
              { key: 'merge', label: '拼接' },
              { key: 'rotate', label: '旋转' },
            ] as const).map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === key
                    ? 'bg-red-600 text-white'
                    : 'text-gray-400 hover:text-white hover:bg-gray-800'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {activeTab === 'crop' && (
            <>
              {/* 视频播放器 */}
              <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden mb-4">
                <div className="relative aspect-video bg-black">
                  {selectedVideo ? (
                    <video
                      ref={videoRef}
                      src={videoUrl}
                      className="w-full h-full object-contain"
                      onTimeUpdate={handleTimeUpdate}
                      onLoadedMetadata={handleLoadedMetadata}
                      onClick={togglePlay}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-600">
                      <div className="text-center">
                        <div className="text-4xl mb-2">🎬</div>
                        <p className="text-sm">请先导入视频</p>
                      </div>
                    </div>
                  )}

                  {/* 水印预览叠加 */}
                  {previewWatermark && selectedVideo && (
                    <div
                      className="absolute pointer-events-none font-bold"
                      style={{
                        fontSize: watermark.fontSize * 1.2,
                        color: watermark.fontColor,
                        textShadow: '1px 1px 3px rgba(0,0,0,0.8), -1px -1px 3px rgba(0,0,0,0.8)',
                        ...(watermark.position === 'top-left' && { top: '10%', left: '2%' }),
                        ...(watermark.position === 'top-right' && { top: '10%', right: '2%' }),
                        ...(watermark.position === 'bottom-left' && { bottom: '10%', left: '2%' }),
                        ...(watermark.position === 'bottom-right' && { bottom: '10%', right: '2%' }),
                        ...(watermark.position === 'center' && { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }),
                      }}
                    >
                      {getWatermarkText()}
                    </div>
                  )}

                  {/* 裁剪区间指示条（播放头） */}
                  <div
                    className="absolute bottom-0 left-0 right-0 h-1 bg-gray-700 cursor-pointer"
                    onClick={handleTimelineClick}
                    ref={timelineRef}
                  >
                    {/* 裁剪区间高亮 */}
                    <div
                      className="absolute top-0 h-full bg-red-500/60"
                      style={{
                        left: `${(startTime / duration) * 100}%`,
                        width: `${((endTime - startTime) / duration) * 100}%`,
                      }}
                    />
                    {/* 开始手柄 */}
                    <div
                      className="absolute top-[-4px] w-3 h-3 bg-red-500 rounded-full cursor-ew-resize hover:scale-125 transition-transform"
                      style={{ left: `${(startTime / duration) * 100}%`, transform: 'translateX(-50%)' }}
                      onMouseDown={(e) => handleTimelineMouseDown(e, 'start')}
                      onTouchStart={(e) => handleTimelineMouseDown(e, 'start')}
                    />
                    {/* 结束手柄 */}
                    <div
                      className="absolute top-[-4px] w-3 h-3 bg-red-500 rounded-full cursor-ew-resize hover:scale-125 transition-transform"
                      style={{ left: `${(endTime / duration) * 100}%`, transform: 'translateX(-50%)' }}
                      onMouseDown={(e) => handleTimelineMouseDown(e, 'end')}
                      onTouchStart={(e) => handleTimelineMouseDown(e, 'end')}
                    />
                    {/* 中间拖拽区 */}
                    <div
                      className="absolute top-[-8px] h-[calc(100%+16px)] cursor-move"
                      style={{
                        left: `${(startTime / duration) * 100}%`,
                        width: `${((endTime - startTime) / duration) * 100}%`,
                      }}
                      onMouseDown={(e) => handleTimelineMouseDown(e, 'range')}
                      onTouchStart={(e) => handleTimelineMouseDown(e, 'range')}
                    />
                  </div>
                </div>

                {/* 播放控制 */}
                <div className="px-4 py-3 flex items-center gap-3 bg-gray-800/50">
                  <button
                    onClick={togglePlay}
                    className="w-8 h-8 rounded-full bg-red-600 hover:bg-red-700 flex items-center justify-center text-white transition-colors"
                  >
                    {isPlaying ? '⏸' : '▶'}
                  </button>
                  <span className="text-xs text-gray-400 font-mono w-20">
                    {formatTime(currentTime)}
                  </span>
                  <input
                    type="range"
                    min={0}
                    max={duration || 100}
                    step={0.1}
                    value={currentTime}
                    onChange={(e) => {
                      const t = parseFloat(e.target.value)
                      setCurrentTime(t)
                      if (videoRef.current) videoRef.current.currentTime = t
                    }}
                    className="flex-1 h-1 bg-gray-700 rounded-full appearance-none cursor-pointer accent-red-500"
                  />
                  <span className="text-xs text-gray-500 font-mono w-20 text-right">
                    {formatTime(duration)}
                  </span>
                </div>
              </div>

              {/* 时间选择行 */}
              <div className="bg-gray-900 rounded-xl border border-gray-800 p-4 mb-4">
                <div className="flex items-center gap-4 flex-wrap">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500">开始</span>
                    <input
                      type="number"
                      step={0.1}
                      value={startTime.toFixed(1)}
                      onChange={(e) => {
                        const t = parseFloat(e.target.value) || 0
                        setStartTime(Math.max(0, Math.min(t, endTime - 0.1)))
                        setTrimRange([Math.max(0, Math.min(t, endTime - 0.1)), trimRange[1]])
                      }}
                      className="w-20 bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-sm font-mono text-center focus:outline-none focus:border-red-500"
                    />
                    <span className="text-xs text-gray-600">秒</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500">结束</span>
                    <input
                      type="number"
                      step={0.1}
                      value={endTime.toFixed(1)}
                      onChange={(e) => {
                        const t = parseFloat(e.target.value) || 0
                        setEndTime(Math.min(duration, Math.max(t, startTime + 0.1)))
                        setTrimRange([trimRange[0], Math.min(duration, Math.max(t, startTime + 0.1))])
                      }}
                      className="w-20 bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-sm font-mono text-center focus:outline-none focus:border-red-500"
                    />
                    <span className="text-xs text-gray-600">秒</span>
                  </div>
                  <div className="text-xs text-gray-500 ml-auto">
                    片段时长：<span className="text-red-400 font-mono font-medium">{formatTime(endTime - startTime)}</span>
                  </div>
                </div>
              </div>
            </>
          )}

          {activeTab === 'merge' && (
            <div className="bg-gray-900 rounded-xl border border-gray-800 p-6">
              <h2 className="text-lg font-medium mb-4">多视频拼接</h2>
              {videos.length < 2 ? (
                <p className="text-gray-500 text-sm">至少需要 2 个视频才能拼接</p>
              ) : (
                <>
                  <p className="text-sm text-gray-500 mb-4">选择要拼接的视频（按顺序）</p>
                  <div className="space-y-2 mb-4 max-h-60 overflow-y-auto">
                    {videos.map((v) => (
                      <label key={v.id} className="flex items-center gap-3 p-3 bg-gray-800 rounded-lg cursor-pointer hover:bg-gray-750 transition-colors">
                        <input type="checkbox" className="accent-red-500 w-4 h-4" />
                        <span className="text-sm flex-1 truncate">{v.filename}</span>
                        <span className="text-xs text-gray-500">{v.duration ? formatTime(v.duration) : '--'}</span>
                      </label>
                    ))}
                  </div>
                  <button className="bg-red-600 hover:bg-red-700 text-white px-6 py-2.5 rounded-lg text-sm font-medium transition-colors">
                    开始拼接
                  </button>
                </>
              )}
            </div>
          )}

          {activeTab === 'rotate' && (
            <div className="bg-gray-900 rounded-xl border border-gray-800 p-6">
              <h2 className="text-lg font-medium mb-4">画面旋转</h2>
              <div className="grid grid-cols-3 gap-4 mb-4">
                {[90, 180, 270].map((deg) => (
                  <button
                    key={deg}
                    onClick={() => setRotateDegrees(deg)}
                    className={`py-4 rounded-lg text-sm font-medium transition-colors border ${
                      rotateDegrees === deg
                        ? 'bg-red-600/30 border-red-500 text-red-400'
                        : 'bg-gray-800 border-gray-700 text-gray-400 hover:bg-gray-700 hover:border-gray-500'
                    }`}
                  >
                    旋转 {deg}°
                  </button>
                ))}
              </div>
              {selectedVideo && (
                <div className="mt-4">
                  <video
                    src={videoUrl}
                    className="w-full max-h-64 rounded-lg object-contain bg-black mb-4"
                    style={{ transform: `rotate(${rotateDegrees}deg)` }}
                  />
                </div>
              )}
              <button className="bg-red-600 hover:bg-red-700 text-white px-6 py-2.5 rounded-lg text-sm font-medium transition-colors">
                应用旋转
              </button>
            </div>
          )}
        </div>

        {/* 右侧：设置面板 */}
        <div className="w-72 space-y-4">
          {/* 视频选择 */}
          <div className="bg-gray-900 rounded-xl border border-gray-800 p-4">
            <h3 className="text-sm font-medium text-gray-400 mb-3">选择视频</h3>
            <select
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-red-500"
              onChange={(e) => {
                const v = videos.find(v => v.id === e.target.value)
                if (v) loadVideo(v)
              }}
              value={selectedVideo?.id || ''}
            >
              <option value="">-- 请选择 --</option>
              {videos.map((v) => (
                <option key={v.id} value={v.id}>{v.filename}</option>
              ))}
            </select>
          </div>

          {/* 水印设置 */}
          <div className="bg-gray-900 rounded-xl border border-gray-800 p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-gray-400">时间戳水印</h3>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={watermark.enabled}
                  onChange={(e) => setWatermark({ ...watermark, enabled: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-gray-700 peer-checked:bg-red-600 rounded-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:left-[34px]"></div>
              </label>
            </div>

            {watermark.enabled && (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">水印文字</label>
                  <input
                    type="text"
                    value={watermark.text}
                    onChange={(e) => setWatermark({ ...watermark, text: e.target.value })}
                    placeholder="自定义文字（可用 {datetime}）"
                    className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm focus:outline-none focus:border-red-500"
                  />
                  <p className="text-xs text-gray-600 mt-1">
                    占位符：{`{date} {time} {datetime}`}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">字号</label>
                    <input
                      type="number"
                      value={watermark.fontSize}
                      onChange={(e) => setWatermark({ ...watermark, fontSize: parseInt(e.target.value) || 24 })}
                      className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm focus:outline-none focus:border-red-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">颜色</label>
                    <select
                      value={watermark.fontColor}
                      onChange={(e) => setWatermark({ ...watermark, fontColor: e.target.value })}
                      className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm focus:outline-none focus:border-red-500"
                    >
                      <option value="white">白色</option>
                      <option value="yellow">黄色</option>
                      <option value="red">红色</option>
                      <option value="green">绿色</option>
                      <option value="cyan">青色</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs text-gray-500 mb-1">位置</label>
                  <div className="grid grid-cols-3 gap-1">
                    {(['top-left', 'top-right', 'center', 'bottom-left', 'bottom-right'] as WatermarkPosition[]).map((pos) => (
                      <button
                        key={pos}
                        onClick={() => setWatermark({ ...watermark, position: pos })}
                        className={`px-2 py-1.5 rounded text-xs transition-colors border ${
                          watermark.position === pos
                            ? 'bg-red-600/30 border-red-500 text-red-400'
                            : 'bg-gray-800 border-gray-700 text-gray-500 hover:border-gray-500'
                        }`}
                      >
                        {pos.replace('-', ' ')}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 预览按钮 */}
                <button
                  onClick={() => setPreviewWatermark(!previewWatermark)}
                  className={`w-full py-2 rounded-lg text-sm font-medium transition-colors border ${
                    previewWatermark
                      ? 'bg-red-600/20 border-red-500 text-red-400'
                      : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-500'
                  }`}
                >
                  {previewWatermark ? '👁 隐藏预览' : '👁 预览水印'}
                </button>

                {/* 水印预览效果 */}
                {previewWatermark && (
                  <div className="bg-gray-800 rounded p-2 text-center">
                    <div
                      className="font-bold"
                      style={{
                        fontSize: watermark.fontSize,
                        color: watermark.fontColor,
                        textShadow: '1px 1px 3px rgba(0,0,0,0.8)',
                      }}
                    >
                      {getWatermarkText() || '时间戳水印'}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 输出设置 */}
          <div className="bg-gray-900 rounded-xl border border-gray-800 p-4">
            <h3 className="text-sm font-medium text-gray-400 mb-3">输出设置</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">输出文件名</label>
                <input
                  type="text"
                  value={outputName}
                  onChange={(e) => setOutputName(e.target.value)}
                  placeholder="可选，默认自动生成"
                  className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm focus:outline-none focus:border-red-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">格式</label>
                  <select className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm focus:outline-none focus:border-red-500">
                    <option>MP4 (H.264)</option>
                    <option>MP4 (H.265)</option>
                    <option>MOV</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">分辨率</label>
                  <select className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm focus:outline-none focus:border-red-500">
                    <option>原画</option>
                    <option>1080p</option>
                    <option>720p</option>
                  </select>
                </div>
              </div>
              {exporting && exportProgress !== null && (
                <div>
                  <div className="flex justify-between text-xs text-gray-500 mb-1">
                    <span>导出中...</span>
                    <span>{exportProgress}%</span>
                  </div>
                  <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-red-500 rounded-full transition-all duration-300"
                      style={{ width: `${exportProgress}%` }}
                    />
                  </div>
                </div>
              )}
              <button
                onClick={handleExport}
                disabled={exporting || !selectedVideo}
                className="w-full bg-red-600 hover:bg-red-700 disabled:bg-gray-700 disabled:text-gray-500
                          text-white px-6 py-2.5 rounded-lg text-sm font-medium transition-colors"
              >
                {exporting ? '导出中...' : '🚀 导出视频'}
              </button>
            </div>
          </div>

          {/* 使用说明 */}
          <div className="bg-gray-900/50 rounded-xl border border-gray-800/50 p-4">
            <h3 className="text-xs font-medium text-gray-500 mb-2">💡 操作提示</h3>
            <ul className="text-xs text-gray-600 space-y-1">
              <li>• 拖拽时间轴红点可调整裁剪区间</li>
              <li>• 拖拽中间区域可整体移动区间</li>
              <li>• 点击时间轴快速定位播放位置</li>
              <li>• 开启水印后点击「预览水印」查看效果</li>
              <li>• 支持 {`{date}`} `{`{time}`} {`{datetime}`} 占位符</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
