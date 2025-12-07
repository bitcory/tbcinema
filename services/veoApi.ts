// Gemini Veo API 서비스 - 비디오 생성용
// 참고: https://ai.google.dev/gemini-api/docs/video

export interface VeoConfig {
  model: 'veo-3.1-generate-preview' | 'veo-3.1-fast-generate-preview' | 'veo-3.0-generate-001' | 'veo-2.0-generate-001';
  aspectRatio?: '16:9' | '9:16' | '1:1';
  negativePrompt?: string;
}

export interface VideoGenerationResult {
  video: {
    uri: string;
  };
}

export interface OperationResponse {
  name: string;
  done: boolean;
  error?: {
    code: number;
    message: string;
  };
  response?: {
    generatedVideos: VideoGenerationResult[];
  };
}

export interface VideoGenerationStatus {
  status: 'idle' | 'generating' | 'polling' | 'downloading' | 'completed' | 'error';
  progress: number; // 0-100
  message: string;
  operationName?: string;
}

const DEFAULT_CONFIG: VeoConfig = {
  model: 'veo-3.1-fast-generate-preview', // 기본: 저렴하고 빠른 모델
  aspectRatio: '16:9',
};

// 모델 정보 (UI 표시용)
export const VEO_MODELS = [
  {
    id: 'veo-3.1-fast-generate-preview' as const,
    name: 'Veo 3.1 Fast',
    description: '빠르고 저렴 (기본)',
    tier: 'fast',
  },
  {
    id: 'veo-3.1-generate-preview' as const,
    name: 'Veo 3.1',
    description: '고품질',
    tier: 'standard',
  },
  {
    id: 'veo-3.0-generate-001' as const,
    name: 'Veo 3.0',
    description: '안정적 고품질',
    tier: 'standard',
  },
  {
    id: 'veo-2.0-generate-001' as const,
    name: 'Veo 2.0',
    description: '레거시',
    tier: 'legacy',
  },
] as const;

export type VeoModelId = typeof VEO_MODELS[number]['id'];

/**
 * 비디오 생성 요청 (1단계)
 */
export const generateVideo = async (
  apiKey: string,
  prompt: string,
  config: Partial<VeoConfig> = {},
  startFrameBase64?: string,
  startFrameMimeType?: string
): Promise<string> => {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };

  const baseUrl = 'https://generativelanguage.googleapis.com/v1beta/models';
  const endpoint = `${baseUrl}/${finalConfig.model}:predictLongRunning?key=${apiKey}`;

  // Request body 구성
  const instance: any = {
    prompt,
  };

  // 시작 이미지가 있으면 추가
  if (startFrameBase64 && startFrameMimeType) {
    instance.image = {
      bytesBase64Encoded: startFrameBase64,
      mimeType: startFrameMimeType,
    };
  }

  const parameters: any = {
    aspectRatio: finalConfig.aspectRatio,
  };

  if (finalConfig.negativePrompt) {
    parameters.negativePrompt = finalConfig.negativePrompt;
  }

  const requestBody = {
    instances: [instance],
    parameters,
  };

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error?.message || `API 오류: ${response.status}`);
  }

  const data = await response.json();

  if (!data.name) {
    throw new Error('Operation name을 받지 못했습니다.');
  }

  return data.name; // operation name 반환
};

/**
 * 작업 상태 확인 (2단계)
 */
export const checkVideoOperation = async (
  apiKey: string,
  operationName: string
): Promise<OperationResponse> => {
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/${operationName}?key=${apiKey}`;

  const response = await fetch(endpoint, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error?.message || `상태 확인 오류: ${response.status}`);
  }

  return response.json();
};

/**
 * 비디오 다운로드 (3단계)
 */
export const downloadVideo = async (
  apiKey: string,
  videoUri: string
): Promise<Blob> => {
  // URI에 API 키 추가
  const downloadUrl = `${videoUri}&key=${apiKey}`;

  const response = await fetch(downloadUrl);

  if (!response.ok) {
    throw new Error(`비디오 다운로드 실패: ${response.status}`);
  }

  return response.blob();
};

/**
 * 폴링으로 비디오 생성 완료 대기
 */
export const pollVideoGeneration = async (
  apiKey: string,
  operationName: string,
  onProgress?: (status: VideoGenerationStatus) => void,
  pollIntervalMs: number = 5000,
  maxAttempts: number = 60 // 5분 타임아웃 (5초 * 60)
): Promise<OperationResponse> => {
  let attempts = 0;

  while (attempts < maxAttempts) {
    attempts++;

    try {
      const result = await checkVideoOperation(apiKey, operationName);

      // 진행률 계산 (대략적)
      const progressPercent = Math.min(Math.round((attempts / maxAttempts) * 80), 80);

      if (result.done) {
        if (result.error) {
          onProgress?.({
            status: 'error',
            progress: 0,
            message: result.error.message,
            operationName,
          });
          throw new Error(result.error.message);
        }

        onProgress?.({
          status: 'completed',
          progress: 100,
          message: '비디오 생성 완료!',
          operationName,
        });

        return result;
      }

      onProgress?.({
        status: 'polling',
        progress: progressPercent,
        message: `비디오 생성 중... (${attempts}/${maxAttempts})`,
        operationName,
      });

      // 대기
      await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
    } catch (error) {
      if (error instanceof Error && !error.message.includes('상태 확인')) {
        throw error;
      }
      // 일시적 오류는 재시도
      await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
    }
  }

  throw new Error('비디오 생성 타임아웃 (5분 초과)');
};

/**
 * 전체 비디오 생성 플로우 (통합)
 */
export const generateVideoComplete = async (
  apiKey: string,
  prompt: string,
  config: Partial<VeoConfig> = {},
  startFrameBase64?: string,
  startFrameMimeType?: string,
  onProgress?: (status: VideoGenerationStatus) => void
): Promise<Blob> => {
  // 1단계: 생성 요청
  onProgress?.({
    status: 'generating',
    progress: 5,
    message: '비디오 생성 요청 중...',
  });

  const operationName = await generateVideo(
    apiKey,
    prompt,
    config,
    startFrameBase64,
    startFrameMimeType
  );

  onProgress?.({
    status: 'polling',
    progress: 10,
    message: '생성 시작됨. 대기 중...',
    operationName,
  });

  // 2단계: 폴링
  const result = await pollVideoGeneration(apiKey, operationName, onProgress);

  // 디버깅: 응답 구조 확인
  console.log('Veo API Response:', JSON.stringify(result, null, 2));

  // 응답 구조 확인 (여러 가능한 경로 체크)
  // Veo 3 응답: response.generateVideoResponse.generatedSamples[0].video.uri
  const resp = result.response as any;
  const videoUri =
    resp?.generateVideoResponse?.generatedSamples?.[0]?.video?.uri ||
    resp?.generatedVideos?.[0]?.video?.uri ||
    resp?.videos?.[0]?.uri ||
    (result as any).generatedVideos?.[0]?.video?.uri;

  if (!videoUri) {
    console.error('Full result object:', result);
    throw new Error('비디오 URI를 받지 못했습니다. 응답: ' + JSON.stringify(result).slice(0, 500));
  }

  // 3단계: 다운로드
  onProgress?.({
    status: 'downloading',
    progress: 90,
    message: '비디오 다운로드 중...',
    operationName,
  });

  const videoBlob = await downloadVideo(apiKey, videoUri);

  onProgress?.({
    status: 'completed',
    progress: 100,
    message: '완료!',
    operationName,
  });

  return videoBlob;
};
