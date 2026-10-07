import React, { useState } from 'react';
import { Copy, Check, Share2, Printer, QrCode } from 'lucide-react';
import { PartnerProfile } from '../../types/partner';
import { generateQrSvg } from '../../utils/qr';

interface StandeeCardProps {
  partner: PartnerProfile;
}

export const StandeeCard: React.FC<StandeeCardProps> = ({ partner }) => {
  const [copied, setCopied] = useState(false);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

  const referralUrl = `https://mymobileshop.online/?ref=${partner.referralCode}`;
  const qrSvg = generateQrSvg(referralUrl, 160);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(referralUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleShareWhatsApp = () => {
    const text = `Namaste! Manage your mobile shop Day Book, repairs & WhatsApp receipts with My Mobile Shop app. Use our partner link for an exclusive 7-day Free Pro trial:\n${referralUrl}`;
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank');
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="bg-white rounded-[20px] p-5 border border-black/5 shadow-2xs space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <QrCode className="size-4 text-iosBlue" />
            <span>Counter Standee & Invite QR</span>
          </h3>
          <p className="text-xs text-[#8E8E93]">
            Place at your wholesale counter or send to shopkeepers on WhatsApp
          </p>
        </div>
        <span className="px-2.5 py-1 rounded-full bg-blue-50 text-iosBlue text-xs font-mono font-bold border border-blue-100">
          {partner.referralCode}
        </span>
      </div>

      <div className="flex flex-col sm:flex-row items-center gap-5 pt-1">
        {/* QR Code Container */}
        <div className="bg-slate-50 p-3 rounded-2xl border border-black/5 flex flex-col items-center shrink-0">
          <div
            className="size-36 flex items-center justify-center rounded-xl overflow-hidden bg-white shadow-2xs"
            dangerouslySetInnerHTML={{ __html: qrSvg }}
          />
          <span className="text-[10px] text-[#8E8E93] font-semibold mt-1.5 uppercase tracking-wider">
            Scan for 7-Day Pro
          </span>
        </div>

        {/* Action Buttons & Link Preview */}
        <div className="flex-1 w-full space-y-3">
          <div className="bg-slate-50 p-2.5 rounded-xl border border-black/5 flex items-center justify-between gap-2">
            <span className="text-xs font-mono text-slate-700 truncate select-all">
              {referralUrl}
            </span>
            <button
              type="button"
              onClick={handleCopy}
              className="p-1.5 text-iosBlue hover:bg-blue-50 rounded-lg transition-colors shrink-0"
              title="Copy referral link"
            >
              {copied ? <Check className="size-4 text-iosGreen" /> : <Copy className="size-4" />}
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={handleShareWhatsApp}
              className="py-2.5 px-3 bg-[#25D366] hover:bg-[#20ba5a] text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 shadow-2xs transition-all ios-press"
            >
              <Share2 className="size-3.5" />
              <span>Share WhatsApp</span>
            </button>

            <button
              type="button"
              onClick={() => setIsPrintModalOpen(true)}
              className="py-2.5 px-3 bg-[#F2F2F7] hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-all ios-press"
            >
              <Printer className="size-3.5" />
              <span>Print Table Standee</span>
            </button>
          </div>

          <p className="text-[11px] text-[#8E8E93]">
            💡 Retailers get an extended <strong>7-Day Pro Trial</strong>. You earn ₹75 on Monthly & ₹499 on Yearly renewals.
          </p>
        </div>
      </div>

      {/* Printable Standee Modal */}
      {isPrintModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 space-y-4 shadow-2xl border border-black/10 text-center">
            <div className="space-y-1">
              <span className="text-[11px] font-black uppercase text-iosBlue tracking-wider">
                Official Partner Standee
              </span>
              <h4 className="text-base font-extrabold text-slate-900">
                {partner.businessName}
              </h4>
              <p className="text-xs text-[#8E8E93]">{partner.marketCity}</p>
            </div>

            <div className="p-4 bg-slate-50 rounded-2xl border border-black/5 flex flex-col items-center">
              <div
                className="size-48 flex items-center justify-center rounded-xl overflow-hidden bg-white shadow-xs"
                dangerouslySetInnerHTML={{ __html: generateQrSvg(referralUrl, 200) }}
              />
              <p className="text-xs font-bold text-slate-800 mt-3">
                Scan to Get 7 Days Free Pro
              </p>
              <p className="text-[10px] text-[#8E8E93]">My Mobile Shop Counter OS</p>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setIsPrintModalOpen(false)}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl"
              >
                Close
              </button>
              <button
                type="button"
                onClick={handlePrint}
                className="flex-1 py-2.5 bg-iosBlue hover:bg-blue-600 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5"
              >
                <Printer className="size-3.5" />
                <span>Print Standee</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
