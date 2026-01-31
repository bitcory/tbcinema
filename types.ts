export interface ProjectMeta {
  title: string;
  logline: string;
  duration?: string;
  aspect_ratio?: string;
  theme?: string;
}

export interface Prompts {
  image_gen: string;
  video_gen: string;
}

export interface Assets {
  image_url?: string;
  video_url?: string;
}

export interface StoryboardShot {
  kf_id: string | number;
  shot_type: string;
  visual_description: string;
  assets?: Assets;
  prompts?: Prompts;
}

export interface StoryboardData {
  project_meta: ProjectMeta;
  storyboard_sequence: StoryboardShot[];
  reference_image?: string; // Base64 Data URL
}

// 비디오 생성 관련 타입
export interface VideoGenerationStatus {
  status: 'idle' | 'generating' | 'polling' | 'downloading' | 'completed' | 'error';
  progress: number; // 0-100
  message: string;
  operationName?: string;
}

export interface GeneratedVideo {
  blobUrl: string; // Object URL (메모리)
  thumbnailUrl?: string; // 썸네일 Object URL
  createdAt: number;
}

export interface VideoConfig {
  model: 'veo-3.0-generate-preview' | 'veo-3.0-generate';
  aspectRatio: '16:9' | '9:16' | '1:1';
  durationSeconds: number;
}