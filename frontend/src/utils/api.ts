const API_BASE = ''

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }))
    throw new Error(err.detail || `HTTP ${res.status}`)
  }
  return res.json()
}

export const api = {
  // 导入管理 - 浏览器文件导入
  importFiles: async (files: File[], folderName: string = '') => {
    const form = new FormData()
    files.forEach(f => form.append('files', f))
    form.append('folder_name', folderName)
    const res = await fetch('/api/edit/upload', { method: 'POST', body: form })
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: res.statusText }))
      throw new Error(err.detail || `HTTP ${res.status}`)
    }
    return res.json()
  },

  // 导入管理 - 文件夹扫描（后端本地路径）
  scanFolder: (folderPath: string) => request('/folders/scan', {
    method: 'POST',
    body: JSON.stringify({ folder_path: folderPath }),
  }),
  listVideos: (dateFilter?: string, limit = 100) =>
    request(`/videos?date_filter=${dateFilter || ''}&limit=${limit}`),

  // 视频流
  getVideoStream: (id: string) => `${API_BASE}/api/videos/${id}/stream`,

  // 视频
  getVideo: (id: string) => request(`/videos/${id}`),
  deleteVideo: (id: string) => request(`/videos/${id}`, { method: 'DELETE' }),

  // 剪辑
  cropVideo: (data: {
    video_id: string; start_time: number; end_time: number;
    output_filename?: string;
    watermark_text?: string; watermark_font_size?: number;
    watermark_position?: string; watermark_font_color?: string;
  }) => request('/edit/crop', { method: 'POST', body: JSON.stringify(data) }),
  mergeVideos: (data: { video_ids: string[]; output_filename?: string }) =>
    request('/edit/merge', { method: 'POST', body: JSON.stringify(data) }),
  rotateVideo: (data: { video_id: string; degrees: number; output_filename?: string }) =>
    request('/edit/rotate', { method: 'POST', body: JSON.stringify(data) }),
  exportVideo: (data: {
    video_id: string; format?: string; resolution?: string;
    output_filename?: string;
    watermark_text?: string; watermark_font_size?: number;
    watermark_position?: string; watermark_font_color?: string;
  }) => request('/edit/export', { method: 'POST', body: JSON.stringify(data) }),

  // 导出任务
  listTasks: (limit = 50) => request(`/export/tasks?limit=${limit}`),
  getTask: (taskId: string) => request(`/export/tasks/${taskId}`),
  cancelTask: (taskId: string) => request(`/export/tasks/${taskId}`, { method: 'DELETE' }),

  // 健康检查
  health: () => request('/health'),
}
