import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

export const BottomSheet: React.FC<BottomSheetProps> = ({
  isOpen,
  onClose,
  title,
  children,
  footer,
}) => {
  const [rendered, setRendered] = useState(isOpen);
  const [animate, setAnimate] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setRendered(true);
      const timer = setTimeout(() => setAnimate(true), 20);
      return () => clearTimeout(timer);
    } else {
      setAnimate(false);
      const timer = setTimeout(() => setRendered(false), 200);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!rendered) return null;

  const sheetElement = (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      {/* Backdrop with subtle blur */}
      <div
        className={`fixed inset-0 bg-black/40 backdrop-blur-[3px] transition-opacity duration-250 ease-out ${
          animate ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
      />

      {/* Sheet Content with iOS spring curve */}
      <div
        className={`relative z-10 w-full max-w-lg mx-auto max-h-[90vh] max-h-[90dvh] bg-white rounded-t-[20px] shadow-2xl flex flex-col overflow-hidden transition-transform duration-250 ease-[cubic-bezier(0.32,0.72,0,1)] transform ${
          animate ? 'translate-y-0' : 'translate-y-full'
        } ${!footer ? 'pb-[calc(env(safe-area-inset-bottom)+16px)]' : ''}`}
      >
        {/* Grab Handle */}
        <div className="shrink-0 w-full flex items-center justify-center pt-3 pb-1 cursor-grab" onClick={onClose}>
          <div className="w-10 h-1.5 bg-[#C7C7CC] rounded-full" />
        </div>

        {/* Optional Header */}
        {title && (
          <div className="shrink-0 px-5 py-2 flex items-center justify-between border-b border-iosSeparator/60">
            <h3 className="text-lg font-semibold text-iosLabel">{title}</h3>
            <button
              type="button"
              onClick={onClose}
              className="w-7 h-7 rounded-full bg-[#E5E5EA] flex items-center justify-center text-[#8E8E93] hover:text-black font-semibold text-sm"
              aria-label="Close"
            >
              ✕
            </button>
          </div>
        )}

        {/* Scrollable Body with Momentum Scrolling */}
        <div className="flex-1 min-h-0 overflow-y-auto px-5 pt-3 pb-4 momentum-scroll overscroll-contain">
          {children}
        </div>

        {/* Optional Sticky Footer */}
        {footer && (
          <div className="shrink-0 bg-white/95 backdrop-blur-md border-t border-iosSeparator/40 px-5 py-3 pb-[calc(env(safe-area-inset-bottom)+12px)] shadow-[0_-4px_16px_rgba(0,0,0,0.05)]">
            {footer}
          </div>
        )}
      </div>
    </div>
  );

  if (typeof document !== 'undefined') {
    return createPortal(sheetElement, document.body);
  }
  return sheetElement;
};
