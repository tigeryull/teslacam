import { useState, useRef } from 'react'
import { api } from '../utils/api'
import type { Video } from '../types'

export default function ImportPage() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ imported: number; skipped: number; duplicates: number } | null>(null)
  const [videos, setVideos] = useState<Video[]>([])
  const [dragOver, setDragOver] = useState(false)
  const hiddenInput = useRef<HTMLInputElement>(null)

  const scanFromFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return
    setLoading(true)
    try {
      const res = await api.importFiles(Array.from(files)) as {
        imported: number; skipped: number; duplicates: number; videos: Video[]
      }
      setResult({ imported: res.imported, skipped: res.skipped, duplicates: res.duplicates })
      setVideos(prev => [...prev, ...res.videos.filter(v => !prev.some(p => p.id === v.id))])
    } catch (e) {
      alert(`导入失败: ${e}`)
    } finally {
      setLoading(false)
    }
  }

  const handleFolderClick = () => {
    // 优先用 showDirectoryPicker（Chrome/Edge）
    if ('showDirectoryPicker' in window) {
      (window as any).showDirectoryPicker({ mode: 'read' }).then(async (dir: any) => {
        const files: File[] = []
        for await (const entry of dir.values()) {
          if (entry.kind === 'file') {
            const ext = entry.name.split('.').pop()?.toLowerCase()
            if (['mp4', 'mov', 'm4v', 'ts'].includes(ext || '')) {
              const f = await entry.getFile()
              files.push(f)
            }
          }
        }
        if (files.length > 0) await scanFromFiles(files as any)
      }).catch(() => {})
    } else {
      // 回退到 webkitdirectory
      hiddenInput.current?.click()
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    scanFromFiles(e.target.files)
    e.target.value = ''
  }

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const files = Array.from(e.dataTransfer.files).filter(f =>
      /\.(mp4|mov|m4v|ts)$/i.test(f.name)
    )
    if (files.length > 0) await scanFromFiles(files as any)
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">📁 导入管理</h1>

      {/* 拖拽/选择区域 */}
      <div
        className={`bg-gray-900 rounded-xl border-2 border-dashed p-10 mb-6 text-center transition-all ${
          dragOver ? 'border-red-500 bg-red-900/10' : 'border-gray-700 hover:border-gray-500'
        }`}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
      >
        <div className="text-4xl mb-3">📂</div>
        <p className="text-gray-300 font-medium mb-1">拖拽视频文件到这里</p>
        <p className="text-gray-500 text-sm mb-5">支持 MP4 / MOV / M4V / TS 格式</p>
        <div className="flex gap-3 justify-center flex-wrap">
          <button
            onClick={handleFolderClick}
            disabled={loading}
            className="bg-red-600 hover:bg-red-700 disabled:bg-gray-700 disabled:text-gray-500
                       text-white px-6 py-2.5 rounded-lg text-sm font-medium transition-colors"
          >
            {loading ? '处理中...' : '📁 打开文件夹'}
          </button>
          <button
            onClick={() => hiddenInput.current?.click()}
            disabled={loading}
            className="bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-300
                       px-6 py-2.5 rounded-lg text-sm font-medium transition-colors"
          >
            📄 选择文件
          </button>
          <input
            ref={hiddenInput}
            type="file"
            multiple
            accept=".mp4,.mov,.m4v,.ts"
            className="hidden"
            onChange={handleInputChange}
          />
        </div>
        <p className="text-xs text-gray-600 mt-4">
          支持 Tesla · 70mai · VIOFO · BlackVue 等行车记录仪视频
        </p>
      </div>

      {/* 导入结果 */}
      {result && (
        <div className="flex gap-4 mb-6">
          {[
            { label: '已导入', value: result.imported, color: 'green' },
            { label: '跳过', value: result.skipped, color: 'yellow' },
            { label: '重复', value: result.duplicates, color: 'gray' },
          ].map(({ label, value, color }) => (
            <div key={label} className={`bg-${color}-900/30 border border-${color}-800 rounded-lg px-4 py-3 flex-1`}>
              <span className={`text-${color}-400 text-sm font-medium`}>{label}</span>
              <span className={`text-${color}-300 text-2xl font-bold ml-2`}>{value}</span>
            </div>
          ))}
        </div>
      )}

      {/* 视频列表 */}
      {videos.length > 0 && (
        <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-800 flex items-center justify-between">
            <h2 className="font-medium">已导入的视频 ({videos.length})</h2>
            <button
              onClick={() => { setVideos([]); setResult(null) }}
              className="text-xs text-gray-500 hover:text-red-400 transition-colors"
            >
              清空列表
            </button>
          </div>
          <div className="divide-y divide-gray-800 max-h-96 overflow-y-auto">
            {videos.map((v) => (
              <div key={v.id} className="px-6 py-3 flex items-center gap-4 hover:bg-gray-800/50 transition-colors">
                <div className="w-24 h-14 bg-gray-800 rounded flex items-center justify-center text-gray-600 text-xs flex-shrink-0">
                  🎬
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{v.filename}</p>
                  <p className="text-xs text-gray-500">
                    {v.camera_angle && (
                      <span className="bg-red-900/40 text-red-400 px-2 py-0.5 rounded text-xs mr-2">{v.camera_angle}</span>
                    )}
                    {v.recorded_at && new Date(v.recorded_at).toLocaleString('zh-CN')}
                  </p>
                </div>
                <div className="text-xs text-gray-500 text-right flex-shrink-0">
                  {v.file_size && <div>{(v.file_size / 1024 / 1024).toFixed(1)} MB</div>}
                  {v.duration && <div>{Math.floor(v.duration / 60)}:{String(Math.floor(v.duration % 60)).padStart(2, '0')}</div>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
