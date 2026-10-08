import React from 'react';
import { X, Cpu, MessageCircle, Layers, Users, Zap } from 'lucide-react';

interface WholesaleActivationModalProps {
  isOpen: boolean;
  onClose: () => void;
  shopName?: string;
  shopPhone?: string;
  userUid?: string;
  supportPhone?: string;
}

export const WholesaleActivationModal: React.FC<WholesaleActivationModalProps> = ({
  isOpen,
  onClose,
  shopName = 'My Mobile Shop',
  shopPhone,
  userUid,
  supportPhone = '9876543210',
}) => {
  if (!isOpen) return null;

  const cleanSupportPhone = supportPhone.replace(/\D/g, '');
  const destinationPhone = cleanSupportPhone.startsWith('91') && cleanSupportPhone.length > 10
    ? cleanSupportPhone
    : `91${cleanSupportPhone.slice(-10)}`;

  const supportMessage = `Hello Support, I want to activate Wholesaler Account for my shop: ${shopName}${
    shopPhone ? ` (+91 ${shopPhone})` : ''
  }.${userUid ? ` Account UID: ${userUid}` : ''}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-[3px] animate-fade-in">
      <div className="bg-white rounded-[16px] w-full max-w-sm p-5 shadow-xl border border-black/[0.06] space-y-4 animate-dialog-pop max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="w-11 h-11 rounded-2xl bg-blue-50 text-iosBlue flex items-center justify-center shadow-2xs shrink-0">
            <Cpu className="w-6 h-6" />
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-full text-slate-400 hover:text-black hover:bg-[#F2F2F7] transition-all"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div>
          <h2 className="text-lg font-extrabold text-black tracking-tight">
            Activate Wholesaler Account
          </h2>
          <p className="text-xs text-[#8E8E93] mt-1 leading-relaxed">
            Wholesale Mode is a dedicated enterprise edition designed specifically for spare parts distributors and accessory wholesale counters.
          </p>
        </div>

        {/* Feature Highlights Group */}
        <div className="bg-[#F2F2F7] rounded-[12px] p-3.5 space-y-3 border border-black/[0.04]">
          <div className="flex items-start gap-2.5">
            <Layers className="w-4 h-4 text-iosBlue shrink-0 mt-0.5" />
            <div>
              <span className="text-xs font-bold text-black block">
                Master Spares Catalog
              </span>
              <span className="text-[11px] text-[#8E8E93] leading-tight block mt-0.5">
                Preloaded Indian smartphone models, LCD combos, OEM batteries &amp; verified cross-model compatibility notes.
              </span>
            </div>
          </div>

          <div className="h-px bg-[#E5E5EA]" />

          <div className="flex items-start gap-2.5">
            <Users className="w-4 h-4 text-iosBlue shrink-0 mt-0.5" />
            <div>
              <span className="text-xs font-bold text-black block">
                B2B Client Credit Ledgers
              </span>
              <span className="text-[11px] text-[#8E8E93] leading-tight block mt-0.5">
                Track client shop credit accounts, credit sales, payment receipts, and 1-tap WhatsApp credit statements.
              </span>
            </div>
          </div>

          <div className="h-px bg-[#E5E5EA]" />

          <div className="flex items-start gap-2.5">
            <Zap className="w-4 h-4 text-iosBlue shrink-0 mt-0.5" />
            <div>
              <span className="text-xs font-bold text-black block">
                Day Book Auto-Suggest
              </span>
              <span className="text-[11px] text-[#8E8E93] leading-tight block mt-0.5">
                Instant autocomplete matching spare parts and autofilling wholesale rates directly in Day Book.
              </span>
            </div>
          </div>
        </div>

        {/* Action Button */}
        <div className="space-y-2 pt-1">
          <a
            href={`https://wa.me/${destinationPhone}?text=${encodeURIComponent(supportMessage)}`}
            target="_blank"
            rel="noopener noreferrer"
            onClick={onClose}
            className="w-full py-3.5 px-4 bg-[#25D366] hover:bg-emerald-600 text-white rounded-[12px] font-bold text-sm flex items-center justify-center gap-2 shadow-sm active:scale-[0.98] transition-all text-center"
          >
            <MessageCircle className="w-4 h-4" />
            <span>Contact Support on WhatsApp</span>
          </a>

          <button
            type="button"
            onClick={onClose}
            className="w-full py-2 text-xs font-semibold text-slate-500 hover:text-black text-center transition-colors"
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
};
