import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, AlertCircle, X } from 'lucide-react';

export type ToastType = 'success' | 'error';

interface ToastProps {
  message: string;
  type: ToastType;
  isVisible: boolean;
  onClose: () => void;
}

const Toast: React.FC<ToastProps> = ({ message, type, isVisible, onClose }) => {
  useEffect(() => {
    if (isVisible) {
      const timer = setTimeout(() => {
        onClose();
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [isVisible, onClose]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-4 py-3 rounded-lg shadow-2xl border border-zinc-800 bg-zinc-900/90 backdrop-blur-md text-sm font-medium"
        >
          {type === 'success' ? (
            <div className="p-1 rounded-full bg-emerald-500/20 text-emerald-400">
              <Check size={16} strokeWidth={3} />
            </div>
          ) : (
            <div className="p-1 rounded-full bg-red-500/20 text-red-400">
              <AlertCircle size={16} strokeWidth={3} />
            </div>
          )}
          <span className="text-zinc-200">{message}</span>
          <button onClick={onClose} className="ml-2 text-zinc-500 hover:text-zinc-300 transition-colors">
            <X size={14} />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default Toast;