import React, { useState, useEffect, useRef } from 'react';
import { Video, Save, Edit2, Download, Upload, Clapperboard, Sparkles, AlertCircle, X, FileText, ChevronDown, Zap, Star, Copy, Check } from 'lucide-react';
import { StoryboardShot, VideoGenerationStatus } from '../types';
import { VEO_MODELS, VeoModelId } from '../services/veoApi';

interface VideoCardProps {
  shot: StoryboardShot;
  index: number;
  savedUrl?: string | null;
  generatedImage?: string | null;
  generationStatus?: VideoGenerationStatus;
  onSave: (url: string) => void;
  onCopy: (text: string, type: string) => void;
  onGenerateVideo?: (model: VeoModelId) => void;
  onCancelGeneration?: () => void;
  onUpdatePrompt?: (prompt: string) => void;
  onUpdateDescription?: (description: string) => void;
  selectedModel?: VeoModelId;
  onModelChange?: (model: VeoModelId) => void;
}

const VideoCard: React.FC<VideoCardProps> = ({
  shot,
  index,
  savedUrl,
  generatedImage,
  generationStatus,
  onSave,
  onCopy,
  onGenerateVideo,
  onCancelGeneration,
  onUpdatePrompt,
  onUpdateDescription,
  selectedModel = 'veo-3.1-fast-generate-preview',
  onModelChange,
}) => {
  const isPlaceholder = savedUrl?.includes('/assets/placeholder');
  const effectiveUrl = isPlaceholder ? null : savedUrl;

  const [isEditing, setIsEditing] = useState(false);
  const [inputValue, setInputValue] = useState(effectiveUrl || '');
  const [editedDescription, setEditedDescription] = useState(shot.visual_description);
  const [editedPrompt, setEditedPrompt] = useState(shot.prompts?.video_gen || '');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isGenerating = generationStatus &&
    ['generating', 'polling', 'downloading'].includes(generationStatus.status);
  const hasError = generationStatus?.status === 'error';

  // 복사 상태
  const [copied, setCopied] = useState(false);

  const handleCopyPrompt = () => {
    if (editedPrompt) {
      navigator.clipboard.writeText(editedPrompt);
      setCopied(true);
      onCopy(editedPrompt, '비디오 프롬프트');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  useEffect(() => {
    if (effectiveUrl) {
      setInputValue(effectiveUrl);
      setIsEditing(false);
    }
  }, [effectiveUrl]);

  useEffect(() => {
    setEditedDescription(shot.visual_description);
    setEditedPrompt(shot.prompts?.video_gen || '');
  }, [shot]);

  const handleSave = () => {
    if (inputValue.trim()) {
      onSave(inputValue.trim());
      setIsEditing(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const objectUrl = URL.createObjectURL(file);
      onSave(objectUrl);
      setInputValue(objectUrl);
      setIsEditing(false);
    }
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

  // 진행률 오버레이
  const renderProgressOverlay = () => {
    if (!generationStatus || generationStatus.status === 'idle' || generationStatus.status === 'completed') {
      return null;
    }

    return (
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center z-20 rounded-lg">
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
              <AlertCircle className="text-red-400" size={24} />
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

  const hasStartFrame = !!generatedImage;
  const hasPrompt = !!editedPrompt;
  const hasVideo = !!effectiveUrl;

  return (
    <div className="flex flex-col lg:flex-row bg-zinc-900/40 rounded-xl border border-zinc-800/50 hover:border-zinc-700 transition-colors duration-300 overflow-hidden">
      {/* 좌측: 영상 섹션 */}
      <div className="w-full lg:w-[480px] xl:w-[560px] flex-shrink-0 flex flex-col">
        {/* 비디오 영역 */}
        <div className="relative aspect-video bg-zinc-950 overflow-hidden group">
          {renderProgressOverlay()}

          {!isEditing && effectiveUrl ? (
            <>
              <video
                src={effectiveUrl}
                controls
                className="w-full h-full object-contain bg-black"
                preload="metadata"
              >
                브라우저가 비디오 태그를 지원하지 않습니다.
              </video>

              <div className="absolute top-2 right-2 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                <button
                  onClick={() => setIsEditing(true)}
                  className="p-1.5 rounded-lg bg-black/60 backdrop-blur-md border border-white/10 text-white hover:bg-black/80 transition-colors"
                  title="URL 수정"
                >
                  <Edit2 size={14} />
                </button>
                <button
                  onClick={handleDownload}
                  className="p-1.5 rounded-lg bg-indigo-600 text-white shadow-lg hover:bg-indigo-500 transition-colors"
                  title="동영상 다운로드"
                >
                  <Download size={14} />
                </button>
              </div>
            </>
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center p-6 bg-zinc-900/50">
              {generatedImage && (
                <div className="absolute inset-0 opacity-40">
                  <img src={generatedImage} alt="Start frame" className="w-full h-full object-cover" />
                </div>
              )}

              <div className="relative z-10 flex flex-col items-center w-full max-w-sm">
                {!isEditing ? (
                  <>
                    <div className="w-16 h-16 rounded-full bg-zinc-800 flex items-center justify-center mb-4 border border-zinc-700/50">
                      <Video className="text-zinc-500" size={28} />
                    </div>
                    <p className="text-zinc-500 text-sm mb-4">비디오가 없습니다</p>
                    <button
                      onClick={() => setIsEditing(true)}
                      className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm rounded-lg flex items-center gap-2"
                    >
                      <Upload size={16} />
                      URL / 파일로 추가
                    </button>
                  </>
                ) : (
                  <div className="w-full space-y-3">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        placeholder="URL 붙여넣기..."
                        className="flex-1 px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-sm text-zinc-300 focus:outline-none focus:border-indigo-500/50"
                      />
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="p-2 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-lg text-zinc-400 hover:text-white"
                      >
                        <Upload size={18} />
                      </button>
                      <input type="file" ref={fileInputRef} className="hidden" accept="video/*" onChange={handleFileUpload} />
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setIsEditing(false)}
                        className="px-3 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm rounded-lg"
                      >
                        취소
                      </button>
                      <button
                        onClick={handleSave}
                        disabled={!inputValue.trim()}
                        className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm rounded-lg flex items-center justify-center gap-2"
                      >
                        <Save size={14} />
                        저장
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Shot ID */}
          <div className="absolute top-2 left-2 px-2.5 py-1 rounded-lg bg-black/60 backdrop-blur-md border border-white/10 text-sm font-mono text-zinc-300 pointer-events-none z-10">
            #{shot.kf_id}
          </div>
        </div>

        {/* 비디오 생성/재생성 버튼 - 영상 아래 배치 */}
        <div className="p-3 bg-zinc-900/60 border-t border-zinc-800/50">
          {(hasPrompt || hasStartFrame) && !isGenerating ? (
            <div className="space-y-2">
              {/* 모델 선택 드롭다운 */}
              <div className="flex items-center gap-2">
                <label className="text-xs text-zinc-500 whitespace-nowrap">모델:</label>
                <div className="relative flex-1">
                  <select
                    value={selectedModel}
                    onChange={(e) => onModelChange?.(e.target.value as VeoModelId)}
                    className="w-full appearance-none px-3 py-1.5 pr-8 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-zinc-300 focus:outline-none focus:border-indigo-500/50 cursor-pointer"
                  >
                    {VEO_MODELS.map((model) => (
                      <option key={model.id} value={model.id}>
                        {model.name} - {model.description}
                      </option>
                    ))}
                  </select>
                  <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" />
                </div>
                {/* 모델 티어 배지 */}
                {VEO_MODELS.find(m => m.id === selectedModel)?.tier === 'fast' && (
                  <span className="px-2 py-0.5 rounded bg-emerald-600/20 text-emerald-400 text-xs flex items-center gap-1">
                    <Zap size={10} />
                    저렴
                  </span>
                )}
                {VEO_MODELS.find(m => m.id === selectedModel)?.tier === 'standard' && (
                  <span className="px-2 py-0.5 rounded bg-amber-600/20 text-amber-400 text-xs flex items-center gap-1">
                    <Star size={10} />
                    고품질
                  </span>
                )}
              </div>

              {/* 생성 버튼 */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onGenerateVideo?.(selectedModel);
                }}
                className={`w-full py-3 rounded-lg text-white font-semibold flex items-center justify-center gap-2 transition-all ${
                  hasVideo
                    ? 'bg-zinc-700 hover:bg-zinc-600 text-sm'
                    : 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500'
                }`}
              >
                <Sparkles size={18} />
                {hasVideo ? 'AI 비디오 재생성' : 'AI 비디오 생성'}
                {hasStartFrame && (
                  <span className="ml-1 px-2 py-0.5 rounded bg-white/20 text-xs">이미지 사용</span>
                )}
              </button>
            </div>
          ) : !isGenerating ? (
            <div className="text-center text-sm text-zinc-500 py-2">
              비디오 프롬프트 또는 시작 이미지가 필요합니다
            </div>
          ) : null}
        </div>
      </div>

      {/* 우측: 장면 설명 & 비디오 프롬프트 */}
      <div className="flex-1 p-5 flex flex-col gap-5 min-w-0 border-t lg:border-t-0 lg:border-l border-zinc-800/50">
        {/* 장면 설명 */}
        <div className="flex-1 flex flex-col">
          <label className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-2 flex items-center gap-1.5">
            <Clapperboard size={12} />
            장면 설명
          </label>
          <textarea
            value={editedDescription}
            onChange={(e) => {
              setEditedDescription(e.target.value);
              onUpdateDescription?.(e.target.value);
            }}
            className="flex-1 min-h-[100px] w-full px-4 py-3 bg-zinc-950 border border-zinc-800 rounded-lg text-sm text-zinc-300 resize-none focus:outline-none focus:border-indigo-500/50 leading-relaxed"
            placeholder="장면 설명을 입력하세요..."
          />
        </div>

        {/* 비디오 프롬프트 */}
        <div className="flex-1 flex flex-col">
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-zinc-500 flex items-center gap-1.5">
              <FileText size={12} />
              비디오 프롬프트
            </label>
            {editedPrompt && (
              <button
                onClick={handleCopyPrompt}
                className={`p-1.5 rounded-md transition-all ${
                  copied
                    ? 'bg-emerald-600/20 text-emerald-400'
                    : 'hover:bg-zinc-800 text-zinc-500 hover:text-zinc-300'
                }`}
                title="프롬프트 복사"
              >
                {copied ? <Check size={14} /> : <Copy size={14} />}
              </button>
            )}
          </div>
          <textarea
            value={editedPrompt}
            onChange={(e) => {
              setEditedPrompt(e.target.value);
              onUpdatePrompt?.(e.target.value);
            }}
            className="flex-1 min-h-[120px] w-full px-4 py-3 bg-zinc-950 border border-zinc-800 rounded-lg text-sm text-zinc-300 resize-none focus:outline-none focus:border-indigo-500/50 leading-relaxed font-mono"
            placeholder="비디오 생성 프롬프트를 입력하세요..."
          />
        </div>
      </div>
    </div>
  );
};

export default VideoCard;
