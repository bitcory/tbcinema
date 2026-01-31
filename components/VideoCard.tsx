import React from 'react';
import { VideoCamera, Sparkle, CircleNotch, WarningCircle, ArrowsOutSimple } from 'phosphor-react';
import { StoryboardShot, VideoGenerationStatus } from '../types';
import { VeoModelId } from '../services/veoApi';

interface VideoCardProps {
  shot: StoryboardShot;
  index: number;
  savedUrl?: string | null;
  generatedImage?: string | null;
  generationStatus?: VideoGenerationStatus;
  onGenerateVideo?: (model: VeoModelId) => void;
  selectedModel?: VeoModelId;
  onExpand: () => void;
}

const VideoCard: React.FC<VideoCardProps> = ({
  shot,
  savedUrl,
  generatedImage,
  generationStatus,
  onGenerateVideo,
  selectedModel = 'veo-3.1-fast-generate-preview',
  onExpand,
}) => {
  const isPlaceholder = savedUrl?.includes('/assets/placeholder');
  const effectiveUrl = isPlaceholder ? null : savedUrl;

  const isGenerating = generationStatus &&
    ['generating', 'polling', 'downloading'].includes(generationStatus.status);
  const hasError = generationStatus?.status === 'error';

  const hasStartFrame = !!generatedImage;
  const hasPrompt = !!shot.prompts?.video_gen;

  // 진행률 오버레이
  const renderProgressOverlay = () => {
    if (!generationStatus || generationStatus.status === 'idle' || generationStatus.status === 'completed') {
      return null;
    }

    return (
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm flex flex-col items-center justify-center z-20">
        <div className="relative w-20 h-20 mb-4">
          <svg className="w-full h-full transform -rotate-90">
            <circle cx="40" cy="40" r="32" stroke="currentColor" strokeWidth="4" fill="none" className="text-zinc-800" />
            <circle
              cx="40" cy="40" r="32"
              stroke="currentColor" strokeWidth="4" fill="none"
              strokeDasharray={`${2 * Math.PI * 32}`}
              strokeDashoffset={`${2 * Math.PI * 32 * (1 - generationStatus.progress / 100)}`}
              className="text-indigo-500 transition-all duration-300"
              strokeLinecap="round"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            {hasError ? (
              <WarningCircle size={28} weight="fill" className="text-red-400" />
            ) : (
              <span className="text-white font-bold text-base">{generationStatus.progress}%</span>
            )}
          </div>
        </div>
        <p className={`text-sm text-center px-4 font-medium ${hasError ? 'text-red-400' : 'text-zinc-200'}`}>
          {generationStatus.message}
        </p>
      </div>
    );
  };

  return (
    <div className="flex flex-col bg-zinc-900/60 backdrop-blur-xl rounded-xl border border-zinc-800/50 hover:border-purple-500/30 transition-all duration-300 overflow-hidden group shadow-xl shadow-black/50 hover:shadow-purple-900/20">
      {/* 비디오 영역 */}
      <div
        className="relative aspect-video bg-gradient-to-br from-zinc-950 to-zinc-900 overflow-hidden cursor-pointer"
        onClick={onExpand}
      >
        {renderProgressOverlay()}

        {effectiveUrl ? (
          <video
            src={effectiveUrl}
            className="w-full h-full object-contain bg-black"
            preload="metadata"
          >
            브라우저가 비디오 태그를 지원하지 않습니다.
          </video>
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center">
            {generatedImage && (
              <div className="absolute inset-0 opacity-30">
                <img src={generatedImage} alt="Start frame" className="w-full h-full object-cover" />
              </div>
            )}
            <div className="relative z-10 flex flex-col items-center">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-zinc-800 to-zinc-900 flex items-center justify-center mb-3 border border-zinc-700/50 shadow-lg">
                <VideoCamera size={32} weight="duotone" className="text-zinc-400" />
              </div>
              <p className="text-zinc-400 text-xs font-medium">비디오 없음</p>
            </div>
          </div>
        )}

        {/* Hover Expand Icon */}
        {!isGenerating && (
          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10 pointer-events-none">
            <ArrowsOutSimple
              size={36}
              weight="bold"
              className="text-white drop-shadow-[0_0_12px_rgba(255,255,255,0.3)]"
            />
          </div>
        )}

        {/* Shot ID */}
        <div className="absolute top-2 left-2 px-2.5 py-1 rounded-lg bg-black/70 backdrop-blur-md border border-white/10 text-xs font-mono font-semibold text-zinc-200 pointer-events-none z-10 shadow-lg">
          #{shot.kf_id}
        </div>
      </div>

      {/* 비디오 생성 버튼 */}
      <div className="p-2.5 bg-gradient-to-br from-zinc-900/80 to-zinc-950/80 backdrop-blur-sm border-t border-zinc-800/30">
        {(hasPrompt || hasStartFrame) && !isGenerating ? (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onGenerateVideo?.(selectedModel);
            }}
            className={`w-full py-2.5 rounded-lg text-white text-sm font-semibold flex items-center justify-center gap-2 transition-all duration-300 ${
              effectiveUrl
                ? 'bg-gradient-to-r from-zinc-700 to-zinc-800 hover:from-zinc-600 hover:to-zinc-700 shadow-md'
                : 'bg-gradient-to-r from-purple-600 via-pink-600 to-rose-600 hover:from-purple-500 hover:via-pink-500 hover:to-rose-500 shadow-lg shadow-purple-900/50 hover:shadow-purple-900/70 hover:scale-[1.02]'
            }`}
          >
            <Sparkle size={16} weight="duotone" className="drop-shadow-[0_0_4px_rgba(255,255,255,0.3)]" />
            {effectiveUrl ? '재생성' : 'AI 비디오 생성'}
            {hasStartFrame && <span className="px-1.5 py-0.5 rounded bg-white/20 text-[9px] font-bold">이미지</span>}
          </button>
        ) : !isGenerating ? (
          <div className="text-center text-xs text-zinc-500 py-2 font-medium">
            프롬프트 또는 이미지 필요
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default VideoCard;
