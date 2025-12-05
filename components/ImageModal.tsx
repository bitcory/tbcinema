import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Download, RefreshCw, Sparkles, Loader2 } from 'lucide-react';

interface ImageModalProps {
  isOpen: boolean;
  imageUrl: string | null;
  initialPrompt?: string;
  onClose: () => void;
  onRegenerate: (newPrompt: string) => Promise<void>;
  isRegenerating?: boolean;
  title?: string;
}

const ImageModal: React.FC<ImageModalProps> = ({ 
  isOpen, 
  imageUrl, 
  initialPrompt = '', 
  onClose, 
  onRegenerate, 
  isRegenerating = false, 
  title 
}) => {
  const [prompt, setPrompt] = useState(initialPrompt);

  // Update prompt when modal opens with new data
  useEffect(() => {
    if (isOpen) {
      setPrompt(initialPrompt);
    }
  }, [isOpen, initialPrompt]);

  if (!imageUrl && !isRegenerating) return null;

  const handleDownload = () => {
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
            className="relative w-full max-w-[95vw] h-full md:h-[90vh] flex flex-col md:grid md:grid-cols-[1fr_400px] bg-zinc-950 rounded-2xl overflow-hidden shadow-2xl border border-zinc-800"
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
                      onClick={handleDownload}
                      className="p-2 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-md text-white transition-colors"
                      title="이미지 다운로드"
                    >
                      <Download size={20} />
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
                      <Loader2 size={48} className="animate-spin" />
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

            {/* Right: Controls & Prompt */}
            <div className="flex flex-col h-1/2 md:h-full border-t md:border-t-0 md:border-l border-zinc-800 bg-zinc-950/80 backdrop-blur-xl">
               <div className="p-4 border-b border-zinc-800">
                  <h3 className="text-sm font-semibold text-zinc-200 flex items-center gap-2">
                     <Sparkles size={14} className="text-indigo-400" />
                     이미지 재생성
                  </h3>
               </div>
               
               <div className="flex-1 p-4 flex flex-col gap-4 overflow-y-auto">
                  <div className="space-y-2 flex-1 flex flex-col">
                     <label className="text-xs font-medium text-zinc-500 uppercase tracking-wider">프롬프트</label>
                     <textarea
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        className="w-full flex-1 min-h-[120px] bg-zinc-900 border border-zinc-800 rounded-lg p-3 text-sm text-zinc-300 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20 resize-none leading-relaxed custom-scrollbar"
                        placeholder="생성하고 싶은 이미지를 묘사하세요..."
                     />
                  </div>
                  
                  <div className="p-3 rounded-lg bg-zinc-900/50 border border-zinc-800 text-xs text-zinc-500 italic break-keep">
                     팁: 프롬프트를 수정하여 조명, 카메라 앵글, 또는 세부 사항을 변경할 수 있습니다.
                  </div>
               </div>

               <div className="p-4 border-t border-zinc-800 bg-zinc-900/30">
                  <button
                     onClick={handleRegenerateClick}
                     disabled={isRegenerating || !prompt.trim()}
                     className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2 shadow-lg shadow-indigo-900/20"
                  >
                     {isRegenerating ? (
                        <>
                           <Loader2 size={16} className="animate-spin" />
                           생성 중...
                        </>
                     ) : (
                        <>
                           <RefreshCw size={16} />
                           재생성
                        </>
                     )}
                  </button>
               </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ImageModal;