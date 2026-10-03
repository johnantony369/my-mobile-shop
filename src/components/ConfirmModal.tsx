import React from 'react';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel: string;
  isDestructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  title,
  message,
  confirmLabel,
  cancelLabel,
  isDestructive = true,
  onConfirm,
  onCancel,
}) => {
  const isConfirmingRef = React.useRef(false);
  React.useEffect(() => {
    if (isOpen) isConfirmingRef.current = false;
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/45 backdrop-blur-[3px] transition-opacity"
        onClick={onCancel}
      />

      {/* iOS Dialog Card */}
      <div className="relative z-10 w-full max-w-[290px] bg-white/95 rounded-[14px] shadow-2xl overflow-hidden text-center transform transition-all animate-dialog-pop">
        <div className="pt-5 pb-4 px-4">
          <h4 className="text-[17px] font-semibold text-black tracking-tight">{title}</h4>
          <p className="mt-1 text-[13px] text-[#3C3C43]/70 leading-relaxed">{message}</p>
        </div>

        <div className="border-t border-[#3C3C43]/20 flex">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 py-3 text-[17px] font-normal text-iosBlue border-r border-[#3C3C43]/20 hover:bg-black/[0.04] active:bg-black/[0.08] transition-colors"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={() => {
              if (isConfirmingRef.current) return;
              isConfirmingRef.current = true;
              onConfirm();
            }}
            className={`flex-1 py-3 text-[17px] font-semibold hover:bg-black/[0.04] active:bg-black/[0.08] transition-colors ${
              isDestructive ? 'text-iosRed' : 'text-iosBlue'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};
