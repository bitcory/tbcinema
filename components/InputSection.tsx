import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Code2, AlertTriangle, Upload, Image as ImageIcon, X, Settings, Key, Home, Grid, Video, HardDriveUpload, Link, Loader2, Wand2, ClipboardPaste } from 'lucide-react';

interface InputSectionProps {
  onVisualize: (jsonString: string, referenceImage?: string | null) => void;
  error?: string | null;
  userApiKey: string;
  onSetApiKey: (key: string) => void;
  jsonInput: string;
  onJsonInputChange: (value: string) => void;
  refImage: string | null;
  onRefImageChange: (value: string | null) => void;
  hasData: boolean;
  onGoToOutput: () => void;
  onRestoreData: (data: any, images: Record<number, string>, videos: Record<number, string>) => void;
  onShowToast: (message: string) => void;
}

const InputSection: React.FC<InputSectionProps> = ({
  onVisualize,
  error,
  userApiKey,
  onSetApiKey,
  jsonInput,
  onJsonInputChange,
  refImage,
  onRefImageChange,
  hasData,
  onGoToOutput,
  onRestoreData,
  onShowToast,
}) => {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [tempApiKey, setTempApiKey] = useState(userApiKey);
  const [showApiKeyWarning, setShowApiKeyWarning] = useState(false);

  // URL input state
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [imageUrl, setImageUrl] = useState('');
  const [isLoadingUrl, setIsLoadingUrl] = useState(false);
  const [urlError, setUrlError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const restoreInputRef = useRef<HTMLInputElement>(null);

  const handleVisualizeClick = () => {
    if (!userApiKey) {
      setShowApiKeyWarning(true);
      setIsSettingsOpen(true);
      return;
    }
    onVisualize(jsonInput, refImage);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Optional: Allow Ctrl+Enter to submit
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      handleVisualizeClick();
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        onRefImageChange(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const clearImage = () => {
    onRefImageChange(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    setImageUrl('');
    setUrlError(null);
  };

  // Load image from URL
  const handleLoadImageUrl = async () => {
    if (!imageUrl.trim()) return;

    setIsLoadingUrl(true);
    setUrlError(null);

    try {
      // Fetch the image
      const response = await fetch(imageUrl);
      if (!response.ok) {
        throw new Error('이미지를 불러올 수 없습니다.');
      }

      const blob = await response.blob();

      // Validate it's an image
      if (!blob.type.startsWith('image/')) {
        throw new Error('유효한 이미지 파일이 아닙니다.');
      }

      // Convert to base64
      const reader = new FileReader();
      reader.onloadend = () => {
        onRefImageChange(reader.result as string);
        setShowUrlInput(false);
        setImageUrl('');
        onShowToast('이미지 URL 로드 완료!');
      };
      reader.onerror = () => {
        throw new Error('이미지 변환 중 오류가 발생했습니다.');
      };
      reader.readAsDataURL(blob);
    } catch (error) {
      console.error('URL image load failed:', error);
      setUrlError(error instanceof Error ? error.message : '이미지를 불러올 수 없습니다.');
    } finally {
      setIsLoadingUrl(false);
    }
  };

  const handleSaveApiKey = () => {
    onSetApiKey(tempApiKey);
    setIsSettingsOpen(false);
    setShowApiKeyWarning(false);
  };

  // Restore: Upload and restore data from JSON backup
  const handleRestoreFile = (event: React.ChangeEvent<HTMLInputElement>) => {
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

        // Call parent to restore all data
        onRestoreData(
          backupData.data,
          backupData.generatedImages || {},
          backupData.videoUrls || {}
        );

        onShowToast('백업 데이터 복원 완료! 스토리보드로 이동합니다.');
      } catch (err) {
        console.error('Restore failed:', err);
        onShowToast('백업 파일 복원 실패. 파일 형식을 확인해주세요.');
      }
    };
    reader.readAsText(file);

    // Reset file input
    if (restoreInputRef.current) {
      restoreInputRef.current.value = '';
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Sidebar */}
      <div className="fixed left-0 top-0 h-full w-16 bg-zinc-950 border-r border-zinc-800 flex flex-col items-center py-4 z-50">
        {/* Logo / Home - Active */}
        <button
          className="p-3 rounded-xl bg-indigo-600 text-white transition-colors mb-6"
          title="START"
        >
          <Home size={22} />
        </button>

        {/* Navigation - Always enabled */}
        <div className="flex flex-col items-center gap-2">
          <button
            onClick={hasData ? onGoToOutput : undefined}
            className="p-3 rounded-xl transition-all hover:bg-zinc-900 text-zinc-500 hover:text-zinc-300 cursor-pointer"
            title="스토리보드"
          >
            <Grid size={20} />
          </button>
          <button
            onClick={hasData ? onGoToOutput : undefined}
            className="p-3 rounded-xl transition-all hover:bg-zinc-900 text-zinc-500 hover:text-zinc-300 cursor-pointer"
            title="비디오"
          >
            <Video size={20} />
          </button>
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Settings Button */}
        <button
          onClick={() => {
            setTempApiKey(userApiKey);
            setIsSettingsOpen(true);
          }}
          className={`p-3 rounded-xl transition-all mb-4 relative ${
            userApiKey
              ? 'hover:bg-zinc-900 text-zinc-400 hover:text-indigo-400'
              : 'bg-red-500/10 text-red-400 animate-pulse'
          }`}
          title="API 키 설정"
        >
          <Settings size={20} />
          {!userApiKey && (
            <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full"></span>
          )}
        </button>
      </div>

      {/* Main Content Area */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="flex-1 ml-16 flex flex-col items-center justify-center min-h-screen px-4 md:px-8 py-8 md:py-12"
      >
        {/* API Key Warning Banner */}
        {!userApiKey && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 bg-red-500/10 text-red-400 text-sm px-4 py-2 rounded-lg border border-red-500/20 font-medium"
          >
            API 키를 설정해주세요 (좌측 하단 설정 아이콘)
          </motion.div>
        )}

        <div className="text-center mb-8 space-y-2">
          <h1 className="text-3xl md:text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-b from-white to-zinc-500 tracking-tight break-keep">
            시네마틱 비주얼라이저
          </h1>
          <p className="text-zinc-400 text-base md:text-lg max-w-md mx-auto break-keep">
            API 키를 설정하고 JSON 스크립트를 입력하여 시각적인 스토리보드로 변환하세요.
          </p>
        </div>

        {/* 백업 복원 버튼 - 우측 상단 */}
        <div className="w-full max-w-6xl flex justify-end mb-3">
          <button
            onClick={() => restoreInputRef.current?.click()}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-zinc-900/80 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 text-zinc-400 hover:text-blue-400 text-sm transition-all"
          >
            <HardDriveUpload size={16} />
            <span>백업 복원</span>
          </button>
          <input
            ref={restoreInputRef}
            type="file"
            accept=".json"
            onChange={handleRestoreFile}
            className="hidden"
          />
        </div>

        <div className="w-full max-w-6xl grid lg:grid-cols-[1fr_300px] gap-6">
          {/* Main Editor */}
          <div className="relative group">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl opacity-20 group-hover:opacity-40 transition duration-500 blur"></div>
            <div className="relative bg-zinc-950 rounded-xl border border-zinc-800 shadow-2xl overflow-hidden flex flex-col h-[50vh] min-h-[400px]">

              {/* Editor Header */}
              <div className="flex items-center justify-between px-4 py-2 border-b border-zinc-800 bg-zinc-900/50">
                <div className="flex items-center gap-2">
                  <div className="flex gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-red-500/20 border border-red-500/50"></div>
                    <div className="w-3 h-3 rounded-full bg-yellow-500/20 border border-yellow-500/50"></div>
                    <div className="w-3 h-3 rounded-full bg-emerald-500/20 border border-emerald-500/50"></div>
                  </div>
                  <span className="ml-3 text-xs text-zinc-500 font-mono">script.json</span>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={async () => {
                      try {
                        const text = await navigator.clipboard.readText();
                        if (text) {
                          onJsonInputChange(text);
                          onShowToast('클립보드 내용이 붙여넣어졌습니다!');
                        } else {
                          onShowToast('클립보드가 비어있습니다.');
                        }
                      } catch (err) {
                        console.error('Clipboard read failed:', err);
                        onShowToast('클립보드 접근 권한이 필요합니다.');
                      }
                    }}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-indigo-600/20 hover:bg-indigo-600/40 text-indigo-400 hover:text-indigo-300 text-xs font-medium transition-all border border-indigo-500/30 hover:border-indigo-500/50"
                    title="클립보드에서 붙여넣기"
                  >
                    <ClipboardPaste size={12} />
                    <span>복붙하기</span>
                  </button>
                  <div className="text-xs text-zinc-600 flex items-center gap-1">
                    <Code2 size={12} />
                    <span>JSON 모드</span>
                  </div>
                </div>
              </div>

              <textarea
                value={jsonInput}
                onChange={(e) => onJsonInputChange(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder='여기에 JSON 스크립트를 붙여넣으세요...'
                className="w-full flex-1 p-6 bg-transparent text-zinc-300 font-mono text-sm resize-none focus:outline-none placeholder:text-zinc-700 leading-relaxed custom-scrollbar"
                spellCheck={false}
              />
            </div>
          </div>

          {/* Right Sidebar: Reference Image & Actions */}
          <div className="flex flex-col gap-4">
            {/* Reference Image Upload */}
            <div className="relative flex-1 rounded-xl border border-dashed border-zinc-800 bg-zinc-900/30 overflow-hidden min-h-[160px] flex flex-col">
              <input
                type="file"
                accept="image/*"
                ref={fileInputRef}
                className="hidden"
                onChange={handleImageUpload}
              />

              {refImage ? (
                <div className="flex-1 relative flex flex-col items-center justify-center p-4 text-center">
                  <img src={refImage} alt="Reference" className="absolute inset-0 w-full h-full object-cover opacity-50" />
                  <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"></div>
                  <div className="relative z-10 flex flex-col items-center">
                    <ImageIcon className="w-8 h-8 text-indigo-400 mb-2" />
                    <span className="text-xs text-zinc-200 font-medium">참조 이미지 추가됨</span>
                    <button
                      onClick={clearImage}
                      className="mt-2 p-1.5 bg-red-500/20 text-red-400 rounded-full hover:bg-red-500/40 transition-colors"
                    >
                      <X size={14} />
                    </button>
                  </div>
                </div>
              ) : showUrlInput ? (
                <div className="flex-1 flex flex-col items-center justify-center p-4 gap-3">
                  <div className="w-full">
                    <input
                      type="url"
                      value={imageUrl}
                      onChange={(e) => setImageUrl(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleLoadImageUrl()}
                      placeholder="이미지 URL 입력..."
                      className="w-full px-3 py-2 bg-zinc-950 border border-zinc-700 rounded-lg text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-indigo-500/50"
                      autoFocus
                    />
                    {urlError && (
                      <p className="text-xs text-red-400 mt-1">{urlError}</p>
                    )}
                  </div>
                  <div className="flex gap-2 w-full">
                    <button
                      onClick={() => { setShowUrlInput(false); setImageUrl(''); setUrlError(null); }}
                      className="flex-1 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs rounded-lg transition-colors"
                    >
                      취소
                    </button>
                    <button
                      onClick={handleLoadImageUrl}
                      disabled={!imageUrl.trim() || isLoadingUrl}
                      className="flex-1 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs rounded-lg transition-colors flex items-center justify-center gap-1"
                    >
                      {isLoadingUrl ? <Loader2 size={12} className="animate-spin" /> : <Link size={12} />}
                      불러오기
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center p-4 text-center">
                  <div className="w-12 h-12 rounded-full bg-zinc-800 flex items-center justify-center mb-3">
                    <Upload size={20} className="text-zinc-500" />
                  </div>
                  <span className="text-sm text-zinc-400 font-medium mb-1">참조 이미지 추가</span>
                  <span className="text-xs text-zinc-600 mb-3">(선택 사항)</span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs rounded-lg transition-colors flex items-center gap-1"
                    >
                      <Upload size={12} />
                      파일 업로드
                    </button>
                    <button
                      onClick={() => setShowUrlInput(true)}
                      className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs rounded-lg transition-colors flex items-center gap-1"
                    >
                      <Link size={12} />
                      URL 입력
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Submit Button */}
            <button
              onClick={handleVisualizeClick}
              disabled={!jsonInput.trim()}
              className="h-16 relative overflow-hidden group/btn px-6 rounded-xl bg-zinc-50 text-zinc-950 font-semibold text-base transition-all hover:bg-white hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none shadow-xl shadow-indigo-500/10"
            >
              <span className="relative z-10 flex items-center justify-center gap-2">
                스토리보드 생성
                <Sparkles size={18} className="group-hover/btn:animate-spin" />
              </span>
              <div className="absolute inset-0 bg-gradient-to-r from-indigo-400 via-purple-400 to-indigo-400 opacity-0 group-hover/btn:opacity-20 transition-opacity duration-300"></div>
            </button>
          </div>
        </div>

        <div className="w-full max-w-6xl flex justify-between items-center mt-3 px-1">
          <span className="text-xs text-zinc-500">
            {jsonInput.length > 0 ? `${jsonInput.length} 자` : '입력 대기 중...'}
          </span>
        </div>

        {/* 프롬프트 생성기 버튼 */}
        <a
          href="https://gemini.google.com/gem/11aAquDJTDgGsr8-0XTzYRv2XHVw7ZpI9?usp=sharing"
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 w-full max-w-6xl flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-semibold shadow-lg shadow-purple-500/25 transition-all hover:scale-[1.01] active:scale-[0.99]"
        >
          <Wand2 size={18} />
          <span>프롬프트 생성기로 JSON 만들기</span>
          <span className="text-xs bg-white/20 px-2 py-0.5 rounded ml-1">Gemini Gem</span>
        </a>

        {error && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4 flex items-center gap-2 text-red-400 bg-red-950/30 px-4 py-2 rounded-lg border border-red-900/50 text-sm break-keep"
          >
            <AlertTriangle size={16} />
            {error}
          </motion.div>
        )}

        <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-4 text-center w-full max-w-2xl">
          {['JSON 파싱', '참조 이미지 지원', '프롬프트 추출', '시각적 미리보기'].map((feature, i) => (
            <div key={i} className="px-3 py-1.5 rounded-md bg-zinc-900/50 border border-zinc-800 text-xs text-zinc-500 break-keep">
              {feature}
            </div>
          ))}
        </div>
      </motion.div>

      {/* API Key Modal */}
      <AnimatePresence>
        {isSettingsOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsSettingsOpen(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl p-6 overflow-hidden"
            >
              <div className="flex items-center gap-3 mb-4 text-zinc-100">
                <div className={`p-2 rounded-lg ${showApiKeyWarning ? 'bg-red-500/20 text-red-400' : 'bg-zinc-800 text-indigo-400'}`}>
                  <Key size={20} />
                </div>
                <h3 className="text-lg font-semibold">API 키 설정</h3>
              </div>

              <div className="space-y-4">
                {showApiKeyWarning && (
                  <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-300 text-xs">
                    이미지를 생성하려면 Google Gemini API 키가 필요합니다.
                  </div>
                )}

                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1.5">
                    Google Gemini API Key <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="password"
                    value={tempApiKey}
                    onChange={(e) => setTempApiKey(e.target.value)}
                    placeholder="AI Studio API 키 입력 (필수)"
                    className="w-full px-4 py-3 bg-zinc-950 border border-zinc-800 rounded-lg text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20 transition-all"
                  />
                  <p className="mt-2 text-[11px] text-zinc-500 leading-relaxed">
                    * AI Studio에서 발급받은 키를 입력하세요.<br/>
                    * 입력한 키는 브라우저 새로고침 시 초기화됩니다.
                  </p>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => setIsSettingsOpen(false)}
                    className="flex-1 px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm font-medium rounded-lg transition-colors"
                  >
                    취소
                  </button>
                  <button
                    onClick={handleSaveApiKey}
                    disabled={!tempApiKey.trim()}
                    className="flex-1 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors shadow-lg shadow-indigo-900/20"
                  >
                    저장하기
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default InputSection;