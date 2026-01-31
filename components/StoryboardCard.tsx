import React, { useState } from 'react';
import { Image as ImageIconPhosphor, Sparkle, CircleNotch, ArrowsOutSimple } from 'phosphor-react';
import { StoryboardShot } from '../types';

interface StoryboardCardProps {
  shot: StoryboardShot;
  index: number;
  onCopy: (text: string, type: string) => void;
  generatedImage?: string | null;
  isGenerating?: boolean;
  onGenerate: () => void;
  onExpand: () => void;
}

const StoryboardCard: React.FC<StoryboardCardProps> = ({
  shot,
  index,
  onCopy,
  generatedImage,
  isGenerating = false,
  onGenerate,
  onExpand
}) => {
  const [isHovering, setIsHovering] = useState(false);

  // Use generated image or asset image, no external fallback
  const imageUrl = generatedImage || shot.assets?.image_url || null;
  const hasVideo = !!shot.assets?.video_url;

  return (
    <div
      className="flex flex-col bg-zinc-900/60 backdrop-blur-xl rounded-xl border border-zinc-800/50 hover:border-indigo-500/30 transition-all duration-300 overflow-hidden group shadow-xl shadow-black/50 hover:shadow-indigo-900/20"
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
    >
      {/* 이미지 영역 */}
      <div
        className="relative aspect-video bg-gradient-to-br from-zinc-950 to-zinc-900 overflow-hidden cursor-pointer"
        onClick={onExpand}
      >
        {hasVideo && isHovering && !generatedImage ? (
          <video
            src={shot.assets?.video_url}
            autoPlay
            muted
            loop
            className="w-full h-full object-cover animate-in fade-in duration-300"
          />
        ) : imageUrl ? (
          <img
            src={imageUrl}
            alt={`Shot ${shot.kf_id}`}
            className={`w-full h-full object-cover transition-all duration-700 ${isGenerating ? 'scale-100 opacity-50 blur-sm' : 'group-hover:scale-110'}`}
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-zinc-900 to-zinc-950">
            <div className="text-center text-zinc-600">
              <ImageIconPhosphor size={40} weight="duotone" className="mx-auto mb-2 opacity-40" />
              <span className="text-xs font-medium">이미지 없음</span>
            </div>
          </div>
        )}

        {/* Loading Overlay */}
        {isGenerating && (
          <div className="absolute inset-0 flex items-center justify-center z-20 bg-black/60 backdrop-blur-sm">
            <div className="flex flex-col items-center gap-2">
              <CircleNotch size={32} weight="bold" className="text-indigo-400 animate-spin" />
              <span className="text-xs text-zinc-300 font-medium">생성 중...</span>
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

        {/* Shot Type Badge */}
        <div className="absolute top-2 right-2 px-2.5 py-1 rounded-lg bg-gradient-to-br from-zinc-800/90 to-zinc-900/90 backdrop-blur-md text-[10px] font-bold text-zinc-100 border border-zinc-700/50 shadow-lg z-10">
          {shot.shot_type}
        </div>
      </div>

      {/* 이미지 생성 버튼 */}
      <div className="p-2.5 bg-gradient-to-br from-zinc-900/80 to-zinc-950/80 backdrop-blur-sm border-t border-zinc-800/30">
        {shot.prompts?.image_gen ? (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onGenerate();
            }}
            disabled={isGenerating}
            className={`w-full py-2.5 rounded-lg text-white text-sm font-semibold flex items-center justify-center gap-2 transition-all duration-300 ${
              generatedImage
                ? 'bg-gradient-to-r from-zinc-700 to-zinc-800 hover:from-zinc-600 hover:to-zinc-700 shadow-md'
                : 'bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:from-indigo-500 hover:via-purple-500 hover:to-pink-500 shadow-lg shadow-indigo-900/50 hover:shadow-indigo-900/70 hover:scale-[1.02]'
            } disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]`}
          >
            {isGenerating ? (
              <CircleNotch size={16} weight="bold" className="animate-spin" />
            ) : (
              <Sparkle size={16} weight="duotone" className="drop-shadow-[0_0_4px_rgba(255,255,255,0.3)]" />
            )}
            {generatedImage ? '재생성' : 'AI 이미지 생성'}
          </button>
        ) : (
          <div className="text-center text-xs text-zinc-500 py-2 font-medium">
            이미지 프롬프트 없음
          </div>
        )}
      </div>
    </div>
  );
};

export default StoryboardCard;
