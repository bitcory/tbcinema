import React, { useState, useEffect, useRef } from 'react';
import { Video, Save, Edit2, Download, Upload, Clapperboard, Play, Trash2 } from 'lucide-react';
import { StoryboardShot } from '../types';

interface VideoCardProps {
  shot: StoryboardShot;
  index: number;
  savedUrl?: string | null;
  onSave: (url: string) => void;
  onCopy: (text: string, type: string) => void;
}

const VideoCard: React.FC<VideoCardProps> = ({ shot, index, savedUrl, onSave, onCopy }) => {
  const [isEditing, setIsEditing] = useState(!savedUrl);
  const [inputValue, setInputValue] = useState(savedUrl || '');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (savedUrl) {
      setInputValue(savedUrl);
      setIsEditing(false);
    }
  }, [savedUrl]);

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
      setInputValue(objectUrl); // Keep input in sync roughly
      setIsEditing(false);
    }
  };

  const handleDownload = async () => {
    if (!savedUrl) return;
    try {
      const response = await fetch(savedUrl);
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
      // Fallback for direct link if fetch fails
      window.open(savedUrl, '_blank');
    }
  };

  return (
    <div className="flex flex-col h-full bg-zinc-900/40 rounded-xl border border-zinc-800/50 hover:border-zinc-700 transition-colors duration-300 overflow-hidden">
      {/* Video Preview Area */}
      <div className="relative aspect-video bg-zinc-950 overflow-hidden border-b border-zinc-800/50 group">
        {!isEditing && savedUrl ? (
          <>
            <video 
              src={savedUrl} 
              controls 
              className="w-full h-full object-cover"
              preload="metadata"
            >
              브라우저가 비디오 태그를 지원하지 않습니다.
            </video>
            
            <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
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
             <div className="w-12 h-12 rounded-full bg-zinc-800 flex items-center justify-center mb-4 border border-zinc-700/50">
                <Video className="text-zinc-600" />
             </div>
             {isEditing ? (
               <div className="w-full max-w-xs space-y-3">
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
                        className="p-2 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-lg text-zinc-400 hover:text-white transition-colors"
                        title="로컬 동영상 업로드"
                    >
                        <Upload size={18} />
                    </button>
                    <input 
                        type="file" 
                        ref={fileInputRef} 
                        className="hidden" 
                        accept="video/*" 
                        onChange={handleFileUpload} 
                    />
                 </div>
                 
                 <div className="flex gap-2">
                    {savedUrl && (
                        <button 
                            onClick={() => setIsEditing(false)}
                            className="px-3 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold rounded-lg transition-colors"
                        >
                            취소
                        </button>
                    )}
                    <button 
                    onClick={handleSave}
                    disabled={!inputValue.trim()}
                    className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
                    >
                    <Save size={14} />
                    저장
                    </button>
                 </div>
               </div>
             ) : (
                <button 
                  onClick={() => setIsEditing(true)}
                  className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs rounded-lg transition-colors"
                >
                  동영상 추가
                </button>
             )}
          </div>
        )}

        {/* Shot ID Overlay */}
        <div className="absolute top-2 left-2 px-2 py-1 rounded bg-black/60 backdrop-blur-md border border-white/10 text-xs font-mono text-zinc-300 pointer-events-none z-10">
          #{shot.kf_id}
        </div>
      </div>

      {/* Info Body */}
      <div className="flex-1 p-5 flex flex-col gap-4">
        <div className="flex-1">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-2 flex items-center gap-1.5">
               <Clapperboard size={12} />
               장면 설명
            </h4>
            <p className="text-zinc-300 text-sm leading-relaxed line-clamp-3 break-keep">
              {shot.visual_description}
            </p>
        </div>

        {/* Video Prompt Copy */}
        {shot.prompts?.video_gen && (
            <div className="pt-4 border-t border-zinc-800/50 mt-auto">
                <button
                onClick={() => onCopy(shot.prompts!.video_gen, 'Video Prompt')}
                className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-zinc-800/50 hover:bg-zinc-800 border border-zinc-700/50 hover:border-zinc-600 transition-all group/btn text-xs text-zinc-400 hover:text-zinc-200"
                >
                <div className="flex items-center gap-2">
                    <Video size={14} className="text-pink-400" />
                    <span>비디오 프롬프트 복사</span>
                </div>
                <Play size={12} className="opacity-0 group-hover/btn:opacity-100 transition-opacity" />
                </button>
            </div>
        )}
      </div>
    </div>
  );
};

export default VideoCard;