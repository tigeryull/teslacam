export interface Video {
  id: string
  filename: string
  filepath: string
  folder_name?: string
  camera_angle?: string
  duration?: number
  file_size?: number
  resolution?: string
  recorded_at?: string
  imported_at?: string
  thumbnail_path?: string
}

export interface VideoGroup {
  [date: string]: Video[]
}

export interface VideoListResponse {
  videos: Video[]
  total: number
  groups: VideoGroup
}

export interface ImportResult {
  imported: number
  skipped: number
  duplicates: number
  videos: Video[]
}

export interface ExportTask {
  id: string
  video_id?: string
  video_ids?: string[]
  format: string
  resolution: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  progress: number
  output_path?: string
  output_filename?: string
  created_at?: string
  completed_at?: string
}
