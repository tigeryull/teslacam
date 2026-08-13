import { useState } from 'react'
import { api } from '../utils/api'
import type { Video } from '../types'

export default function ImportPage() {
  const [folderPath, setFolderPath] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ imported: number; skipped: number; duplicates: number } | null>(null)
  const [videos, setVideos] = useState<Video[]>([])

  const handleScan = async () => {
    if (!folderPath.trim()) return
    setLoading(true)
    try {
      const res = await api.scanFolder(folderPath)
      setResult({ imported: res.imported, skipped: res.skipped, duplicates: res.duplicates } as any)
      setVideos(res.videos || [])
    } catch (e) {
      alert(`导入失败: ${e}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">📁 导入管理</h1>

      {/* 扫描区域 */}
      <div className="bg-gray-900 rounded-xl p-6 mb-6 border border-gray-800">
        <h2 className="text-sm font-medium text-gray-400 mb-4">扫描文件夹</h2>
        <div className="flex gap-3">
          <input
            type="text"
            value={folderPath}
            onChange={(e) => setFolderPath(e.target.value)}
            placeholder="/path/to/sd-card/DCIM"
            className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-red-500 transition-colors"
          />
          <button
            onClick={handleScan}
            disabled={loading || !folderPath.trim()}
            className="bg-red-600 hover:bg-red-700 disabled:bg-gray-700 disabled:text-gray-500 text-white px-6 py-2.5 rounded-lg text-sm font-medium transition-colors"
          >
            {loading ? '扫描中...' : '扫描导入'}
          </button>
        </div>
        <p className="text-xs text-gray-600 mt-2">支持 Tesla、70mai、VIOFO 等品牌行车记录仪视频目录</p>
      </div>

      {/* 导入结果 */}
      {result && (
        <div className="flex gap-4 mb-6">
          <div className="bg-green-900/30 border border-green-800 rounded-lg px-4 py-3 flex-1">
            <span className="text-green-400 text-sm font-medium">已导入</span>
            <span className="text-green-300 text-2xl font-bold ml-2">{result.imported}</span>
          </div>
          <div className="bg-yellow-900/30 border border-yellow-800 rounded-lg px-4 py-3 flex-1">
            <span className="text-yellow-400 text-sm font-medium">跳过</span>
            <span className="text-yellow-300 text-2xl font-bold ml-2">{result.skipped}</span>
          </div>
          <div className="bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 flex-1">
            <span className="text-gray-400 text-sm font-medium">重复</span>
            <span className="text-gray-300 text-2xl font-bold ml-2">{result.duplicates}</span>
          </div>
        </div>
      )}

      {/* 视频列表 */}
      {videos.length > 0 && (
        <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-800 flex items-center justify-between">
            <h2 className="font-medium">导入的视频 ({videos.length})</h2>
          </div>
          <div className="divide-y divide-gray-800">
            {videos.map((v) => (
              <div key={v.id} className="px-6 py-3 flex items-center gap-4 hover:bg-gray-800/50 transition-colors">
                <div className="w-24 h-14 bg-gray-800 rounded flex items-center justify-center text-gray-600 text-xs">
                  🎬
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{v.filename}</p>
                  <p className="text-xs text-gray-500">
                    {v.camera_angle && <span className="bg-red-900/40 text-red-400 px-2 py-0.5 rounded text-xs mr-2">{v.camera_angle}</span>}
                    {v.recorded_at && new Date(v.recorded_at).toLocaleString('zh-CN')}
                  </p>
                </div>
                <div className="text-xs text-gray-500 text-right">
                  {v.file_size && (v.file_size / 1024 / 1024).toFixed(1) + ' MB'}
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
