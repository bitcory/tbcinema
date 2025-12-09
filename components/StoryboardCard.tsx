import React, { useState } from 'react';
import { Copy, Video, Image as ImageIcon, Clapperboard, Sparkles, Loader2, Maximize2, FileText, Check } from 'lucide-react';
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
  const [copiedType, setCopiedType] = useState<string | null>(null);

  // Use generated image or asset image, no external fallback
  const imageUrl = generatedImage || shot.assets?.image_url || null;
  const hasVideo = !!shot.assets?.video_url;

  const handleCopy = (text: string, type: string) => {
    onCopy(text, type);
    setCopiedType(type);
    setTimeout(() => setCopiedType(null), 2000);
  };

  return (
    <div
      className="flex flex-col lg:flex-row bg-zinc-900/40 rounded-lg border border-zinc-800/50 hover:border-zinc-700 transition-colors duration-300 overflow-hidden"
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
    >
      {/* 좌측: 이미지 섹션 */}
      <div className="w-full lg:w-[360px] xl:w-[400px] flex-shrink-0 flex flex-col">
        {/* 이미지 영역 */}
        <div
          className="relative aspect-video bg-zinc-950 overflow-hidden group/image cursor-pointer"
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
              className={`w-full h-full object-cover transition-transform duration-700 ${isGenerating ? 'scale-100 opacity-50 blur-sm' : 'group-hover/image:scale-105'}`}
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-zinc-900">
              <div className="text-center text-zinc-600">
                <ImageIcon size={32} className="mx-auto mb-2 opacity-50" />
                <span className="text-xs">이미지 없음</span>
              </div>
            </div>
          )}

          {/* Loading Overlay */}
          {isGenerating && (
            <div className="absolute inset-0 flex items-center justify-center z-20 bg-black/40">
              <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
            </div>
          )}

          {/* Hover Expand Icon */}
          {!isGenerating && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 group-hover/image:opacity-100 transition-opacity z-10 pointer-events-none">
              <Maximize2 className="text-white/80 drop-shadow-lg" size={32} />
            </div>
          )}

          {/* Shot ID */}
          <div className="absolute top-1.5 left-1.5 px-2 py-0.5 rounded bg-black/60 backdrop-blur-md border border-white/10 text-xs font-mono text-zinc-300 pointer-events-none z-10">
            #{shot.kf_id}
          </div>

          {/* Shot Type Badge */}
          <div className="absolute top-1.5 right-1.5 px-1.5 py-0.5 rounded bg-zinc-800/80 backdrop-blur-md text-[10px] font-bold text-zinc-200 border border-zinc-700 shadow-lg z-10">
            {shot.shot_type}
          </div>
        </div>

        {/* 이미지 생성 버튼 - 이미지 아래 배치 */}
        <div className="p-2 bg-zinc-900/60 border-t border-zinc-800/50">
          {shot.prompts?.image_gen ? (
            <button
              onClick={onGenerate}
              disabled={isGenerating}
              className={`w-full py-2 rounded-md text-white text-sm font-medium flex items-center justify-center gap-1.5 transition-all ${
                generatedImage
                  ? 'bg-zinc-700 hover:bg-zinc-600'
                  : 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {isGenerating ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Sparkles size={14} />
              )}
              {generatedImage ? '재생성' : 'AI 이미지 생성'}
            </button>
          ) : (
            <div className="text-center text-xs text-zinc-500 py-1">
              이미지 프롬프트 없음
            </div>
          )}
        </div>
      </div>

      {/* 우측: 장면 설명 & 프롬프트 */}
      <div className="flex-1 p-3 flex flex-col gap-3 min-w-0 border-t lg:border-t-0 lg:border-l border-zinc-800/50">
        {/* 장면 설명 */}
        <div className="flex flex-col">
          <label className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500 mb-1 flex items-center gap-1">
            <Clapperboard size={10} />
            장면 설명
          </label>
          <p className="text-zinc-300 text-xs leading-relaxed whitespace-pre-line break-keep line-clamp-3">
            {shot.visual_description}
          </p>
        </div>

        {/* 이미지 프롬프트 */}
        {shot.prompts?.image_gen && (
          <div className="flex flex-col">
            <div className="flex items-center justify-between mb-1">
              <label className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500 flex items-center gap-1">
                <ImageIcon size={10} className="text-purple-400" />
                이미지 프롬프트
              </label>
              <button
                onClick={() => handleCopy(shot.prompts!.image_gen, 'image')}
                className={`p-1 rounded transition-all ${
                  copiedType === 'image'
                    ? 'bg-emerald-600/20 text-emerald-400'
                    : 'hover:bg-zinc-800 text-zinc-500 hover:text-zinc-300'
                }`}
                title="프롬프트 복사"
              >
                {copiedType === 'image' ? <Check size={12} /> : <Copy size={12} />}
              </button>
            </div>
            <div className="px-2.5 py-2 bg-zinc-950 border border-zinc-800 rounded text-xs text-zinc-400 leading-relaxed font-mono overflow-auto max-h-[60px]">
              {shot.prompts.image_gen}
            </div>
          </div>
        )}

        {/* 비디오 프롬프트 */}
        {shot.prompts?.video_gen && (
          <div className="flex flex-col">
            <div className="flex items-center justify-between mb-1">
              <label className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500 flex items-center gap-1">
                <Video size={10} className="text-pink-400" />
                비디오 프롬프트
              </label>
              <button
                onClick={() => handleCopy(shot.prompts!.video_gen, 'video')}
                className={`p-1 rounded transition-all ${
                  copiedType === 'video'
                    ? 'bg-emerald-600/20 text-emerald-400'
                    : 'hover:bg-zinc-800 text-zinc-500 hover:text-zinc-300'
                }`}
                title="프롬프트 복사"
              >
                {copiedType === 'video' ? <Check size={12} /> : <Copy size={12} />}
              </button>
            </div>
            <div className="px-2.5 py-2 bg-zinc-950 border border-zinc-800 rounded text-xs text-zinc-400 leading-relaxed font-mono overflow-auto max-h-[60px]">
              {shot.prompts.video_gen}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default StoryboardCard;