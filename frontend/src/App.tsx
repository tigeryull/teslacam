import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom'
import { useState } from 'react'

// Pages
import ImportPage from './pages/ImportPage'
import TimelinePage from './pages/TimelinePage'
import EditPage from './pages/EditPage'
import ExportPage from './pages/ExportPage'

function App() {
  const [sidebarOpen, setSidebarOpen] = useState(true)

  const navItems = [
    { path: '/', label: '📁 导入管理', exact: true },
    { path: '/timeline', label: '🎬 时间线', exact: false },
    { path: '/edit', label: '✂️ 剪辑编辑', exact: false },
    { path: '/export', label: '📤 导出分享', exact: false },
  ]

  return (
    <BrowserRouter>
      <div className="flex h-screen overflow-hidden">
        {/* 侧边栏 */}
        <aside className={`${sidebarOpen ? 'w-56' : 'w-16'} bg-gray-900 border-r border-gray-800 flex flex-col transition-all duration-200`}>
          <div className="p-4 flex items-center justify-between border-b border-gray-800">
            {sidebarOpen && (
              <div className="flex items-center gap-2">
                <span className="text-red-500 text-xl">⚡</span>
                <span className="font-bold text-lg tracking-tight">Teslacam</span>
              </div>
            )}
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-1.5 rounded hover:bg-gray-800 transition-colors"
            >
              {sidebarOpen ? '◀' : '▶'}
            </button>
          </div>

          <nav className="flex-1 py-4">
            {navItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.exact}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-4 py-3 text-sm transition-colors ${
                    isActive
                      ? 'bg-red-600/20 text-red-400 border-r-2 border-red-500'
                      : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                  } ${!sidebarOpen ? 'justify-center' : ''}`
                }
              >
                <span className="text-base">{item.label.split(' ')[0]}</span>
                {sidebarOpen && <span>{item.label.split(' ').slice(1).join(' ')}</span>}
              </NavLink>
            ))}
          </nav>

          <div className="p-4 border-t border-gray-800">
            {sidebarOpen && (
              <p className="text-xs text-gray-600 text-center">v0.1.0 · 本地模式</p>
            )}
          </div>
        </aside>

        {/* 主内容区 */}
        <main className="flex-1 overflow-auto bg-tesla-dark">
          <Routes>
            <Route path="/" element={<ImportPage />} />
            <Route path="/timeline" element={<TimelinePage />} />
            <Route path="/edit" element={<EditPage />} />
            <Route path="/export" element={<ExportPage />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  )
}

export default App
