// IndexedDB 유틸리티 - 비디오 blob 저장용

const DB_NAME = 'storyboard-videos-db';
const DB_VERSION = 1;
const STORE_NAME = 'videos';

interface VideoEntry {
  id: string; // 예: "video_0", "thumbnail_0"
  blob: Blob;
  createdAt: number;
}

let dbInstance: IDBDatabase | null = null;

/**
 * IndexedDB 연결 초기화
 */
export const initDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    if (dbInstance) {
      resolve(dbInstance);
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      reject(new Error('IndexedDB 열기 실패'));
    };

    request.onsuccess = () => {
      dbInstance = request.result;
      resolve(dbInstance);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
  });
};

/**
 * Blob 저장
 */
export const setBlob = async (id: string, blob: Blob): Promise<void> => {
  const db = await initDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);

    const entry: VideoEntry = {
      id,
      blob,
      createdAt: Date.now(),
    };

    const request = store.put(entry);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(new Error(`Blob 저장 실패: ${id}`));
  });
};

/**
 * Blob 가져오기
 */
export const getBlob = async (id: string): Promise<Blob | null> => {
  const db = await initDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(id);

    request.onsuccess = () => {
      const entry = request.result as VideoEntry | undefined;
      resolve(entry?.blob || null);
    };
    request.onerror = () => reject(new Error(`Blob 가져오기 실패: ${id}`));
  });
};

/**
 * Blob 삭제
 */
export const deleteBlob = async (id: string): Promise<void> => {
  const db = await initDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.delete(id);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(new Error(`Blob 삭제 실패: ${id}`));
  });
};

/**
 * 모든 Blob 삭제
 */
export const clearAllBlobs = async (): Promise<void> => {
  const db = await initDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.clear();

    request.onsuccess = () => resolve();
    request.onerror = () => reject(new Error('전체 Blob 삭제 실패'));
  });
};

/**
 * Blob을 Object URL로 변환 (메모리 관리 필요)
 */
export const getBlobUrl = async (id: string): Promise<string | null> => {
  const blob = await getBlob(id);
  if (!blob) return null;
  return URL.createObjectURL(blob);
};

/**
 * 비디오 썸네일 생성
 */
export const generateThumbnail = (videoBlob: Blob): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    video.preload = 'metadata';
    video.muted = true;
    video.playsInline = true;

    const objectUrl = URL.createObjectURL(videoBlob);
    video.src = objectUrl;

    video.onloadedmetadata = () => {
      // 비디오 크기 설정
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      // 첫 프레임으로 이동
      video.currentTime = 0.1; // 약간의 오프셋
    };

    video.onseeked = () => {
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        canvas.toBlob((blob) => {
          URL.revokeObjectURL(objectUrl);
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('썸네일 생성 실패'));
          }
        }, 'image/jpeg', 0.8);
      }
    };

    video.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('비디오 로드 실패'));
    };
  });
};
