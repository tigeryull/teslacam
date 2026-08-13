import { useState } from 'react'

export default function EditPage() {
  const [activeTab, setActiveTab] = useState<'crop' | 'merge' | 'rotate'>('crop')

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">✂️ 剪辑编辑</h1>

      {/* Tab 切换 */}
      <div className="flex gap-2 mb-6 bg-gray-900 rounded-xl p-1 w-fit border border-gray-800">
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

      {/* 裁剪面板 */}
      {activeTab === 'crop' && (
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-6">
          <h2 className="text-lg font-medium mb-4">时间段裁剪</h2>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm text-gray-400 mb-2">开始时间（秒）</label>
              <input type="number" step="0.1" className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-red-500" placeholder="0.0" />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-2">结束时间（秒）</label>
              <input type="number" step="0.1" className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-red-500" placeholder="0.0" />
            </div>
          </div>
          <div className="mb-4">
            <label className="block text-sm text-gray-400 mb-2">输出文件名（可选）</label>
            <input type="text" className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-red-500" placeholder="crop_output" />
          </div>
          <button className="bg-red-600 hover:bg-red-700 text-white px-6 py-2.5 rounded-lg text-sm font-medium transition-colors">
            开始裁剪
          </button>
        </div>
      )}

      {/* 拼接面板 */}
      {activeTab === 'merge' && (
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-6">
          <h2 className="text-lg font-medium mb-4">多视频拼接</h2>
          <p className="text-sm text-gray-500 mb-4">选择要拼接的视频，按顺序排列后导出</p>
          <div className="border-2 border-dashed border-gray-700 rounded-lg p-8 text-center text-gray-500 text-sm mb-4">
            从时间线选择视频进行拼接
          </div>
          <button className="bg-red-600 hover:bg-red-700 text-white px-6 py-2.5 rounded-lg text-sm font-medium transition-colors">
            开始拼接
          </button>
        </div>
      )}

      {/* 旋转面板 */}
      {activeTab === 'rotate' && (
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-6">
          <h2 className="text-lg font-medium mb-4">画面旋转</h2>
          <div className="grid grid-cols-3 gap-4 mb-4">
            {[90, 180, 270].map((deg) => (
              <button key={deg} className="bg-gray-800 hover:bg-gray-700 border border-gray-700 hover:border-red-500/50 rounded-lg py-4 text-sm text-gray-300 transition-colors">
                旋转 {deg}°
              </button>
            ))}
          </div>
          <button className="bg-red-600 hover:bg-red-700 text-white px-6 py-2.5 rounded-lg text-sm font-medium transition-colors">
            应用旋转
          </button>
        </div>
      )}
    </div>
  )
}
