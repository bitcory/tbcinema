import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { House, SquaresFour, VideoCamera as VideoIcon, ArrowClockwise, HardDrives, Database, DownloadSimple, Sparkle, CircleNotch, Image as ImageIconPhosphor, FilmSlate, Article, Copy, Check } from 'phosphor-react';
import { StoryboardData, VideoGenerationStatus } from '../types';
import StoryboardCard from './StoryboardCard';
import VideoCard from './VideoCard';
import ImageModal from './ImageModal';
import VideoModal from './VideoModal';
import { GoogleGenAI } from "@google/genai";
import JSZip from 'jszip';
import { generateVideoComplete, VeoConfig, VeoModelId } from '../services/veoApi';
import { setBlob, getBlob, generateThumbnail } from '../utils/indexedDB';

interface OutputSectionProps {
  data: StoryboardData;
  apiKey: string;
  onReset: () => void;
  onCopyToast: (msg: string) => void;
  generatedImages: Record<number, string>;
  onImagesUpdate: (imagesOrUpdater: Record<number, string> | ((prev: Record<number, string>) => Record<number, string>)) => void;
  videoUrls: Record<number, string>;
  onVideosUpdate: (videos: Record<number, string>) => void;
}

const OutputSection: React.FC<OutputSectionProps> = ({
  data,
  apiKey,
  onReset,
  onCopyToast,
  generatedImages,
  onImagesUpdate,
  videoUrls,
  onVideosUpdate,
}) => {
  const { project_meta, storyboard_sequence, reference_image } = data;

  // File input ref for restore
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Tab State
  const [activeTab, setActiveTab] = useState<'storyboard' | 'videos' | 'scenario'>('storyboard');

  // Local generating status (이미지)
  const [generatingStatus, setGeneratingStatus] = useState<Record<number, boolean>>({});
  const [isGlobalGenerating, setIsGlobalGenerating] = useState(false);
  const [isZipping, setIsZipping] = useState(false);

  // 비디오 생성 상태
  const [videoGenerationStatus, setVideoGenerationStatus] = useState<Record<number, VideoGenerationStatus>>({});
  const abortControllersRef = useRef<Record<number, AbortController>>({});

  // 비디오 모델 선택 상태 (각 샷별로 관리)
  const [selectedModels, setSelectedModels] = useState<Record<number, VeoModelId>>({});

  // Image Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null);

  // Video Modal State
  const [videoModalOpen, setVideoModalOpen] = useState(false);
  const [selectedVideoIndex, setSelectedVideoIndex] = useState<number | null>(null);

  // Scenario copy state
  const [scenarioCopied, setScenarioCopied] = useState(false);

  // Narration generation state
  const [narrations, setNarrations] = useState<Record<number, string>>({});
  const [isGeneratingNarration, setIsGeneratingNarration] = useState(false);
  const [narrationCopied, setNarrationCopied] = useState(false);

  // Initialize Video URLs from JSON (only if not already set)
  useEffect(() => {
    const hasExistingVideos = Object.keys(videoUrls).length > 0;
    if (!hasExistingVideos) {
      const initialVideos: Record<number, string> = {};
      storyboard_sequence.forEach((shot, index) => {
        if (shot.assets?.video_url) {
          initialVideos[index] = shot.assets.video_url;
        }
      });
      if (Object.keys(initialVideos).length > 0) {
        onVideosUpdate(initialVideos);
      }
    }
  }, [storyboard_sequence]);

  // Generate narrations for all shots
  const generateNarrations = async () => {
    if (!apiKey) {
      onCopyToast("API 키가 설정되지 않았습니다.");
      return;
    }

    setIsGeneratingNarration(true);

    try {
      const ai = new GoogleGenAI({ apiKey: apiKey });

      const scenarioText = storyboard_sequence
        .map((shot, idx) => `신 ${idx + 1}: ${shot.visual_description || '장면 설명 없음'}`)
        .join('\n\n');

      const promptText = `다음은 영화 시나리오의 장면 설명입니다. 각 신마다 간략하고 임팩트 있는 나레이션을 작성해주세요.
각 나레이션은 1-2문장으로 짧고 강렬하게 작성하며, 감정과 분위기를 전달해야 합니다.

시나리오:
${scenarioText}

응답 형식:
각 신 번호와 나레이션을 다음과 같이 작성해주세요:
신1: [나레이션]
신2: [나레이션]
...`;

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: { parts: [{ text: promptText }] },
      });

      const text = response.candidates?.[0]?.content?.parts?.[0]?.text || '';

      // Parse narrations
      const newNarrations: Record<number, string> = {};
      const lines = text.split('\n').filter(line => line.trim());

      lines.forEach(line => {
        const match = line.match(/^신\s*(\d+)\s*[:：]\s*(.+)$/);
        if (match) {
          const shotIndex = parseInt(match[1], 10) - 1;
          let narration = match[2].trim();
          // Remove brackets, quotes, and other formatting
          narration = narration.replace(/[\[\]"「」『』]/g, '').trim();
          if (shotIndex >= 0 && shotIndex < storyboard_sequence.length) {
            newNarrations[shotIndex] = narration;
          }
        }
      });

      setNarrations(newNarrations);
      onCopyToast(`나레이션 ${Object.keys(newNarrations).length}개 생성 완료!`);
    } catch (error) {
      console.error('Narration generation failed:', error);
      onCopyToast(`나레이션 생성 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
    } finally {
      setIsGeneratingNarration(false);
    }
  };

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    onCopyToast(`${label} 복사됨!`);
  };

  const handleSaveVideoUrl = (index: number, url: string) => {
    onVideosUpdate({ ...videoUrls, [index]: url });
    onCopyToast("동영상 URL 저장됨");
  };

  // 비디오 생성 함수
  const generateVideoForShot = async (index: number, model: VeoModelId = 'veo-3.1-fast-generate-preview') => {
    const shot = storyboard_sequence[index];
    const prompt = shot.prompts?.video_gen;
    const startImage = generatedImages[index];

    if (!prompt && !startImage) {
      onCopyToast("비디오 프롬프트 또는 시작 이미지가 필요합니다.");
      return;
    }

    if (!apiKey) {
      onCopyToast("API 키가 설정되지 않았습니다.");
      return;
    }

    // 상태 초기화
    setVideoGenerationStatus(prev => ({
      ...prev,
      [index]: { status: 'generating', progress: 0, message: '비디오 생성 준비 중...' }
    }));

    try {
      // 시작 이미지 처리
      let startFrameBase64: string | undefined;
      let startFrameMimeType: string | undefined;

      if (startImage) {
        // data:image/png;base64,xxxx 형식에서 추출
        const match = startImage.match(/^data:([^;]+);base64,(.+)$/);
        if (match) {
          startFrameMimeType = match[1];
          startFrameBase64 = match[2];
        }
      }

      // 비디오 생성 설정 (선택된 모델 사용)
      const config: Partial<VeoConfig> = {
        model: model,
        aspectRatio: '16:9',
      };

      // 비디오 생성 실행
      const videoBlob = await generateVideoComplete(
        apiKey,
        prompt || 'Generate a cinematic video based on the provided image',
        config,
        startFrameBase64,
        startFrameMimeType,
        (status) => {
          setVideoGenerationStatus(prev => ({ ...prev, [index]: status }));
        }
      );

      // IndexedDB에 저장
      const videoId = `video_${index}`;
      await setBlob(videoId, videoBlob);

      // 썸네일 생성 및 저장
      try {
        const thumbnailBlob = await generateThumbnail(videoBlob);
        await setBlob(`thumbnail_${index}`, thumbnailBlob);
      } catch (e) {
        console.warn('썸네일 생성 실패:', e);
      }

      // Object URL 생성하여 상태 업데이트
      const videoUrl = URL.createObjectURL(videoBlob);
      onVideosUpdate({ ...videoUrls, [index]: videoUrl });

      setVideoGenerationStatus(prev => ({
        ...prev,
        [index]: { status: 'completed', progress: 100, message: '완료!' }
      }));

      onCopyToast(`#${shot.kf_id} 비디오 생성 완료!`);

    } catch (error) {
      console.error(`Video generation failed for shot ${index}:`, error);
      setVideoGenerationStatus(prev => ({
        ...prev,
        [index]: {
          status: 'error',
          progress: 0,
          message: error instanceof Error ? error.message : '알 수 없는 오류'
        }
      }));
      onCopyToast(`#${shot.kf_id} 비디오 생성 실패: ${error instanceof Error ? error.message : '오류'}`);
    }
  };

  // 비디오 생성 취소
  const cancelVideoGeneration = (index: number) => {
    // 현재는 간단히 상태만 리셋 (실제 API 취소는 미지원)
    setVideoGenerationStatus(prev => ({
      ...prev,
      [index]: { status: 'idle', progress: 0, message: '' }
    }));
    onCopyToast("비디오 생성이 취소되었습니다.");
  };

  // 비디오 프롬프트 업데이트
  const handleUpdateVideoPrompt = (index: number, prompt: string) => {
    // storyboard_sequence의 해당 shot의 prompts.video_gen을 업데이트
    // data는 props로 받아온 것이므로 로컬 상태로 관리 필요
    storyboard_sequence[index].prompts = {
      ...storyboard_sequence[index].prompts,
      video_gen: prompt,
    };
  };

  // 장면 설명 업데이트
  const handleUpdateDescription = (index: number, description: string) => {
    storyboard_sequence[index].visual_description = description;
  };

  // Generalized Image Generation Logic
  const generateImageForShot = async (index: number, customPrompt?: string) => {
    const shot = storyboard_sequence[index];
    const promptToUse = customPrompt || shot.prompts?.image_gen;
    
    if (!promptToUse) return;

    setGeneratingStatus(prev => ({ ...prev, [index]: true }));

    try {
        // Explicitly use the user provided key, do NOT fallback to env variable as requested
        const keyToUse = apiKey;
        
        if (!keyToUse) {
            throw new Error("API 키가 설정되지 않았습니다. 메인 화면으로 돌아가서 키를 설정해주세요.");
        }

        const ai = new GoogleGenAI({ apiKey: keyToUse });
        
        // Construct parts
        const parts: any[] = [];
        
        // Add reference image if available
        if (reference_image) {
            const base64Data = reference_image.split(',')[1];
            const mimeType = reference_image.substring(reference_image.indexOf(':') + 1, reference_image.indexOf(';'));
            
            parts.push({
                inlineData: {
                    mimeType: mimeType,
                    data: base64Data
                }
            });
            
            // Add a text instruction to use the reference
            parts.push({ text: "Using the attached image as a style and character reference, generate the following scene:" });
        }

        parts.push({ text: promptToUse });

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: { parts },
            config: {
                imageConfig: {
                    aspectRatio: "16:9"
                }
            }
        });

        if (response.candidates?.[0]?.content?.parts) {
            for (const part of response.candidates[0].content.parts) {
                if (part.inlineData && part.inlineData.data) {
                    const base64Image = `data:${part.inlineData.mimeType || 'image/png'};base64,${part.inlineData.data}`;
                    // Use callback to get latest state and avoid stale closure issue
                    onImagesUpdate(prev => ({ ...prev, [index]: base64Image }));
                    break;
                }
            }
        }
    } catch (error) {
        console.error(`Generation failed for shot ${index}:`, error);
        onCopyToast(`#${shot.kf_id} 생성 실패: ${error instanceof Error ? error.message : "알 수 없는 오류"}`);
    } finally {
        setGeneratingStatus(prev => ({ ...prev, [index]: false }));
    }
  };

  // Global Image Generation
  const handleGenerateAllImages = async () => {
    // Fail fast if no API key
    if (!apiKey) {
        onCopyToast("오류: API 키가 설정되지 않았습니다.");
        return;
    }

    setIsGlobalGenerating(true);
    const batchSize = 3;
    const indices = storyboard_sequence.map((_, i) => i).filter(i => !generatedImages[i]);

    for (let i = 0; i < indices.length; i += batchSize) {
        const batch = indices.slice(i, i + batchSize);
        await Promise.all(batch.map(idx => generateImageForShot(idx)));
    }
    
    setIsGlobalGenerating(false);
    onCopyToast("모든 이미지 생성 완료!");
  };

  // Download All Images
  const handleDownloadAllImages = async () => {
    const keys = Object.keys(generatedImages);
    if (keys.length === 0) {
        onCopyToast("다운로드할 이미지가 없습니다.");
        return;
    }

    setIsZipping(true);
    try {
        const zip = new JSZip();
        const folder = zip.folder(`storyboard-images-${project_meta.title.replace(/\s+/g, '-').toLowerCase()}`);
        
        if (folder) {
            keys.forEach(keyStr => {
                const idx = parseInt(keyStr);
                const dataUrl = generatedImages[idx];
                const shot = storyboard_sequence[idx];
                const filename = `shot-${shot.kf_id}.png`;
                const base64Data = dataUrl.split(',')[1];
                folder.file(filename, base64Data, { base64: true });
            });

            const content = await zip.generateAsync({ type: 'blob' });
            triggerDownload(content, `${project_meta.title}-images.zip`);
            onCopyToast("다운로드 시작!");
        }
    } catch (e) {
        console.error("Zip failed", e);
        onCopyToast("ZIP 파일 생성 실패.");
    } finally {
        setIsZipping(false);
    }
  };

  // Download All Videos
  const handleDownloadAllVideos = async () => {
    const validIndices = Object.keys(videoUrls);
    if (validIndices.length === 0) {
        onCopyToast("다운로드할 동영상이 없습니다.");
        return;
    }

    setIsZipping(true);
    try {
        const zip = new JSZip();
        const folder = zip.folder(`storyboard-videos-${project_meta.title.replace(/\s+/g, '-').toLowerCase()}`);

        if (folder) {
            const fetchPromises = validIndices.map(async (keyStr) => {
                const idx = parseInt(keyStr);
                const url = videoUrls[idx];
                const shot = storyboard_sequence[idx];
                
                try {
                    const response = await fetch(url);
                    if (!response.ok) throw new Error("Network response was not ok");
                    const blob = await response.blob();
                    const ext = url.split('.').pop()?.split('?')[0] || 'mp4';
                    folder.file(`shot-${shot.kf_id}.${ext}`, blob);
                } catch (err) {
                    console.warn(`Failed to fetch video for shot ${shot.kf_id}`, err);
                    // Just skip it or add a text file note
                    folder.file(`shot-${shot.kf_id}-error.txt`, `Failed to download: ${url}`);
                }
            });

            await Promise.all(fetchPromises);
            
            const content = await zip.generateAsync({ type: 'blob' });
            triggerDownload(content, `${project_meta.title}-videos.zip`);
            onCopyToast("동영상 다운로드 완료!");
        }
    } catch (e) {
        console.error("Video zip failed", e);
        onCopyToast("동영상 압축 실패. CORS/네트워크를 확인하세요.");
    } finally {
        setIsZipping(false);
    }
  };

  const triggerDownload = (blob: Blob, filename: string) => {
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      link.click();
      window.URL.revokeObjectURL(url);
  };

  // Blob URL을 Base64로 변환
  const blobUrlToBase64 = async (blobUrl: string): Promise<string | null> => {
    try {
      // 이미 data: URL이면 그대로 반환
      if (blobUrl.startsWith('data:')) {
        return blobUrl;
      }

      // blob: URL인 경우 변환
      if (blobUrl.startsWith('blob:')) {
        const response = await fetch(blobUrl);
        if (!response.ok) {
          console.warn('Blob fetch 실패:', blobUrl);
          return null;
        }
        const blob = await response.blob();
        return new Promise((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            const result = reader.result as string;
            console.log('Blob -> Base64 변환 성공, 길이:', result.length);
            resolve(result);
          };
          reader.onerror = () => {
            console.warn('FileReader 오류');
            resolve(null);
          };
          reader.readAsDataURL(blob);
        });
      }

      // 일반 URL (http/https)은 그대로 반환
      return blobUrl;
    } catch (e) {
      console.warn('Blob URL 변환 실패:', blobUrl, e);
      return null;
    }
  };

  // Backup: Download all data as JSON (비디오를 Base64로 변환)
  const handleBackupData = async () => {
    const videoCount = Object.keys(videoUrls).length;
    if (videoCount === 0) {
      // 비디오가 없어도 백업 진행
      const backupData = {
        version: '1.1',
        timestamp: new Date().toISOString(),
        data: data,
        generatedImages: generatedImages,
        videoBase64: {},
      };
      const jsonString = JSON.stringify(backupData, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const filename = `storyboard-backup-${project_meta.title.replace(/\s+/g, '-').toLowerCase()}-${new Date().toISOString().slice(0, 10)}.json`;
      triggerDownload(blob, filename);
      onCopyToast('백업 파일 다운로드 완료!');
      return;
    }

    onCopyToast(`비디오 ${videoCount}개 변환 중...`);

    // 비디오 URL들을 Base64로 변환
    const videoBase64: Record<number, string> = {};
    let converted = 0;

    for (const [key, url] of Object.entries(videoUrls)) {
      const urlString = url as string;
      console.log(`비디오 ${key} 변환 시작:`, urlString.substring(0, 50));
      const base64 = await blobUrlToBase64(urlString);
      if (base64) {
        videoBase64[parseInt(key, 10)] = base64;
        converted++;
        console.log(`비디오 ${key} 변환 완료`);
      } else {
        console.warn(`비디오 ${key} 변환 실패`);
      }
    }

    const backupData = {
      version: '1.1',
      timestamp: new Date().toISOString(),
      data: data,
      generatedImages: generatedImages,
      videoBase64: videoBase64,
    };

    const jsonString = JSON.stringify(backupData, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const filename = `storyboard-backup-${project_meta.title.replace(/\s+/g, '-').toLowerCase()}-${new Date().toISOString().slice(0, 10)}.json`;
    triggerDownload(blob, filename);
    onCopyToast(`백업 완료! (비디오 ${converted}/${videoCount}개 저장됨)`);
  };

  // Base64 Data URL을 Blob URL로 변환
  const base64ToBlobUrl = (base64: string): string => {
    try {
      // 이미 blob: URL이면 그대로 반환 (호환성 - 하지만 작동 안 할 수 있음)
      if (base64.startsWith('blob:')) {
        console.warn('blob: URL은 복원 불가:', base64.substring(0, 50));
        return ''; // blob URL은 세션 종료 후 무효
      }

      // http/https URL은 그대로 반환
      if (base64.startsWith('http://') || base64.startsWith('https://')) {
        return base64;
      }

      // data: URL이 아니면 빈 값 반환
      if (!base64.startsWith('data:')) {
        console.warn('알 수 없는 URL 형식:', base64.substring(0, 50));
        return '';
      }

      console.log('Base64 -> Blob URL 변환 시작, 데이터 길이:', base64.length);

      const [header, data] = base64.split(',');
      const mimeMatch = header.match(/data:([^;]+)/);
      const mimeType = mimeMatch ? mimeMatch[1] : 'video/mp4';

      const byteCharacters = atob(data);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: mimeType });

      const blobUrl = URL.createObjectURL(blob);
      console.log('Base64 -> Blob URL 변환 성공:', blobUrl);
      return blobUrl;
    } catch (e) {
      console.error('Base64 변환 실패:', e);
      return '';
    }
  };

  // Restore: Upload and restore data from JSON
  const handleRestoreData = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    onCopyToast('백업 파일 읽는 중...');

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const backupData = JSON.parse(content);

        console.log('백업 파일 버전:', backupData.version);
        console.log('백업 시간:', backupData.timestamp);

        if (!backupData.data || !backupData.data.storyboard_sequence) {
          throw new Error('유효하지 않은 백업 파일입니다.');
        }

        // Restore images (키를 숫자로 변환)
        if (backupData.generatedImages) {
          const numericImages: Record<number, string> = {};
          Object.entries(backupData.generatedImages).forEach(([key, value]) => {
            numericImages[parseInt(key, 10)] = value as string;
          });
          onImagesUpdate(numericImages);
          console.log('이미지 복원:', Object.keys(numericImages).length, '개');
        }

        // Restore video URLs - v1.1 (videoBase64) 또는 v1.0 (videoUrls) 지원
        const videoSource = backupData.videoBase64 || backupData.videoUrls;
        if (videoSource && Object.keys(videoSource).length > 0) {
          const numericVideos: Record<number, string> = {};
          let restoredCount = 0;

          Object.entries(videoSource).forEach(([key, value]) => {
            const url = value as string;
            console.log(`비디오 ${key} 복원 시도, 타입:`, url.substring(0, 30));

            // Base64 data URL이면 Blob URL로 변환
            const blobUrl = base64ToBlobUrl(url);
            if (blobUrl) {
              numericVideos[parseInt(key, 10)] = blobUrl;
              restoredCount++;
            }
          });

          if (restoredCount > 0) {
            onVideosUpdate(numericVideos);
            console.log('비디오 복원:', restoredCount, '개');
          }

          onCopyToast(`복원 완료! (비디오 ${restoredCount}개)`);
        } else {
          onCopyToast('백업 데이터 복원 완료! (비디오 없음)');
        }
      } catch (err) {
        console.error('Restore failed:', err);
        onCopyToast('백업 파일 복원 실패. 파일 형식을 확인해주세요.');
      }
    };
    reader.readAsText(file);

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const openModal = (index: number) => {
    setSelectedImageIndex(index);
    setModalOpen(true);
  };

  const handleModalRegenerate = async (newPrompt: string) => {
    if (selectedImageIndex !== null) {
      await generateImageForShot(selectedImageIndex, newPrompt);
    }
  };

  const openVideoModal = (index: number) => {
    setSelectedVideoIndex(index);
    setVideoModalOpen(true);
  };

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Sidebar */}
      <div className="fixed left-0 top-0 h-full w-16 bg-gradient-to-b from-zinc-950 via-zinc-950 to-zinc-900 border-r border-zinc-800/50 flex flex-col items-center py-4 z-50 shadow-2xl">
        {/* Logo / Home */}
        <button
          onClick={onReset}
          className="p-3 rounded-xl hover:bg-gradient-to-br hover:from-indigo-600/20 hover:to-purple-600/20 text-zinc-400 hover:text-white transition-all duration-300 mb-6 group"
          title="START - 에디터로 돌아가기"
        >
          <House size={24} weight="duotone" className="group-hover:scale-110 transition-transform" />
        </button>

        {/* Navigation */}
        <div className="flex flex-col items-center gap-3">
          <button
            onClick={() => setActiveTab('storyboard')}
            className={`p-3 rounded-xl transition-all duration-300 ${
              activeTab === 'storyboard'
                ? 'bg-gradient-to-br from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-900/50 scale-105'
                : 'hover:bg-zinc-900 text-zinc-500 hover:text-zinc-300 hover:scale-105'
            }`}
            title="스토리보드"
          >
            <SquaresFour size={22} weight={activeTab === 'storyboard' ? 'fill' : 'regular'} />
          </button>
          <button
            onClick={() => setActiveTab('videos')}
            className={`p-3 rounded-xl transition-all duration-300 ${
              activeTab === 'videos'
                ? 'bg-gradient-to-br from-purple-600 to-pink-600 text-white shadow-lg shadow-purple-900/50 scale-105'
                : 'hover:bg-zinc-900 text-zinc-500 hover:text-zinc-300 hover:scale-105'
            }`}
            title="비디오"
          >
            <VideoIcon size={22} weight={activeTab === 'videos' ? 'fill' : 'regular'} />
          </button>
          <button
            onClick={() => setActiveTab('scenario')}
            className={`p-3 rounded-xl transition-all duration-300 ${
              activeTab === 'scenario'
                ? 'bg-gradient-to-br from-emerald-600 to-teal-600 text-white shadow-lg shadow-emerald-900/50 scale-105'
                : 'hover:bg-zinc-900 text-zinc-500 hover:text-zinc-300 hover:scale-105'
            }`}
            title="시나리오"
          >
            <Article size={22} weight={activeTab === 'scenario' ? 'fill' : 'regular'} />
          </button>
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Shot Count */}
        <div className="mb-4 text-center">
          <div className="text-lg font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
            {storyboard_sequence.length}
          </div>
          <div className="text-[10px] text-zinc-600 font-semibold tracking-wider">SHOTS</div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 ml-16">
        {/* Top Header */}
        <div className="sticky top-0 z-40 bg-zinc-950/80 backdrop-blur-xl border-b border-zinc-800">
          <div className="w-full px-4 md:px-8 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div>
                <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
                  {project_meta.title}
                </h2>
                <div className="flex items-center gap-2 mt-1">
                  <p className="text-sm text-zinc-400 line-clamp-1 max-w-md">
                    {project_meta.logline}
                  </p>
                  {reference_image && (
                    <div className="flex items-center gap-1 px-2 py-0.5 rounded bg-zinc-800/50 border border-zinc-700 text-[10px] text-zinc-400">
                      <ImageIconPhosphor size={10} weight="fill" />
                      참조 이미지 사용 중
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Refresh / Backup / Restore Buttons */}
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => {
                    // 이미지와 비디오 상태 초기화 후 다시 불러오기
                    onImagesUpdate({});
                    onVideosUpdate({});
                    // JSON 데이터에서 비디오 URL 다시 로드
                    const initialVideos: Record<number, string> = {};
                    storyboard_sequence.forEach((shot, index) => {
                      if (shot.assets?.video_url) {
                        initialVideos[index] = shot.assets.video_url;
                      }
                    });
                    if (Object.keys(initialVideos).length > 0) {
                      onVideosUpdate(initialVideos);
                    }
                    onCopyToast('이미지 & 비디오 새로고침 완료!');
                  }}
                  className="p-2 rounded-lg hover:bg-gradient-to-br hover:from-yellow-600/20 hover:to-orange-600/20 text-zinc-400 hover:text-yellow-400 transition-all duration-300 group"
                  title="이미지 & 비디오 새로고침"
                >
                  <ArrowClockwise size={20} weight="bold" className="group-hover:rotate-180 transition-transform duration-500" />
                </button>
                <button
                  onClick={handleBackupData}
                  className="p-2 rounded-lg hover:bg-gradient-to-br hover:from-emerald-600/20 hover:to-green-600/20 text-zinc-400 hover:text-emerald-400 transition-all duration-300 group"
                  title="전체 데이터 백업 (JSON 다운로드)"
                >
                  <HardDrives size={20} weight="duotone" className="group-hover:scale-110 transition-transform" />
                </button>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="p-2 rounded-lg hover:bg-gradient-to-br hover:from-blue-600/20 hover:to-indigo-600/20 text-zinc-400 hover:text-blue-400 transition-all duration-300 group"
                  title="백업 데이터 복원 (JSON 업로드)"
                >
                  <Database size={20} weight="duotone" className="group-hover:scale-110 transition-transform" />
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json"
                  onChange={handleRestoreData}
                  className="hidden"
                />
              </div>

              {/* Global Actions Contextual */}
              <div className="flex items-center gap-2 border-l border-zinc-800/50 pl-4">
                {activeTab === 'storyboard' ? (
                  <>
                    <button
                      onClick={handleGenerateAllImages}
                      disabled={isGlobalGenerating}
                      className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-semibold transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap shadow-lg shadow-indigo-900/30 hover:scale-105 active:scale-95"
                    >
                      {isGlobalGenerating ? (
                        <CircleNotch size={14} weight="bold" className="animate-spin" />
                      ) : (
                        <Sparkle size={14} weight="duotone" />
                      )}
                      전체 생성
                    </button>
                    <button
                      onClick={handleDownloadAllImages}
                      disabled={isZipping || Object.keys(generatedImages).length === 0}
                      className="flex items-center gap-2 px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap hover:scale-105 active:scale-95"
                    >
                      {isZipping ? (
                        <CircleNotch size={14} weight="bold" className="animate-spin" />
                      ) : (
                        <DownloadSimple size={14} weight="bold" />
                      )}
                      이미지 다운로드
                    </button>
                  </>
                ) : activeTab === 'videos' ? (
                  <button
                    onClick={handleDownloadAllVideos}
                    disabled={isZipping || Object.keys(videoUrls).length === 0}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap hover:scale-105 active:scale-95"
                  >
                    {isZipping ? (
                      <CircleNotch size={14} weight="bold" className="animate-spin" />
                    ) : (
                      <DownloadSimple size={14} weight="bold" />
                    )}
                    동영상 다운로드
                  </button>
                ) : null}
              </div>
            </div>
          </div>
        </div>

        {/* Grid Content */}
        <main className="w-full px-4 md:px-8 py-8 pb-20">
          <AnimatePresence mode="wait">
            {activeTab === 'storyboard' ? (
              <motion.div
                key="storyboard"
                variants={container}
                initial="hidden"
                animate="show"
                exit={{ opacity: 0, y: -20 }}
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
              >
                {storyboard_sequence.map((shot, idx) => (
                  <motion.div key={idx} variants={item}>
                    <StoryboardCard
                      shot={shot}
                      index={idx}
                      onCopy={handleCopy}
                      generatedImage={generatedImages[idx]}
                      isGenerating={generatingStatus[idx]}
                      onGenerate={() => generateImageForShot(idx)}
                      onExpand={() => openModal(idx)}
                    />
                  </motion.div>
                ))}
              </motion.div>
            ) : activeTab === 'videos' ? (
              <motion.div
                key="videos"
                variants={container}
                initial="hidden"
                animate="show"
                exit={{ opacity: 0, y: -20 }}
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
              >
                {storyboard_sequence.map((shot, idx) => (
                  <motion.div key={idx} variants={item}>
                    <VideoCard
                      shot={shot}
                      index={idx}
                      savedUrl={videoUrls[idx]}
                      generatedImage={generatedImages[idx]}
                      generationStatus={videoGenerationStatus[idx]}
                      onGenerateVideo={(model) => generateVideoForShot(idx, model)}
                      selectedModel={selectedModels[idx] || 'veo-3.1-fast-generate-preview'}
                      onExpand={() => openVideoModal(idx)}
                    />
                  </motion.div>
                ))}
              </motion.div>
            ) : (
              <motion.div
                key="scenario"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="w-full"
              >
                <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto_1fr] gap-0 max-h-[calc(100vh-200px)]">
                  {/* Left: Scenario */}
                  <div className="bg-zinc-900/60 backdrop-blur-xl rounded-l-2xl border border-zinc-800/50 overflow-hidden shadow-2xl">
                    <div className="p-6 border-b border-zinc-800 bg-gradient-to-br from-zinc-900/80 to-zinc-950/80">
                      <div className="flex items-start justify-between">
                        <div>
                          <h2 className="text-2xl font-bold text-zinc-100 flex items-center gap-3">
                            <Article size={28} weight="duotone" className="text-emerald-400" />
                            시나리오
                          </h2>
                          <p className="text-sm text-zinc-500 mt-2">{project_meta.title}</p>
                        </div>
                        <button
                          onClick={() => {
                            const scenarioText = storyboard_sequence
                              .map((shot) => shot.visual_description || '장면 설명이 없습니다.')
                              .join(' ');
                            navigator.clipboard.writeText(scenarioText);
                            setScenarioCopied(true);
                            setTimeout(() => setScenarioCopied(false), 2000);
                            onCopyToast('시나리오 전체 복사됨');
                          }}
                          className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-300 ${
                            scenarioCopied
                              ? 'bg-emerald-600/20 text-emerald-400'
                              : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white'
                          }`}
                          title="전체 시나리오 복사"
                        >
                          {scenarioCopied ? (
                            <>
                              <Check size={18} weight="bold" />
                              <span className="text-sm font-semibold">복사됨</span>
                            </>
                          ) : (
                            <>
                              <Copy size={18} />
                              <span className="text-sm font-semibold">전체 복사</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>

                    <div className="p-8 h-[calc(100%-88px)] overflow-y-auto">
                      <div className="space-y-6">
                        {storyboard_sequence.map((shot, idx) => (
                          <div key={idx}>
                            <p className="text-zinc-300 text-lg leading-relaxed whitespace-pre-line break-keep">
                              <span className="inline-block px-2.5 py-0.5 mr-2 rounded-md bg-gradient-to-br from-emerald-600 to-teal-600 text-white text-sm font-bold">
                                #{shot.kf_id}
                              </span>
                              <span className="text-zinc-500 text-sm uppercase tracking-wider mr-3">
                                {shot.shot_type}
                              </span>
                              {shot.visual_description || '장면 설명이 없습니다.'}
                            </p>
                            {idx < storyboard_sequence.length - 1 && (
                              <div className="mt-6 border-t border-zinc-800/30" />
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Center: Generate Button */}
                  <div className="flex items-center justify-center px-4 lg:px-0">
                    <button
                      onClick={generateNarrations}
                      disabled={isGeneratingNarration}
                      className="group relative w-16 h-16 lg:w-20 lg:h-20 rounded-full bg-gradient-to-br from-purple-600 via-pink-600 to-rose-600 hover:from-purple-500 hover:via-pink-500 hover:to-rose-500 shadow-2xl shadow-purple-900/50 hover:shadow-purple-900/70 transition-all duration-300 hover:scale-110 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                      title="나레이션 생성"
                    >
                      {isGeneratingNarration ? (
                        <CircleNotch size={32} weight="bold" className="text-white animate-spin" />
                      ) : (
                        <Sparkle size={32} weight="duotone" className="text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.5)]" />
                      )}
                    </button>
                  </div>

                  {/* Right: Narration Results */}
                  <div className="bg-zinc-900/60 backdrop-blur-xl rounded-r-2xl border border-zinc-800/50 overflow-hidden shadow-2xl">
                    <div className="p-6 border-b border-zinc-800 bg-gradient-to-br from-zinc-900/80 to-zinc-950/80">
                      <div className="flex items-start justify-between">
                        <div>
                          <h2 className="text-2xl font-bold text-zinc-100 flex items-center gap-3">
                            <Sparkle size={28} weight="duotone" className="text-purple-400" />
                            나레이션
                          </h2>
                          <p className="text-sm text-zinc-500 mt-2">AI 생성 결과</p>
                        </div>
                        {Object.keys(narrations).length > 0 && (
                          <button
                            onClick={() => {
                              const narrationText = storyboard_sequence
                                .map((shot, idx) => narrations[idx])
                                .filter(n => n)
                                .join(' ');
                              navigator.clipboard.writeText(narrationText);
                              setNarrationCopied(true);
                              setTimeout(() => setNarrationCopied(false), 2000);
                              onCopyToast('나레이션 전체 복사됨');
                            }}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-300 ${
                              narrationCopied
                                ? 'bg-purple-600/20 text-purple-400'
                                : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white'
                            }`}
                            title="전체 나레이션 복사"
                          >
                            {narrationCopied ? (
                              <>
                                <Check size={18} weight="bold" />
                                <span className="text-sm font-semibold">복사됨</span>
                              </>
                            ) : (
                              <>
                                <Copy size={18} />
                                <span className="text-sm font-semibold">전체 복사</span>
                              </>
                            )}
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="p-8 h-[calc(100%-88px)] overflow-y-auto">
                      {Object.keys(narrations).length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-zinc-600">
                          <Sparkle size={48} weight="duotone" className="mb-4 opacity-20" />
                          <p className="text-sm">버튼을 눌러 나레이션을 생성하세요</p>
                        </div>
                      ) : (
                        <div className="space-y-6">
                          {storyboard_sequence.map((shot, idx) => (
                            <div key={idx}>
                              {narrations[idx] && (
                                <div className="group">
                                  <div className="flex items-center gap-2 mb-2">
                                    <span className="inline-block px-2.5 py-0.5 rounded-md bg-gradient-to-br from-purple-600 to-pink-600 text-white text-sm font-bold">
                                      #{shot.kf_id}
                                    </span>
                                  </div>
                                  <p className="text-zinc-300 text-lg leading-relaxed italic">
                                    "{narrations[idx]}"
                                  </p>
                                  {idx < storyboard_sequence.length - 1 && narrations[idx + 1] && (
                                    <div className="mt-6 border-t border-zinc-800/30" />
                                  )}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {storyboard_sequence.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 text-zinc-500">
              <FilmSlate size={48} weight="duotone" className="mb-4 opacity-20" />
              <p>시퀀스에 샷이 없습니다.</p>
            </div>
          )}
        </main>
      </div>

      <ImageModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        imageUrl={selectedImageIndex !== null ? generatedImages[selectedImageIndex] || storyboard_sequence[selectedImageIndex]?.assets?.image_url || null : null}
        title={selectedImageIndex !== null ? `Shot #${storyboard_sequence[selectedImageIndex].kf_id}` : ''}
        initialPrompt={selectedImageIndex !== null ? storyboard_sequence[selectedImageIndex]?.prompts?.image_gen : ''}
        visualDescription={selectedImageIndex !== null ? storyboard_sequence[selectedImageIndex]?.visual_description : ''}
        videoPrompt={selectedImageIndex !== null ? storyboard_sequence[selectedImageIndex]?.prompts?.video_gen : ''}
        onRegenerate={handleModalRegenerate}
        isRegenerating={selectedImageIndex !== null ? generatingStatus[selectedImageIndex] : false}
        onCopy={onCopyToast}
      />

      <VideoModal
        isOpen={videoModalOpen}
        onClose={() => setVideoModalOpen(false)}
        shot={selectedVideoIndex !== null ? storyboard_sequence[selectedVideoIndex] : null}
        videoUrl={selectedVideoIndex !== null ? videoUrls[selectedVideoIndex] : null}
        generatedImage={selectedVideoIndex !== null ? generatedImages[selectedVideoIndex] : null}
        generationStatus={selectedVideoIndex !== null ? videoGenerationStatus[selectedVideoIndex] : undefined}
        onSaveUrl={(url) => selectedVideoIndex !== null && handleSaveVideoUrl(selectedVideoIndex, url)}
        onCopy={onCopyToast}
        onGenerateVideo={(model) => selectedVideoIndex !== null && generateVideoForShot(selectedVideoIndex, model)}
        onCancelGeneration={() => selectedVideoIndex !== null && cancelVideoGeneration(selectedVideoIndex)}
        onUpdatePrompt={(prompt) => selectedVideoIndex !== null && handleUpdateVideoPrompt(selectedVideoIndex, prompt)}
        onUpdateDescription={(desc) => selectedVideoIndex !== null && handleUpdateDescription(selectedVideoIndex, desc)}
        selectedModel={selectedVideoIndex !== null ? selectedModels[selectedVideoIndex] || 'veo-3.1-fast-generate-preview' : 'veo-3.1-fast-generate-preview'}
        onModelChange={(model) => selectedVideoIndex !== null && setSelectedModels(prev => ({ ...prev, [selectedVideoIndex]: model }))}
      />
    </div>
  );
};

export default OutputSection;