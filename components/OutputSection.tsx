import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Clock, Ratio, Palette, Film, Download, Sparkles, Loader2, Image as ImageIcon, Video, Grid, Upload, HardDriveDownload, HardDriveUpload, Play, Home } from 'lucide-react';
import { StoryboardData, VideoGenerationStatus } from '../types';
import StoryboardCard from './StoryboardCard';
import VideoCard from './VideoCard';
import ImageModal from './ImageModal';
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
  const [activeTab, setActiveTab] = useState<'storyboard' | 'videos'>('storyboard');

  // Local generating status (이미지)
  const [generatingStatus, setGeneratingStatus] = useState<Record<number, boolean>>({});
  const [isGlobalGenerating, setIsGlobalGenerating] = useState(false);
  const [isZipping, setIsZipping] = useState(false);

  // 비디오 생성 상태
  const [videoGenerationStatus, setVideoGenerationStatus] = useState<Record<number, VideoGenerationStatus>>({});
  const abortControllersRef = useRef<Record<number, AbortController>>({});

  // 비디오 모델 선택 상태 (각 샷별로 관리)
  const [selectedModels, setSelectedModels] = useState<Record<number, VeoModelId>>({});

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null);

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

  // Backup: Download all data as JSON
  const handleBackupData = () => {
    const backupData = {
      version: '1.0',
      timestamp: new Date().toISOString(),
      data: data,
      generatedImages: generatedImages,
      videoUrls: videoUrls,
    };

    const jsonString = JSON.stringify(backupData, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const filename = `storyboard-backup-${project_meta.title.replace(/\s+/g, '-').toLowerCase()}-${new Date().toISOString().slice(0, 10)}.json`;
    triggerDownload(blob, filename);
    onCopyToast('백업 파일 다운로드 완료!');
  };

  // Restore: Upload and restore data from JSON
  const handleRestoreData = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const backupData = JSON.parse(content);

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
        }

        // Restore video URLs (키를 숫자로 변환)
        if (backupData.videoUrls) {
          const numericVideos: Record<number, string> = {};
          Object.entries(backupData.videoUrls).forEach(([key, value]) => {
            numericVideos[parseInt(key, 10)] = value as string;
          });
          onVideosUpdate(numericVideos);
        }

        onCopyToast('백업 데이터 복원 완료!');
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
      <div className="fixed left-0 top-0 h-full w-16 bg-zinc-950 border-r border-zinc-800 flex flex-col items-center py-4 z-50">
        {/* Logo / Home */}
        <button
          onClick={onReset}
          className="p-3 rounded-xl hover:bg-zinc-900 text-zinc-400 hover:text-white transition-colors mb-6"
          title="START - 에디터로 돌아가기"
        >
          <Home size={22} />
        </button>

        {/* Navigation */}
        <div className="flex flex-col items-center gap-2">
          <button
            onClick={() => setActiveTab('storyboard')}
            className={`p-3 rounded-xl transition-all ${activeTab === 'storyboard' ? 'bg-indigo-600 text-white' : 'hover:bg-zinc-900 text-zinc-500 hover:text-zinc-300'}`}
            title="스토리보드"
          >
            <Grid size={20} />
          </button>
          <button
            onClick={() => setActiveTab('videos')}
            className={`p-3 rounded-xl transition-all ${activeTab === 'videos' ? 'bg-indigo-600 text-white' : 'hover:bg-zinc-900 text-zinc-500 hover:text-zinc-300'}`}
            title="비디오"
          >
            <Video size={20} />
          </button>
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Shot Count */}
        <div className="mb-4 text-center">
          <div className="text-lg font-bold text-indigo-400">{storyboard_sequence.length}</div>
          <div className="text-[10px] text-zinc-600">SHOTS</div>
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
                      <ImageIcon size={10} />
                      참조 이미지 사용 중
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Backup/Restore Buttons */}
              <div className="flex items-center gap-1">
                <button
                  onClick={handleBackupData}
                  className="p-2 rounded-lg hover:bg-zinc-900 text-zinc-400 hover:text-emerald-400 transition-colors"
                  title="전체 데이터 백업 (JSON 다운로드)"
                >
                  <HardDriveDownload size={18} />
                </button>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="p-2 rounded-lg hover:bg-zinc-900 text-zinc-400 hover:text-blue-400 transition-colors"
                  title="백업 데이터 복원 (JSON 업로드)"
                >
                  <HardDriveUpload size={18} />
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
              <div className="flex items-center gap-2 border-l border-zinc-800 pl-4">
                {activeTab === 'storyboard' ? (
                  <>
                    <button
                      onClick={handleGenerateAllImages}
                      disabled={isGlobalGenerating}
                      className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium transition-colors disabled:opacity-50 whitespace-nowrap"
                    >
                      {isGlobalGenerating ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                      전체 생성
                    </button>
                    <button
                      onClick={handleDownloadAllImages}
                      disabled={isZipping || Object.keys(generatedImages).length === 0}
                      className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium transition-colors disabled:opacity-50 whitespace-nowrap"
                    >
                      {isZipping ? <Loader2 size={12} className="animate-spin" /> : <Download size={12} />}
                      이미지 다운로드
                    </button>
                  </>
                ) : (
                  <button
                    onClick={handleDownloadAllVideos}
                    disabled={isZipping || Object.keys(videoUrls).length === 0}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium transition-colors disabled:opacity-50 whitespace-nowrap"
                  >
                    {isZipping ? <Loader2 size={12} className="animate-spin" /> : <Download size={12} />}
                    동영상 다운로드
                  </button>
                )}
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
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6"
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
            ) : (
              <motion.div
                key="videos"
                variants={container}
                initial="hidden"
                animate="show"
                exit={{ opacity: 0, y: -20 }}
                className="flex flex-col gap-4"
              >
                {storyboard_sequence.map((shot, idx) => (
                  <motion.div key={idx} variants={item}>
                    <VideoCard
                      shot={shot}
                      index={idx}
                      savedUrl={videoUrls[idx]}
                      generatedImage={generatedImages[idx]}
                      generationStatus={videoGenerationStatus[idx]}
                      onSave={(url) => handleSaveVideoUrl(idx, url)}
                      onCopy={handleCopy}
                      onGenerateVideo={(model) => generateVideoForShot(idx, model)}
                      onCancelGeneration={() => cancelVideoGeneration(idx)}
                      onUpdatePrompt={(prompt) => handleUpdateVideoPrompt(idx, prompt)}
                      onUpdateDescription={(desc) => handleUpdateDescription(idx, desc)}
                      selectedModel={selectedModels[idx] || 'veo-3.1-fast-generate-preview'}
                      onModelChange={(model) => setSelectedModels(prev => ({ ...prev, [idx]: model }))}
                    />
                  </motion.div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>

          {storyboard_sequence.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 text-zinc-500">
              <Film size={48} className="mb-4 opacity-20" />
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
        onRegenerate={handleModalRegenerate}
        isRegenerating={selectedImageIndex !== null ? generatingStatus[selectedImageIndex] : false}
      />
    </div>
  );
};

export default OutputSection;