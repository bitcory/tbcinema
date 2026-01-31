import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, DownloadSimple, ArrowClockwise, Sparkle, CircleNotch, Copy, Check, FilmStrip, Image as ImageIconPhosphor, VideoCamera } from 'phosphor-react';

interface ImageModalProps {
  isOpen: boolean;
  imageUrl: string | null;
  initialPrompt?: string;
  onClose: () => void;
  onRegenerate: (newPrompt: string) => Promise<void>;
  isRegenerating?: boolean;
  title?: string;
  visualDescription?: string;
  videoPrompt?: string;
  onCopy?: (text: string, label: string) => void;
}

const ImageModal: React.FC<ImageModalProps> = ({
  isOpen,
  imageUrl,
  initialPrompt = '',
  onClose,
  onRegenerate,
  isRegenerating = false,
  title,
  visualDescription,
  videoPrompt,
  onCopy
}) => {
  const [prompt, setPrompt] = useState(initialPrompt);
  const [copiedType, setCopiedType] = useState<string | null>(null);

  // Update prompt when modal opens with new data
  useEffect(() => {
    if (isOpen) {
      setPrompt(initialPrompt);
    }
  }, [isOpen, initialPrompt]);

  if (!imageUrl && !isRegenerating) return null;

  const handleDownloadSimple = () => {
    if (!imageUrl) return;
    const link = document.createElement('a');
    link.href = imageUrl;
    link.download = `storyboard-${title || 'image'}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleRegenerateClick = () => {
    if (prompt.trim()) {
        onRegenerate(prompt);
    }
  };

  const handleCopyInternal = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    if (onCopy) {
      onCopy(text, type);
    }
    setCopiedType(type);
    setTimeout(() => setCopiedType(null), 2000);
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
            {/* Left: Image Viewer */}
            <div className="relative flex items-center justify-center bg-zinc-900/50 h-1/2 md:h-full p-4 overflow-hidden group">
               {/* Header Overlay */}
               <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-start z-10 pointer-events-none">
                  <span className="text-white/80 font-mono text-xs px-2 py-1 bg-black/50 backdrop-blur-md rounded border border-white/10">
                    {title || 'View'}
                  </span>
                  <div className="flex gap-2 pointer-events-auto">
                    <button
                      onClick={handleDownloadSimple}
                      className="p-2 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-md text-white transition-colors"
                      title="이미지 다운로드"
                    >
                      <DownloadSimple size={20} />
                    </button>
                    <button
                      onClick={onClose}
                      className="p-2 rounded-full bg-white/10 hover:bg-red-500/50 backdrop-blur-md text-white transition-colors"
                    >
                      <X size={20} />
                    </button>
                  </div>
                </div>

                {isRegenerating ? (
                   <div className="flex flex-col items-center gap-4 text-indigo-400">
                      <CircleNotch size={48} className="animate-spin" />
                      <span className="text-sm font-medium animate-pulse">새로운 이미지 생성 중...</span>
                   </div>
                ) : (
                    <img
                        src={imageUrl || ''}
                        alt={title || "Full view"}
                        className="w-full h-full object-contain shadow-2xl"
                    />
                )}
            </div>

            {/* Right: Info & Controls */}
            <div className="flex flex-col h-1/2 md:h-full border-t md:border-t-0 md:border-l border-zinc-800 bg-zinc-950/80 backdrop-blur-xl overflow-y-auto">
               <div className="p-4 border-b border-zinc-800 bg-zinc-900/50">
                  <h3 className="text-sm font-semibold text-zinc-200 flex items-center gap-2">
                     <Sparkle size={14} className="text-indigo-400" />
                     샷 정보
                  </h3>
               </div>

               <div className="flex-1 p-4 flex flex-col gap-6 overflow-y-auto">
                  {/* 장면 설명 */}
                  {visualDescription && (
                    <div className="flex flex-col gap-2">
                      <label className="text-sm font-semibold uppercase tracking-wider text-zinc-500 flex items-center gap-1.5">
                        <FilmStrip size={14} />
                        장면 설명
                      </label>
                      <p className="text-zinc-300 text-lg leading-relaxed whitespace-pre-line break-keep bg-zinc-900/50 p-3 rounded-lg border border-zinc-800">
                        {visualDescription}
                      </p>
                    </div>
                  )}

                  {/* 이미지 프롬프트 */}
                  {initialPrompt && (
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center justify-between">
                        <label className="text-sm font-semibold uppercase tracking-wider text-zinc-500 flex items-center gap-1.5">
                          <ImageIconPhosphor size={14} className="text-purple-400" />
                          이미지 프롬프트
                        </label>
                        <button
                          onClick={() => handleCopyInternal(initialPrompt, '이미지 프롬프트')}
                          className={`p-1.5 rounded transition-all ${
                            copiedType === '이미지 프롬프트'
                              ? 'bg-emerald-600/20 text-emerald-400'
                              : 'hover:bg-zinc-800 text-zinc-500 hover:text-zinc-300'
                          }`}
                          title="프롬프트 복사"
                        >
                          {copiedType === '이미지 프롬프트' ? <Check size={16} /> : <Copy size={16} />}
                        </button>
                      </div>
                      <div className="px-3 py-2.5 bg-zinc-900 border border-zinc-800 rounded-lg text-base text-zinc-400 leading-relaxed overflow-auto max-h-[120px]">
                        {initialPrompt}
                      </div>
                    </div>
                  )}

                  {/* 비디오 프롬프트 */}
                  {videoPrompt && (
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center justify-between">
                        <label className="text-sm font-semibold uppercase tracking-wider text-zinc-500 flex items-center gap-1.5">
                          <VideoCamera size={14} className="text-pink-400" />
                          비디오 프롬프트
                        </label>
                        <button
                          onClick={() => handleCopyInternal(videoPrompt, '비디오 프롬프트')}
                          className={`p-1.5 rounded transition-all ${
                            copiedType === '비디오 프롬프트'
                              ? 'bg-emerald-600/20 text-emerald-400'
                              : 'hover:bg-zinc-800 text-zinc-500 hover:text-zinc-300'
                          }`}
                          title="프롬프트 복사"
                        >
                          {copiedType === '비디오 프롬프트' ? <Check size={16} /> : <Copy size={16} />}
                        </button>
                      </div>
                      <div className="px-3 py-2.5 bg-zinc-900 border border-zinc-800 rounded-lg text-base text-zinc-400 leading-relaxed overflow-auto max-h-[120px]">
                        {videoPrompt}
                      </div>
                    </div>
                  )}

                  {/* 이미지 재생성 섹션 */}
                  <div className="flex flex-col gap-2 pt-4 border-t border-zinc-800">
                    <label className="text-sm font-semibold uppercase tracking-wider text-zinc-500 flex items-center gap-1.5">
                      <ArrowClockwise size={14} className="text-indigo-400" />
                      이미지 재생성
                    </label>
                    <textarea
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                      className="w-full min-h-[100px] bg-zinc-900 border border-zinc-800 rounded-lg p-3 text-sm text-zinc-300 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20 resize-none leading-relaxed"
                      placeholder="프롬프트를 수정하여 이미지를 재생성하세요..."
                    />
                    <button
                      onClick={handleRegenerateClick}
                      disabled={isRegenerating || !prompt.trim()}
                      className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-all hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-2 shadow-lg shadow-indigo-900/20"
                    >
                      {isRegenerating ? (
                        <>
                          <CircleNotch size={16} className="animate-spin" />
                          생성 중...
                        </>
                      ) : (
                        <>
                          <Sparkle size={16} />
                          재생성
                        </>
                      )}
                    </button>
                    <p className="text-[10px] text-zinc-500 italic text-center">
                      프롬프트를 수정하여 조명, 카메라 앵글, 세부 사항을 변경할 수 있습니다
                    </p>
                  </div>
               </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ImageModal;