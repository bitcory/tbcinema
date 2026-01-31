import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, DownloadSimple, Sparkle, CircleNotch, Copy, Check, FilmStrip, FileText, VideoCamera, UploadSimple, FloppyDisk, PencilSimple, CaretDown, WarningCircle } from 'phosphor-react';
import { StoryboardShot, VideoGenerationStatus } from '../types';
import { VEO_MODELS, VeoModelId } from '../services/veoApi';

interface VideoModalProps {
  isOpen: boolean;
  shot: StoryboardShot | null;
  videoUrl: string | null;
  generatedImage?: string | null;
  generationStatus?: VideoGenerationStatus;
  onClose: () => void;
  onSaveUrl: (url: string) => void;
  onCopy?: (text: string, label: string) => void;
  onGenerateVideo?: (model: VeoModelId) => void;
  onCancelGeneration?: () => void;
  onUpdatePrompt?: (prompt: string) => void;
  onUpdateDescription?: (description: string) => void;
  selectedModel?: VeoModelId;
  onModelChange?: (model: VeoModelId) => void;
}

const VideoModal: React.FC<VideoModalProps> = ({
  isOpen,
  shot,
  videoUrl,
  generatedImage,
  generationStatus,
  onClose,
  onSaveUrl,
  onCopy,
  onGenerateVideo,
  onCancelGeneration,
  onUpdatePrompt,
  onUpdateDescription,
  selectedModel = 'veo-3.1-fast-generate-preview',
  onModelChange
}) => {
  const [copiedType, setCopiedType] = useState<string | null>(null);
  const [isEditingUrl, setIsEditingUrl] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  const [editedDescription, setEditedDescription] = useState('');
  const [editedPrompt, setEditedPrompt] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isPlaceholder = videoUrl?.includes('/assets/placeholder');
  const effectiveUrl = isPlaceholder ? null : videoUrl;

  const isGenerating = generationStatus &&
    ['generating', 'polling', 'downloading'].includes(generationStatus.status);
  const hasError = generationStatus?.status === 'error';

  useEffect(() => {
    if (isOpen && shot) {
      setEditedDescription(shot.visual_description);
      setEditedPrompt(shot.prompts?.video_gen || '');
      setUrlInput(effectiveUrl || '');
      setIsEditingUrl(false);
    }
  }, [isOpen, shot, effectiveUrl]);

  if (!shot) return null;

  const handleCopyInternal = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    if (onCopy) {
      onCopy(text, type);
    }
    setCopiedType(type);
    setTimeout(() => setCopiedType(null), 2000);
  };

  const handleDownload = async () => {
    if (!effectiveUrl) return;
    try {
      const response = await fetch(effectiveUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `shot-${shot.kf_id}-video.mp4`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (e) {
      window.open(effectiveUrl, '_blank');
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const objectUrl = URL.createObjectURL(file);
      onSaveUrl(objectUrl);
      setUrlInput(objectUrl);
      setIsEditingUrl(false);
    }
  };

  const handleSaveUrl = () => {
    if (urlInput.trim()) {
      onSaveUrl(urlInput.trim());
      setIsEditingUrl(false);
    }
  };

  const hasStartFrame = !!generatedImage;
  const hasPrompt = !!editedPrompt;

  const renderProgressOverlay = () => {
    if (!generationStatus || generationStatus.status === 'idle' || generationStatus.status === 'completed') {
      return null;
    }

    return (
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center z-20">
        <div className="relative w-20 h-20 mb-4">
          <svg className="w-full h-full transform -rotate-90">
            <circle cx="40" cy="40" r="35" stroke="currentColor" strokeWidth="4" fill="none" className="text-zinc-800" />
            <circle
              cx="40" cy="40" r="35"
              stroke="currentColor" strokeWidth="4" fill="none"
              strokeDasharray={`${2 * Math.PI * 35}`}
              strokeDashoffset={`${2 * Math.PI * 35 * (1 - generationStatus.progress / 100)}`}
              className="text-indigo-500 transition-all duration-300"
              strokeLinecap="round"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            {hasError ? (
              <WarningCircle className="text-red-400" size={24} />
            ) : (
              <span className="text-white font-bold text-lg">{generationStatus.progress}%</span>
            )}
          </div>
        </div>
        <p className={`text-sm text-center px-4 ${hasError ? 'text-red-400' : 'text-zinc-300'}`}>
          {generationStatus.message}
        </p>
        {isGenerating && onCancelGeneration && (
          <button
            onClick={onCancelGeneration}
            className="mt-4 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs flex items-center gap-1.5"
          >
            <X size={12} />
            취소
          </button>
        )}
      </div>
    );
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-md p-2 md:p-6"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="relative w-full max-w-[95vw] h-full md:h-[90vh] flex flex-col md:grid md:grid-cols-[7fr_3fr] bg-zinc-950 rounded-2xl overflow-hidden shadow-2xl border border-zinc-800"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Left: Video Viewer */}
            <div className="relative flex items-center justify-center bg-zinc-900/50 h-1/2 md:h-full overflow-hidden group">
              {/* Header Overlay */}
              <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-start z-10 pointer-events-none">
                <span className="text-white/80 font-mono text-xs px-2 py-1 bg-black/50 backdrop-blur-md rounded border border-white/10">
                  Shot #{shot.kf_id}
                </span>
                <div className="flex gap-2 pointer-events-auto">
                  {effectiveUrl && (
                    <>
                      <button
                        onClick={() => setIsEditingUrl(true)}
                        className="p-2 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-md text-white transition-colors"
                        title="URL 수정"
                      >
                        <PencilSimple size={20} />
                      </button>
                      <button
                        onClick={handleDownload}
                        className="p-2 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-md text-white transition-colors"
                        title="비디오 다운로드"
                      >
                        <DownloadSimple size={20} />
                      </button>
                    </>
                  )}
                  <button
                    onClick={onClose}
                    className="p-2 rounded-full bg-white/10 hover:bg-red-500/50 backdrop-blur-md text-white transition-colors"
                  >
                    <X size={20} />
                  </button>
                </div>
              </div>

              {renderProgressOverlay()}

              {!isEditingUrl && effectiveUrl ? (
                <video
                  src={effectiveUrl}
                  controls
                  className="w-full h-full object-contain bg-black"
                  preload="metadata"
                >
                  브라우저가 비디오 태그를 지원하지 않습니다.
                </video>
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center p-6">
                  {generatedImage && !isEditingUrl && (
                    <div className="absolute inset-0 opacity-40">
                      <img src={generatedImage} alt="Start frame" className="w-full h-full object-cover" />
                    </div>
                  )}

                  <div className="relative z-10 flex flex-col items-center w-full max-w-sm">
                    {!isEditingUrl ? (
                      <>
                        <div className="w-20 h-20 rounded-full bg-zinc-800 flex items-center justify-center mb-4 border border-zinc-700/50">
                          <VideoCamera className="text-zinc-500" size={32} />
                        </div>
                        <p className="text-zinc-500 text-sm mb-4">비디오가 없습니다</p>
                        <button
                          onClick={() => setIsEditingUrl(true)}
                          className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm rounded-lg flex items-center gap-2"
                        >
                          <UploadSimple size={16} />
                          URL / 파일로 추가
                        </button>
                      </>
                    ) : (
                      <div className="w-full space-y-3">
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={urlInput}
                            onChange={(e) => setUrlInput(e.target.value)}
                            placeholder="URL 붙여넣기..."
                            className="flex-1 px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-sm text-zinc-300 focus:outline-none focus:border-indigo-500/50"
                          />
                          <button
                            onClick={() => fileInputRef.current?.click()}
                            className="p-2 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-lg text-zinc-400 hover:text-white"
                          >
                            <UploadSimple size={18} />
                          </button>
                          <input type="file" ref={fileInputRef} className="hidden" accept="video/*" onChange={handleFileUpload} />
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => setIsEditingUrl(false)}
                            className="px-3 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm rounded-lg"
                          >
                            취소
                          </button>
                          <button
                            onClick={handleSaveUrl}
                            disabled={!urlInput.trim()}
                            className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm rounded-lg flex items-center justify-center gap-2"
                          >
                            <FloppyDisk size={14} />
                            저장
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Right: Info & Controls */}
            <div className="flex flex-col h-1/2 md:h-full border-t md:border-t-0 md:border-l border-zinc-800 bg-zinc-950/80 backdrop-blur-xl overflow-y-auto">
              <div className="p-4 border-b border-zinc-800 bg-zinc-900/50">
                <h3 className="text-sm font-semibold text-zinc-200 flex items-center gap-2">
                  <Sparkle size={14} className="text-indigo-400" />
                  비디오 생성 & 정보
                </h3>
              </div>

              <div className="flex-1 p-4 flex flex-col gap-6 overflow-y-auto">
                {/* 장면 설명 */}
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-semibold uppercase tracking-wider text-zinc-500 flex items-center gap-1.5">
                    <FilmStrip size={14} />
                    장면 설명
                  </label>
                  <textarea
                    value={editedDescription}
                    onChange={(e) => {
                      setEditedDescription(e.target.value);
                      onUpdateDescription?.(e.target.value);
                    }}
                    className="w-full min-h-[80px] bg-zinc-900 border border-zinc-800 rounded-lg p-3 text-lg text-zinc-300 resize-none focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20 leading-relaxed"
                    placeholder="장면 설명을 입력하세요..."
                  />
                </div>

                {/* 비디오 프롬프트 */}
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-semibold uppercase tracking-wider text-zinc-500 flex items-center gap-1.5">
                      <FileText size={14} className="text-pink-400" />
                      비디오 프롬프트
                    </label>
                    {editedPrompt && (
                      <button
                        onClick={() => handleCopyInternal(editedPrompt, '비디오 프롬프트')}
                        className={`p-1.5 rounded transition-all ${
                          copiedType === '비디오 프롬프트'
                            ? 'bg-emerald-600/20 text-emerald-400'
                            : 'hover:bg-zinc-800 text-zinc-500 hover:text-zinc-300'
                        }`}
                        title="프롬프트 복사"
                      >
                        {copiedType === '비디오 프롬프트' ? <Check size={16} /> : <Copy size={16} />}
                      </button>
                    )}
                  </div>
                  <textarea
                    value={editedPrompt}
                    onChange={(e) => {
                      setEditedPrompt(e.target.value);
                      onUpdatePrompt?.(e.target.value);
                    }}
                    className="w-full min-h-[100px] bg-zinc-900 border border-zinc-800 rounded-lg p-3 text-base text-zinc-400 resize-none focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20 leading-relaxed"
                    placeholder="비디오 생성 프롬프트를 입력하세요..."
                  />
                </div>

                {/* 비디오 생성 섹션 */}
                {(hasPrompt || hasStartFrame) && !isGenerating && (
                  <div className="flex flex-col gap-2 pt-4 border-t border-zinc-800">
                    <label className="text-sm font-semibold uppercase tracking-wider text-zinc-500 flex items-center gap-1.5">
                      <Sparkle size={14} className="text-indigo-400" />
                      AI 비디오 생성
                    </label>

                    {/* 모델 선택 */}
                    <div className="relative">
                      <select
                        value={selectedModel}
                        onChange={(e) => onModelChange?.(e.target.value as VeoModelId)}
                        className="w-full appearance-none px-3 py-2.5 pr-8 bg-zinc-900 border border-zinc-800 rounded-lg text-sm text-zinc-300 focus:outline-none focus:border-indigo-500/50 cursor-pointer"
                      >
                        {VEO_MODELS.map((model) => (
                          <option key={model.id} value={model.id}>
                            {model.name}
                          </option>
                        ))}
                      </select>
                      <CaretDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" />
                    </div>

                    {/* 생성 버튼 */}
                    <button
                      onClick={() => onGenerateVideo?.(selectedModel)}
                      className="w-full py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-semibold rounded-lg transition-all hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-2 shadow-lg shadow-indigo-900/20"
                    >
                      <Sparkle size={16} />
                      {effectiveUrl ? '비디오 재생성' : '비디오 생성'}
                      {hasStartFrame && <span className="px-1.5 py-0.5 rounded bg-white/20 text-[10px]">이미지 사용</span>}
                    </button>
                    <p className="text-[10px] text-zinc-500 italic text-center">
                      {hasStartFrame ? '생성된 이미지를 시작 프레임으로 사용합니다' : '프롬프트만 사용하여 비디오를 생성합니다'}
                    </p>
                  </div>
                )}

                {!hasPrompt && !hasStartFrame && !isGenerating && (
                  <div className="p-3 rounded-lg bg-zinc-900/50 border border-zinc-800 text-xs text-zinc-500 text-center">
                    비디오 프롬프트 또는 이미지가 필요합니다
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default VideoModal;
