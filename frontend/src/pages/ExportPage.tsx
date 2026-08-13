import { useState, useEffect } from 'react'
import { api } from '../utils/api'
import type { ExportTask } from '../types'

export default function ExportPage() {
  const [tasks, setTasks] = useState<ExportTask[]>([])
  const [loading, setLoading] = useState(true)

  const refreshTasks = async () => {
    try {
      const res = await api.listTasks()
      setTasks(res.tasks || [])
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    refreshTasks()
  }, [])

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">📤 导出分享</h1>
        <button onClick={refreshTasks} className="text-sm text-gray-400 hover:text-white transition-colors">
          ↻ 刷新
        </button>
      </div>

      {/* 导出配置 */}
      <div className="bg-gray-900 rounded-xl border border-gray-800 p-6 mb-6">
        <h2 className="text-lg font-medium mb-4">新建导出任务</h2>
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div>
            <label className="block text-sm text-gray-400 mb-2">格式</label>
            <select className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-red-500">
              <option value="mp4">MP4 (H.264)</option>
              <option value="mp4-h265">MP4 (H.265)</option>
              <option value="mov">MOV</option>
            </select>
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-2">分辨率</label>
            <select className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-red-500">
              <option value="original">原画</option>
              <option value="1080p">1080p</option>
              <option value="720p">720p</option>
            </select>
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-2">输出文件名</label>
            <input type="text" className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-red-500" placeholder="export_" />
          </div>
        </div>
        <button className="bg-red-600 hover:bg-red-700 text-white px-6 py-2.5 rounded-lg text-sm font-medium transition-colors">
          提交导出
        </button>
      </div>

      {/* 任务列表 */}
      <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-800">
          <h2 className="font-medium">导出任务</h2>
        </div>
        {loading ? (
          <div className="p-6 text-center text-gray-500 text-sm">加载中...</div>
        ) : tasks.length === 0 ? (
          <div className="p-6 text-center text-gray-600 text-sm">暂无导出任务</div>
        ) : (
          <div className="divide-y divide-gray-800">
            {tasks.map((task) => (
              <div key={task.id} className="px-6 py-4 flex items-center gap-4">
                <div className={`w-2 h-2 rounded-full ${
                  task.status === 'completed' ? 'bg-green-500' :
                  task.status === 'processing' ? 'bg-yellow-500 animate-pulse' :
                  task.status === 'failed' ? 'bg-red-500' : 'bg-gray-500'
                }`} />
                <div className="flex-1">
                  <p className="text-sm font-medium">{task.output_filename || '未命名导出'}</p>
                  <p className="text-xs text-gray-500">
                    {task.format?.toUpperCase()} · {task.resolution} · {task.status}
                  </p>
                </div>
                {task.status === 'processing' && (
                  <div className="w-32 bg-gray-800 rounded-full h-1.5">
                    <div className="bg-red-500 h-1.5 rounded-full transition-all" style={{ width: `${task.progress || 0}%` }} />
                  </div>
                )}
                {task.status === 'completed' && task.output_path && (
                  <button className="text-sm text-red-400 hover:text-red-300 transition-colors">
                    下载
                  </button>
                )}
                {task.status === 'pending' && (
                  <button
                    onClick={() => api.cancelTask(task.id)}
                    className="text-sm text-gray-500 hover:text-red-400 transition-colors"
                  >
                    取消
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
