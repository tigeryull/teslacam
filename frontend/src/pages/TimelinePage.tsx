import { useState, useEffect } from 'react'
import { api } from '../utils/api'
import type { Video, VideoGroup } from '../types'

export default function TimelinePage() {
  const [videos, setVideos] = useState<Video[]>([])
  const [groups, setGroups] = useState<VideoGroup>({})
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.listVideos().then((res: any) => {
      setVideos(res.videos || [])
      setGroups(res.groups || {})
      const dates = Object.keys(res.groups || {})
      if (dates.length > 0) setSelectedDate(dates[0])
    }).catch(console.error).finally(() => setLoading(false))
  }, [])

  const selectedVideos = selectedDate ? (groups[selectedDate] || []) : []

  return (
    <div className="p-6 max-w-7xl mx-auto h-full flex flex-col">
      <h1 className="text-2xl font-bold mb-6">🎬 时间线</h1>

      <div className="flex gap-6 flex-1 min-h-0">
        {/* 左侧日期列表 */}
        <div className="w-48 bg-gray-900 rounded-xl border border-gray-800 overflow-hidden flex flex-col">
          <div className="px-4 py-3 border-b border-gray-800 text-sm font-medium text-gray-400">日期</div>
          <div className="overflow-y-auto flex-1">
            {Object.keys(groups).sort().reverse().map((date) => (
              <button
                key={date}
                onClick={() => setSelectedDate(date)}
                className={`w-full text-left px-4 py-3 text-sm transition-colors border-l-2 ${
                  selectedDate === date
                    ? 'bg-red-600/20 border-red-500 text-red-400'
                    : 'border-transparent text-gray-400 hover:bg-gray-800 hover:text-white'
                }`}
              >
                <div>{date}</div>
                <div className="text-xs text-gray-600 mt-0.5">{groups[date]?.length || 0} 个视频</div>
              </button>
            ))}
          </div>
        </div>

        {/* 右侧视频网格 */}
        <div className="flex-1 bg-gray-900 rounded-xl border border-gray-800 overflow-hidden flex flex-col">
          <div className="px-6 py-4 border-b border-gray-800 flex items-center justify-between">
            <h2 className="font-medium">{selectedDate || '请选择日期'}</h2>
            <span className="text-sm text-gray-500">{selectedVideos.length} 个视频</span>
          </div>
          <div className="p-4 overflow-y-auto flex-1">
            {selectedVideos.length === 0 ? (
              <div className="text-gray-600 text-center py-12 text-sm">暂无视频，请先导入</div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {selectedVideos.map((v) => (
                  <div key={v.id} className="group cursor-pointer">
                    <div className="aspect-video bg-gray-800 rounded-lg flex items-center justify-center mb-2 group-hover:bg-gray-750 transition-colors border border-gray-700 group-hover:border-red-500/50">
                      <span className="text-2xl">🎬</span>
                    </div>
                    <p className="text-xs truncate text-gray-400" title={v.filename}>{v.filename}</p>
                    <div className="flex items-center gap-2 mt-1">
                      {v.camera_angle && (
                        <span className="text-xs bg-red-900/40 text-red-400 px-1.5 py-0.5 rounded text-[10px]">
                          {v.camera_angle}
                        </span>
                      )}
                      <span className="text-xs text-gray-600">
                        {v.duration ? `${Math.floor(v.duration / 60)}:${String(Math.floor(v.duration % 60)).padStart(2, '0')}` : '--'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
