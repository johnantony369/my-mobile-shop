import React, { useState } from 'react';
import { X, ShieldAlert, ExternalLink, CheckCircle2, AlertCircle, Copy, Check } from 'lucide-react';
import { isValidIMEI } from '../../utils/usedDevices';

interface CEIRCheckModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialImei?: string;
}

export const CEIRCheckModal: React.FC<CEIRCheckModalProps> = ({
  isOpen,
  onClose,
  initialImei = '',
}) => {
  const [imei, setImei] = useState(initialImei);
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const cleanImei = imei.trim();
  const is15Digits = /^\d{15}$/.test(cleanImei);
  const isLuhnValid = is15Digits && isValidIMEI(cleanImei);

  const handleOpenCEIR = async () => {
    if (cleanImei) {
      try {
        await navigator.clipboard.writeText(cleanImei);
        setCopied(true);
        setTimeout(() => setCopied(false), 3000);
      } catch {
        // clipboard fallback
      }
    }
    window.open('https://www.ceir.gov.in/Device/CeirIMEIVerification.jsp', '_blank');
  };

  const handleCopyOnly = async () => {
    if (!cleanImei) return;
    try {
      await navigator.clipboard.writeText(cleanImei);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
      <div className="w-full max-w-lg bg-white rounded-t-[24px] sm:rounded-[24px] p-5 shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#E5E5EA] pb-3">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-[17px] font-bold text-black tracking-tight leading-tight">
                CEIR Stolen Device Check
              </h2>
              <p className="text-xs text-[#8E8E93]">
                Govt Central Equipment Identity Register
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

        {/* Info card */}
        <div className="bg-amber-50/70 border border-amber-200/60 rounded-[14px] p-3 text-xs text-amber-900 leading-relaxed">
          <p className="font-semibold mb-0.5">Protect Your Shop from Stolen Phones</p>
          Verify the device IMEI on the official Government of India CEIR portal to ensure it is not blacklisted, stolen, or blocked by police.
        </div>

        {/* IMEI Input */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-xs font-semibold text-[#8E8E93]">
              Device 15-Digit IMEI
            </label>
            <span className="text-[11px] font-mono text-[#8E8E93]">
              {cleanImei.length} / 15 digits
            </span>
          </div>

          <div className="relative">
            <input
              type="text"
              maxLength={15}
              value={imei}
              onChange={(e) => setImei(e.target.value.replace(/\D/g, ''))}
              placeholder="Enter 15-digit IMEI number"
              className="w-full bg-[#F2F2F7] rounded-[12px] px-3.5 py-3 font-mono text-black font-bold text-[16px] tracking-wider focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
            {cleanImei.length > 0 && (
              <button
                type="button"
                onClick={handleCopyOnly}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 px-2.5 py-1 text-xs font-semibold bg-white rounded-lg shadow-xs text-slate-700 hover:bg-slate-50 flex items-center gap-1 active:scale-95 transition-all"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>
            )}
          </div>

          {/* Real-time Status Badge */}
          <div className="mt-2">
            {cleanImei.length === 15 ? (
              isLuhnValid ? (
                <div className="flex items-center space-x-1.5 text-xs text-green-700 bg-green-50 px-3 py-1.5 rounded-lg border border-green-200">
                  <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" />
                  <span className="font-semibold">Valid IMEI checksum format (Luhn passed)</span>
                </div>
              ) : (
                <div className="flex items-center space-x-1.5 text-xs text-red-700 bg-red-50 px-3 py-1.5 rounded-lg border border-red-200">
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                  <span className="font-semibold">Invalid IMEI checksum — check for typing error</span>
                </div>
              )
            ) : cleanImei.length > 0 ? (
              <div className="text-xs text-[#8E8E93] px-1">
                Enter all 15 digits to validate checksum
              </div>
            ) : null}
          </div>
        </div>

        {/* Action Button */}
        <div className="pt-2">
          <button
            type="button"
            onClick={handleOpenCEIR}
            className="w-full py-3.5 bg-amber-500 hover:bg-amber-600 active:scale-98 text-white font-bold text-sm rounded-[14px] flex items-center justify-center space-x-2 shadow-md shadow-amber-500/25 transition-all"
          >
            <span>{copied ? 'IMEI Copied! Opening CEIR...' : 'Copy IMEI & Open CEIR Portal'}</span>
            <ExternalLink className="w-4 h-4 ml-1" />
          </button>
          <p className="text-[11px] text-[#8E8E93] text-center mt-2">
            Opens www.ceir.gov.in in your browser. Paste IMEI into portal verification.
          </p>
        </div>
      </div>
    </div>
  );
};
