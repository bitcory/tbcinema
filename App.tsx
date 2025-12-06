import React, { useState } from 'react';
import InputSection from './components/InputSection';
import OutputSection from './components/OutputSection';
import Toast, { ToastType } from './components/Toast';
import { StoryboardData } from './types';
import { AnimatePresence } from 'framer-motion';

const App: React.FC = () => {
  const [viewMode, setViewMode] = useState<'input' | 'output'>('input');
  const [data, setData] = useState<StoryboardData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [userApiKey, setUserApiKey] = useState<string>(() => {
    // Load API key from localStorage on initial render
    if (typeof window !== 'undefined') {
      return localStorage.getItem('gemini_api_key') || '';
    }
    return '';
  });

  // Persistent Input State (maintained across page navigation)
  const [jsonInput, setJsonInput] = useState<string>('');
  const [refImage, setRefImage] = useState<string | null>(null);

  // Persistent Generated Data State
  const [generatedImages, setGeneratedImages] = useState<Record<number, string>>({});
  const [videoUrls, setVideoUrls] = useState<Record<number, string>>({});

  // Toast State
  const [toast, setToast] = useState<{ visible: boolean; message: string; type: ToastType }>({
    visible: false,
    message: '',
    type: 'success',
  });

  const showToast = (message: string, type: ToastType = 'success') => {
    setToast({ visible: true, message, type });
  };

  // Handler for setting API key with localStorage persistence
  const handleSetApiKey = (key: string) => {
    setUserApiKey(key);
    if (typeof window !== 'undefined') {
      if (key) {
        localStorage.setItem('gemini_api_key', key);
      } else {
        localStorage.removeItem('gemini_api_key');
      }
    }
  };

  const handleVisualize = (jsonInput: string, refImage?: string | null) => {
    setError(null);
    try {
      // 1. Get user input
      let rawInput = jsonInput;

      // 2. Strip Markdown code blocks
      if (rawInput.includes("```")) {
        rawInput = rawInput.replace(/```json/g, "").replace(/```/g, "");
      }

      // 3. Attempt Parsing
      const parsedData = JSON.parse(rawInput);

      // 4. Validate Data Structure (Simple check)
      if (!parsedData.storyboard_sequence || !Array.isArray(parsedData.storyboard_sequence)) {
        throw new Error("데이터 구조 오류: 'storyboard_sequence' 배열이 없습니다.");
      }
      
      if (!parsedData.project_meta) {
        // Fallback if meta is missing, though unlikely with good prompting
        parsedData.project_meta = {
            title: "제목 없는 프로젝트",
            logline: "로그라인이 제공되지 않았습니다."
        };
      }

      // Add reference image if exists
      if (refImage) {
        parsedData.reference_image = refImage;
      }

      // 5. Update State
      setData(parsedData);
      setViewMode('output');
      showToast('스토리보드가 생성되었습니다!', 'success');

    } catch (err) {
      console.error(err);
      const msg = err instanceof Error ? err.message : "JSON 파싱 실패";
      setError(`오류: ${msg}`);
      showToast('올바르지 않은 JSON 형식입니다. 입력을 확인해주세요.', 'error');
    }
  };

  const handleReset = () => {
    setViewMode('input');
    // Don't reset data, jsonInput, refImage - keep them for navigation back
    setError(null);
  };

  // Handler for updating generated images from OutputSection
  // Supports both direct value and functional update to handle concurrent updates
  const handleImagesUpdate = (imagesOrUpdater: Record<number, string> | ((prev: Record<number, string>) => Record<number, string>)) => {
    if (typeof imagesOrUpdater === 'function') {
      setGeneratedImages(imagesOrUpdater);
    } else {
      setGeneratedImages(imagesOrUpdater);
    }
  };

  // Handler for updating video URLs from OutputSection
  const handleVideosUpdate = (videos: Record<number, string>) => {
    setVideoUrls(videos);
  };

  // Handler for restoring data from backup file (used in InputSection)
  const handleRestoreData = (restoredData: StoryboardData, images: Record<number, string>, videos: Record<number, string>) => {
    setData(restoredData);
    setGeneratedImages(images);
    setVideoUrls(videos);

    // Also update jsonInput with the restored data for reference
    if (restoredData.reference_image) {
      setRefImage(restoredData.reference_image);
    }

    // Navigate to output view
    setViewMode('output');
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans selection:bg-indigo-500/30 selection:text-indigo-200">
      
      <AnimatePresence mode="wait">
        {viewMode === 'input' ? (
          <InputSection
            key="input"
            onVisualize={handleVisualize}
            error={error}
            userApiKey={userApiKey}
            onSetApiKey={handleSetApiKey}
            jsonInput={jsonInput}
            onJsonInputChange={setJsonInput}
            refImage={refImage}
            onRefImageChange={setRefImage}
            hasData={data !== null}
            onGoToOutput={() => setViewMode('output')}
            onRestoreData={handleRestoreData}
            onShowToast={(msg) => showToast(msg, 'success')}
          />
        ) : (
          <OutputSection
            key="output"
            data={data!}
            apiKey={userApiKey}
            onReset={handleReset}
            onCopyToast={(msg) => showToast(msg, 'success')}
            generatedImages={generatedImages}
            onImagesUpdate={handleImagesUpdate}
            videoUrls={videoUrls}
            onVideosUpdate={handleVideosUpdate}
          />
        )}
      </AnimatePresence>

      <Toast 
        message={toast.message}
        type={toast.type}
        isVisible={toast.visible}
        onClose={() => setToast(prev => ({ ...prev, visible: false }))}
      />
      
      {/* Background Ambience */}
      <div className="fixed inset-0 z-[-1] overflow-hidden pointer-events-none">
         <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-purple-900/10 blur-[120px]" />
         <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-indigo-900/10 blur-[120px]" />
      </div>
    </div>
  );
};

export default App;