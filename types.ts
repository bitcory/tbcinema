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