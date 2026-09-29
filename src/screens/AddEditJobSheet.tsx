import React, { useState, useEffect, useRef } from 'react';
import { BottomSheet } from '../components/BottomSheet';
import { Job, Language } from '../types';
import { t } from '../i18n';
import { db, cleanIndianPhone, isValidIndianPhone } from '../db/db';

interface AddEditJobSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: (jobId: number) => void;
  jobToEdit: Job | null;
  language: Language;
}

export const AddEditJobSheet: React.FC<AddEditJobSheetProps> = ({
  isOpen,
  onClose,
  onSaved,
  jobToEdit,
  language,
}) => {
  const [customerName, setCustomerName] = useState('');
  const [phone, setPhone] = useState('');
  const [model, setModel] = useState('');
  const [complaint, setComplaint] = useState('');
  const [estimateStr, setEstimateStr] = useState('');
  const [advanceStr, setAdvanceStr] = useState('');
  const [expectedDate, setExpectedDate] = useState('');
  const [imei, setImei] = useState('');
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const nameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      if (jobToEdit) {
        setCustomerName(jobToEdit.customerName);
        setPhone(jobToEdit.phone);
        setModel(jobToEdit.model);
        setComplaint(jobToEdit.complaint);
        setEstimateStr(jobToEdit.estimate ? jobToEdit.estimate.toString() : '');
        setAdvanceStr(jobToEdit.advance ? jobToEdit.advance.toString() : '');
        setExpectedDate(jobToEdit.expectedDate || '');
        setImei(jobToEdit.imei || '');
      } else {
        setCustomerName('');
        setPhone('');
        setModel('');
        setComplaint('');
        setEstimateStr('');
        setAdvanceStr('');
        setExpectedDate('');
        setImei('');
      }
      setPhoneError(null);
      setFormError(null);

      const timer = setTimeout(() => {
        nameInputRef.current?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isOpen, jobToEdit]);

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setPhone(val);
    if (phoneError) setPhoneError(null);
  };

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    const trimmedName = customerName.trim();
    const trimmedModel = model.trim();
    const trimmedComplaint = complaint.trim();
    const cleanedPhone = cleanIndianPhone(phone);

    if (!trimmedName || !trimmedModel || !trimmedComplaint) {
      setFormError('Please fill in required fields');
      return;
    }

    if (!isValidIndianPhone(cleanedPhone)) {
      setPhoneError(t('invalid_phone_error', language));
      return;
    }

    // Parse estimate & advance
    const cleanEst = estimateStr.replace(/,/g, '').trim();
    const parsedEstimate = cleanEst ? parseFloat(cleanEst) : undefined;
    if (parsedEstimate !== undefined && (isNaN(parsedEstimate) || parsedEstimate <= 0 || parsedEstimate > 9999999)) {
      setFormError(t('amount_error', language));
      return;
    }

    const cleanAdv = advanceStr.replace(/,/g, '').trim();
    const parsedAdvance = cleanAdv ? parseFloat(cleanAdv) : 0;
    if (isNaN(parsedAdvance) || parsedAdvance < 0 || parsedAdvance > 9999999) {
      setFormError(t('amount_error', language));
      return;
    }

    try {
      if (jobToEdit && jobToEdit.id) {
        await db.jobs.update(jobToEdit.id, {
          customerName: trimmedName,
          phone: cleanedPhone,
          model: trimmedModel,
          complaint: trimmedComplaint,
          estimate: parsedEstimate,
          advance: parsedAdvance,
          expectedDate: expectedDate || undefined,
          imei: imei.trim() || undefined,
        });
        onSaved(jobToEdit.id);
      } else {
        const id = await db.jobs.add({
          customerName: trimmedName,
          phone: cleanedPhone,
          model: trimmedModel,
          complaint: trimmedComplaint,
          estimate: parsedEstimate,
          advance: parsedAdvance,
          status: 'received',
          expectedDate: expectedDate || undefined,
          imei: imei.trim() || undefined,
          receivedAt: Date.now(),
          readyAt: null,
          deliveredAt: null,
          finalAmount: null,
          bookEntryId: null,
        });
        onSaved(id);
      }
      onClose();
    } catch (err) {
      console.error('Failed to save job:', err);
      setFormError('Error saving job to database');
    }
  };

  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={onClose}
      title={jobToEdit ? t('edit_job', language) : t('new_job_btn', language)}
    >
      <form onSubmit={handleSave} className="space-y-3.5 pt-1">
        {formError && (
          <div className="bg-red-50 text-iosRed p-2.5 rounded-[10px] text-xs font-medium">
            {formError}
          </div>
        )}

        {/* Customer Name */}
        <div className="space-y-1">
          <label className="text-xs font-semibold text-[#8E8E93] ml-1">
            {t('field_customer_name', language)} *
          </label>
            <input
            ref={nameInputRef}
            type="text"
            required
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            placeholder="e.g. Rajesh"
            className="w-full bg-[#F2F2F7] rounded-[10px] px-3.5 py-2.5 text-[15px] text-black focus:outline-none focus:ring-2 focus:ring-iosBlue/40 border border-black/[0.04]"
          />
        </div>

        {/* Phone Number */}
        <div className="space-y-1">
          <div className="flex items-center justify-between ml-1">
            <label className="text-xs font-semibold text-[#8E8E93]">
              {t('field_phone', language)} *
            </label>
            <span className="text-[10px] text-[#8E8E93]">10 digits</span>
          </div>
          <div className="relative">
            <input
              type="tel"
              inputMode="tel"
              required
              value={phone}
              onChange={handlePhoneChange}
              placeholder="9876543210"
              className={`w-full bg-[#F2F2F7] rounded-[10px] px-3.5 py-2.5 text-[15px] font-mono text-black focus:outline-none focus:ring-2 focus:ring-iosBlue/40 border ${
                phoneError ? 'border-iosRed ring-1 ring-iosRed' : 'border-black/[0.04]'
              }`}
            />
          </div>
          {phoneError && (
            <p className="text-xs text-iosRed font-medium mt-1 ml-1">{phoneError}</p>
          )}
        </div>

        {/* Model */}
        <div className="space-y-1">
          <label className="text-xs font-semibold text-[#8E8E93] ml-1">
            {t('field_model', language)} *
          </label>
          <input
            type="text"
            required
            value={model}
            onChange={(e) => setModel(e.target.value)}
            placeholder="e.g. Redmi Note 10 Pro / iPhone 11"
            className="w-full bg-[#F2F2F7] rounded-[10px] px-3.5 py-2.5 text-[15px] text-black focus:outline-none focus:ring-2 focus:ring-iosBlue/40 border border-black/[0.04]"
          />
        </div>

        {/* Complaint */}
        <div className="space-y-1">
          <label className="text-xs font-semibold text-[#8E8E93] ml-1">
            {t('field_complaint', language)} *
          </label>
          <input
            type="text"
            required
            value={complaint}
            onChange={(e) => setComplaint(e.target.value)}
            placeholder="e.g. Screen broken, not charging"
            className="w-full bg-[#F2F2F7] rounded-[10px] px-3.5 py-2.5 text-[15px] text-black focus:outline-none focus:ring-2 focus:ring-iosBlue/40 border border-black/[0.04]"
          />
        </div>

        {/* Money Row: Estimate & Advance */}
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-[#8E8E93] ml-1">
              {t('field_estimate', language)} (₹)
            </label>
            <input
              type="text"
              inputMode="decimal"
              value={estimateStr}
              onChange={(e) => setEstimateStr(e.target.value)}
              placeholder="0"
              className="w-full bg-[#F2F2F7] rounded-[10px] px-3 py-2 text-[15px] text-black focus:outline-none focus:ring-2 focus:ring-iosBlue/40 border border-black/[0.04]"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-[#8E8E93] ml-1">
              {t('field_advance', language)} (₹)
            </label>
            <input
              type="text"
              inputMode="decimal"
              value={advanceStr}
              onChange={(e) => setAdvanceStr(e.target.value)}
              placeholder="0"
              className="w-full bg-[#F2F2F7] rounded-[10px] px-3 py-2 text-[15px] text-black focus:outline-none focus:ring-2 focus:ring-iosBlue/40 border border-black/[0.04]"
            />
          </div>
        </div>

        {/* Optional Expected Date & IMEI */}
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-[#8E8E93] ml-1">
              {t('field_expected_date', language)}
            </label>
            <input
              type="date"
              value={expectedDate}
              onChange={(e) => setExpectedDate(e.target.value)}
              className="w-full bg-[#F2F2F7] rounded-[10px] px-3 py-2 text-[13px] text-black focus:outline-none focus:ring-2 focus:ring-iosBlue/40 border border-black/[0.04]"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-[#8E8E93] ml-1">
              {t('field_imei', language)}
            </label>
            <input
              type="text"
              value={imei}
              onChange={(e) => setImei(e.target.value)}
              placeholder="Optional"
              className="w-full bg-[#F2F2F7] rounded-[10px] px-3 py-2 text-[13px] font-mono text-black focus:outline-none focus:ring-2 focus:ring-iosBlue/40 border border-black/[0.04]"
            />
          </div>
        </div>

        {/* Submit button */}
        <div className="pt-2">
          <button
            type="submit"
            className="w-full h-12 bg-iosBlue text-white rounded-[12px] font-semibold text-[16px] active:opacity-85 shadow-md shadow-iosBlue/20 transition-opacity"
          >
            {jobToEdit ? t('update_job', language) : t('save_job', language)}
          </button>
        </div>
      </form>
    </BottomSheet>
  );
};
