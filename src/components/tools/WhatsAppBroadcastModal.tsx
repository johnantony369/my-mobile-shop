import React, { useState, useEffect } from 'react';
import { X, Share2, Copy, Check, MessageSquare } from 'lucide-react';
import { UsedDevice } from '../../types';
import { formatWhatsAppStockCatalog } from '../../utils/usedDevices';

interface WhatsAppBroadcastModalProps {
  isOpen: boolean;
  onClose: () => void;
  devices: UsedDevice[];
  shopName: string;
  shopPhone?: string;
  shopAddress?: string;
}

export const WhatsAppBroadcastModal: React.FC<WhatsAppBroadcastModalProps> = ({
  isOpen,
  onClose,
  devices,
  shopName,
  shopPhone,
  shopAddress,
}) => {
  const [catalogText, setCatalogText] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const generated = formatWhatsAppStockCatalog(devices, shopName, shopPhone, shopAddress);
      setCatalogText(generated);
    }
  }, [isOpen, devices, shopName, shopPhone, shopAddress]);

  if (!isOpen) return null;

  const inStockCount = devices.filter(
    (d) => d.status === 'in_stock' && !d.deletedAt && d.syncStatus !== 'deleted'
  ).length;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(catalogText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
    }
  };

  const handleSendWhatsApp = () => {
    const encoded = encodeURIComponent(catalogText);
    window.open(`https://wa.me/?text=${encoded}`, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
      <div className="w-full max-w-lg bg-white rounded-t-[24px] sm:rounded-[24px] p-5 shadow-2xl space-y-4 max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#E5E5EA] pb-3">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-green-50 text-[#25D366] flex items-center justify-center">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-[17px] font-bold text-black tracking-tight leading-tight">
                WhatsApp Stock Broadcast
              </h2>
              <p className="text-xs text-[#8E8E93]">
                {inStockCount} {inStockCount === 1 ? 'phone' : 'phones'} available for sale
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200 active:scale-95 transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Text Area for preview/customization */}
        <div className="flex-1 flex flex-col min-h-0 space-y-1.5">
          <div className="flex items-center justify-between text-xs text-[#8E8E93]">
            <span>Message Preview (editable):</span>
            <span>{catalogText.length} characters</span>
          </div>
          <textarea
            value={catalogText}
            onChange={(e) => setCatalogText(e.target.value)}
            rows={10}
            className="w-full bg-[#F2F2F7] rounded-[14px] p-3.5 text-xs font-mono text-black leading-relaxed border border-black/[0.04] focus:outline-none focus:ring-2 focus:ring-[#25D366] resize-none overflow-y-auto"
          />
        </div>

        {/* Buttons */}
        <div className="grid grid-cols-2 gap-2 pt-1">
          <button
            type="button"
            onClick={handleCopy}
            className="w-full py-3 bg-[#F2F2F7] hover:bg-slate-200 active:scale-98 text-slate-800 font-semibold text-xs rounded-[12px] flex items-center justify-center space-x-1.5 transition-all"
          >
            {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
            <span>{copied ? 'Copied to Clipboard!' : 'Copy Message'}</span>
          </button>
          <button
            type="button"
            onClick={handleSendWhatsApp}
            className="w-full py-3 bg-[#25D366] hover:bg-[#20ba59] active:scale-98 text-white font-bold text-xs rounded-[12px] flex items-center justify-center space-x-1.5 shadow-md shadow-[#25D366]/20 transition-all"
          >
            <Share2 className="w-4 h-4" />
            <span>Open in WhatsApp</span>
          </button>
        </div>
      </div>
    </div>
  );
};
