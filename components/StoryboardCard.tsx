import React, { useState } from 'react';
import { Copy, Video, Image as ImageIcon, Clapperboard, Sparkles, Loader2, Maximize2 } from 'lucide-react';
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

  // Fallback image if no URL provided and no generated image
  const imageUrl = generatedImage || shot.assets?.image_url || `https://picsum.photos/seed/${shot.kf_id || index}/800/450`;
  const hasVideo = !!shot.assets?.video_url;

  return (
    <div 
      className="group relative flex flex-col h-full bg-zinc-900/40 rounded-xl border border-zinc-800/50 hover:border-zinc-700 transition-colors duration-300 overflow-hidden"
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
    >
      {/* Visual Header */}
      <div 
        className="relative aspect-video bg-zinc-950 overflow-hidden border-b border-zinc-800/50 group/image cursor-pointer"
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
        ) : (
          <img 
            src={imageUrl} 
            alt={`Shot ${shot.kf_id}`} 
            className={`w-full h-full object-cover transition-transform duration-700 ${isGenerating ? 'scale-100 opacity-50 blur-sm' : 'group-hover:scale-105'}`}
            loading="lazy"
          />
        )}
        
        {/* Loading Overlay */}
        {isGenerating && (
            <div className="absolute inset-0 flex items-center justify-center z-20">
                <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
            </div>
        )}
        
        {/* Hover Expand Icon */}
        {!isGenerating && (
           <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 group-hover/image:opacity-100 transition-opacity z-10 pointer-events-none">
             <Maximize2 className="text-white/80 drop-shadow-lg" size={32} />
           </div>
        )}

        {/* Overlays */}
        <div className="absolute top-2 left-2 px-2 py-1 rounded bg-black/60 backdrop-blur-md border border-white/10 text-xs font-mono text-zinc-300 z-10 pointer-events-none">
          #{shot.kf_id}
        </div>
        
        <div className="absolute top-2 right-2 flex items-center gap-2 z-10" onClick={(e) => e.stopPropagation()}>
            {/* Generate Button */}
            <button
                onClick={onGenerate}
                disabled={isGenerating || !shot.prompts?.image_gen}
                className="p-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed group/gen"
                title="Gemini로 이미지 생성"
            >
                {isGenerating ? (
                    <Loader2 size={12} className="animate-spin" />
                ) : (
                    <Sparkles size={12} fill="currentColor" className="text-indigo-100" />
                )}
            </button>

            {/* Shot Type Badge */}
            <div className="px-2 py-1 rounded bg-zinc-800/80 backdrop-blur-md text-xs font-bold text-zinc-200 border border-zinc-700 shadow-lg">
                {shot.shot_type}
            </div>
        </div>
      </div>

      {/* Content Body */}
      <div className="flex-1 p-5 flex flex-col gap-4">
        
        {/* Visual Description */}
        <div className="flex-1">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-2 flex items-center gap-1.5">
               <Clapperboard size={12} />
               장면 설명
            </h4>
            <p className="text-zinc-300 text-sm leading-relaxed whitespace-pre-line break-keep">
              {shot.visual_description}
            </p>
        </div>

        {/* Prompt Actions */}
        <div className="grid grid-cols-1 gap-2 pt-4 border-t border-zinc-800/50 mt-auto">
          {shot.prompts?.image_gen && (
            <button
              onClick={() => onCopy(shot.prompts!.image_gen, 'Image Prompt')}
              className="flex items-center justify-between px-3 py-2 rounded-lg bg-zinc-800/50 hover:bg-zinc-800 border border-zinc-700/50 hover:border-zinc-600 transition-all group/btn text-xs text-zinc-400 hover:text-zinc-200"
            >
              <div className="flex items-center gap-2">
                <ImageIcon size={14} className="text-purple-400" />
                <span>이미지 프롬프트 복사</span>
              </div>
              <Copy size={12} className="opacity-0 group-hover/btn:opacity-100 transition-opacity" />
            </button>
          )}

          {shot.prompts?.video_gen && (
            <button
              onClick={() => onCopy(shot.prompts!.video_gen, 'Video Prompt')}
              className="flex items-center justify-between px-3 py-2 rounded-lg bg-zinc-800/50 hover:bg-zinc-800 border border-zinc-700/50 hover:border-zinc-600 transition-all group/btn text-xs text-zinc-400 hover:text-zinc-200"
            >
              <div className="flex items-center gap-2">
                <Video size={14} className="text-pink-400" />
                <span>비디오 프롬프트 복사</span>
              </div>
              <Copy size={12} className="opacity-0 group-hover/btn:opacity-100 transition-opacity" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default StoryboardCard;