import React, { useState, useEffect } from 'react';
import { X, ZoomIn, ZoomOut } from 'lucide-react';

export interface PhotoItem {
  photoId: string;
  dataUrl?: string;
  downloadUrl?: string;
  label?: string;
}

export interface PhotoViewerModalProps {
  isOpen: boolean;
  photo: PhotoItem | null;
  onClose: () => void;
}

export const PhotoViewerModal: React.FC<PhotoViewerModalProps> = ({
  isOpen,
  photo,
  onClose,
}) => {
  const [isZoomed, setIsZoomed] = useState(false);

  useEffect(() => {
    if (!isOpen || typeof window === 'undefined') return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen || !photo) return null;

  const imgSrc = photo.dataUrl || photo.downloadUrl || '';

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-black/95 text-white animate-fade-in"
      role="dialog"
      aria-modal="true"
    >
      {/* Top action bar */}
      <div className="flex items-center justify-between px-4 py-3 bg-black/50 backdrop-blur-md">
        <div className="text-sm font-medium text-gray-200 truncate pr-2">
          {photo.label || 'Intake Photo'}
        </div>
        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={() => setIsZoomed(!isZoomed)}
            aria-label="Toggle zoom"
            className="p-2 rounded-full bg-white/10 hover:bg-white/20 active:scale-95 transition-all"
          >
            {isZoomed ? <ZoomOut className="w-5 h-5 text-white" /> : <ZoomIn className="w-5 h-5 text-white" />}
          </button>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close viewer"
            className="p-2 rounded-full bg-white/10 hover:bg-white/20 active:scale-95 transition-all"
          >
            <X className="w-5 h-5 text-white" />
          </button>
        </div>
      </div>

      {/* Main Image Container */}
      <div
        className="flex-1 flex items-center justify-center p-2 overflow-auto"
        onClick={() => setIsZoomed(!isZoomed)}
      >
        <img
          src={imgSrc}
          alt={photo.label || 'Intake Condition Photo'}
          className={`max-w-full max-h-full object-contain transition-transform duration-200 select-none ${
            isZoomed ? 'scale-150 cursor-zoom-out' : 'scale-100 cursor-zoom-in'
          }`}
        />
      </div>

      {/* Bottom Hint */}
      <div className="text-center py-2 text-xs text-gray-400 bg-black/50">
        Tap image or zoom icon to inspect damage
      </div>
    </div>
  );
};
