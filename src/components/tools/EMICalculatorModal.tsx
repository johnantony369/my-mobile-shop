import React, { useState, useMemo } from 'react';
import { X, Calculator, Share2, Check, Smartphone } from 'lucide-react';
import { calculateEMI, formatWhatsAppEMIQuote } from '../../utils/usedDevices';
import { formatINR } from '../../i18n';

interface EMICalculatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  shopName: string;
}

export const EMICalculatorModal: React.FC<EMICalculatorModalProps> = ({
  isOpen,
  onClose,
  shopName,
}) => {
  const [priceStr, setPriceStr] = useState('30000');
  const [downPaymentStr, setDownPaymentStr] = useState('5000');
  const [tenureMonths, setTenureMonths] = useState(6);
  const [interestRateStr, setInterestRateStr] = useState('14');
  const [copied, setCopied] = useState(false);

  const price = parseFloat(priceStr) || 0;
  const downPayment = parseFloat(downPaymentStr) || 0;
  const interestRate = parseFloat(interestRateStr) || 0;

  const result = useMemo(() => {
    return calculateEMI(price, downPayment, tenureMonths, interestRate);
  }, [price, downPayment, tenureMonths, interestRate]);

  if (!isOpen) return null;

  const tenureOptions = [3, 6, 9, 12, 18, 24];

  const handleShareWhatsApp = () => {
    const text = formatWhatsAppEMIQuote(
      {
        price,
        downPayment,
        tenureMonths,
        monthlyEMI: result.monthlyEMI,
      },
      shopName
    );

    const encoded = encodeURIComponent(text);
    window.open(`https://wa.me/?text=${encoded}`, '_blank');
  };

  const handleCopy = async () => {
    const text = formatWhatsAppEMIQuote(
      {
        price,
        downPayment,
        tenureMonths,
        monthlyEMI: result.monthlyEMI,
      },
      shopName
    );

    try {
      await navigator.clipboard.writeText(text);
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
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Calculator className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-[17px] font-bold text-black tracking-tight leading-tight">
                Customer EMI Calculator
              </h2>
              <p className="text-xs text-[#8E8E93]">
                Instant phone loan & installment breakdown
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

        {/* Inputs */}
        <div className="space-y-3.5">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-[#8E8E93] block mb-1">
                Phone Price (₹)
              </label>
              <input
                type="number"
                min="0"
                step="500"
                value={priceStr}
                onChange={(e) => setPriceStr(e.target.value)}
                placeholder="30000"
                className="w-full bg-[#F2F2F7] rounded-[12px] px-3.5 py-2.5 text-black font-semibold text-[15px] focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-[#8E8E93] block mb-1">
                Down Payment (₹)
              </label>
              <input
                type="number"
                min="0"
                step="500"
                value={downPaymentStr}
                onChange={(e) => setDownPaymentStr(e.target.value)}
                placeholder="5000"
                className="w-full bg-[#F2F2F7] rounded-[12px] px-3.5 py-2.5 text-black font-semibold text-[15px] focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          {/* Tenure Chips */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-[#8E8E93]">
                Loan Tenure (Months)
              </label>
              <span className="text-xs font-bold text-emerald-600">
                {tenureMonths} Months
              </span>
            </div>
            <div className="grid grid-cols-6 gap-1.5">
              {tenureOptions.map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => setTenureMonths(opt)}
                  className={`py-2 text-xs font-bold rounded-[10px] transition-all active:scale-95 ${
                    tenureMonths === opt
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-[#F2F2F7] text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {opt}m
                </button>
              ))}
            </div>
          </div>

          {/* Interest Rate */}
          <div>
            <label className="text-xs font-semibold text-[#8E8E93] block mb-1">
              Annual Interest Rate (%)
            </label>
            <input
              type="number"
              min="0"
              max="50"
              step="0.5"
              value={interestRateStr}
              onChange={(e) => setInterestRateStr(e.target.value)}
              placeholder="14"
              className="w-full bg-[#F2F2F7] rounded-[12px] px-3.5 py-2 text-black font-medium text-[14px] focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
        </div>

        {/* Live EMI Result Display Card */}
        <div className="bg-gradient-to-br from-emerald-600 to-teal-700 rounded-[18px] p-4 text-white shadow-lg space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase font-bold tracking-wider text-emerald-100">
              Monthly Installment
            </span>
            <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full font-medium">
              {tenureMonths} Payments
            </span>
          </div>

          <div>
            <span className="text-[34px] font-extrabold tracking-tight leading-none block">
              {formatINR(result.monthlyEMI)}
              <span className="text-sm font-semibold text-emerald-100 ml-1">/ mo</span>
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2 pt-2 border-t border-white/20 text-xs">
            <div>
              <span className="text-emerald-100 block text-[11px]">Loan Principal</span>
              <span className="font-bold text-white text-[13px]">{formatINR(result.loanAmount)}</span>
            </div>
            <div>
              <span className="text-emerald-100 block text-[11px]">Total Interest</span>
              <span className="font-bold text-white text-[13px]">{formatINR(result.totalInterest)}</span>
            </div>
            <div>
              <span className="text-emerald-100 block text-[11px]">Total Outflow</span>
              <span className="font-bold text-white text-[13px]">{formatINR(result.totalPayable)}</span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-2 pt-1">
          <button
            type="button"
            onClick={handleCopy}
            className="w-full py-3 bg-[#F2F2F7] hover:bg-slate-200 active:scale-98 text-slate-800 font-semibold text-xs rounded-[12px] flex items-center justify-center space-x-1.5 transition-all"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Smartphone className="w-4 h-4" />}
            <span>{copied ? 'Copied!' : 'Copy Quote'}</span>
          </button>
          <button
            type="button"
            onClick={handleShareWhatsApp}
            className="w-full py-3 bg-[#25D366] hover:bg-[#20ba59] active:scale-98 text-white font-bold text-xs rounded-[12px] flex items-center justify-center space-x-1.5 shadow-md shadow-[#25D366]/20 transition-all"
          >
            <Share2 className="w-4 h-4" />
            <span>Send on WhatsApp</span>
          </button>
        </div>
      </div>
    </div>
  );
};
