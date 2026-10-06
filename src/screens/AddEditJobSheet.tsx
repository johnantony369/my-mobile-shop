import React, { useState, useEffect, useRef } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { BottomSheet } from '../components/BottomSheet';
import { Job, Language, StockItem } from '../types';
import { t } from '../i18n';
import { db, cleanIndianPhone, isValidIndianPhone } from '../db/db';
import { getLocalDateString } from '../utils/date';
import { openWhatsAppNotification, buildIntakeSlipMessage, buildTrackingUrl } from '../utils/repairs';
import { pushSinglePublicRepair } from '../firebase/sync';
import { StockPickerSheet } from '../components/StockPickerSheet';
import { Wrench, X, Check, MessageSquare } from 'lucide-react';

interface AddEditJobSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: (jobId: number) => void;
  jobToEdit: Job | null;
  language: Language;
  shopName?: string;
}

export const AddEditJobSheet: React.FC<AddEditJobSheetProps> = ({
  isOpen,
  onClose,
  onSaved,
  jobToEdit,
  language,
  shopName = 'My Mobile Shop',
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
  const [sendWhatsAppSlip, setSendWhatsAppSlip] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isSubmittingRef = useRef(false);

  // Stock picker state
  const [isStockPickerOpen, setIsStockPickerOpen] = useState(false);
  const [selectedStockItem, setSelectedStockItem] = useState<StockItem | null>(null);

  // Live query for active service items (only services for job complaints)
  const serviceItems = useLiveQuery(
    async () => {
      try {
        if (!db.stock) return [];
        const items = await db.stock.toArray();
        return items.filter((i) => !i.deletedAt && i.syncStatus !== 'deleted' && i.category === 'service');
      } catch {
        return [];
      }
    },
    []
  ) ?? [];

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
      setSelectedStockItem(null);
      setPhoneError(null);
      setFormError(null);
      isSubmittingRef.current = false;
      setIsSubmitting(false);

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

  const handleSelectStockItem = (item: StockItem) => {
    setSelectedStockItem(item);
    // If complaint is empty, set it directly, otherwise if not already present, append
    if (!complaint.trim()) {
      setComplaint(item.name);
    } else if (!complaint.includes(item.name)) {
      setComplaint(`${complaint}, ${item.name}`);
    }
    // Set estimate price if not entered or if user wants default
    setEstimateStr(item.sellingPrice.toString());
    if (formError) setFormError(null);
  };

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (isSubmittingRef.current) return;
    isSubmittingRef.current = true;
    setIsSubmitting(true);

    const trimmedName = customerName.trim();
    const trimmedModel = model.trim();
    const trimmedComplaint = complaint.trim();
    const cleanedPhone = cleanIndianPhone(phone);

    if (!trimmedName || !trimmedModel || !trimmedComplaint) {
      setFormError('Please fill in required fields');
      isSubmittingRef.current = false;
      setIsSubmitting(false);
      return;
    }

    if (!isValidIndianPhone(cleanedPhone)) {
      setPhoneError(t('invalid_phone_error', language));
      isSubmittingRef.current = false;
      setIsSubmitting(false);
      return;
    }

    // Parse estimate & advance
    const cleanEst = estimateStr.replace(/,/g, '').trim();
    const parsedEstimate = cleanEst ? parseFloat(cleanEst) : undefined;
    if (parsedEstimate !== undefined && (isNaN(parsedEstimate) || parsedEstimate <= 0 || parsedEstimate > 9999999)) {
      setFormError(t('amount_error', language));
      isSubmittingRef.current = false;
      setIsSubmitting(false);
      return;
    }

    const cleanAdv = advanceStr.replace(/,/g, '').trim();
    const parsedAdvance = cleanAdv ? parseFloat(cleanAdv) : 0;
    if (isNaN(parsedAdvance) || parsedAdvance < 0 || parsedAdvance > 9999999) {
      setFormError(t('amount_error', language));
      isSubmittingRef.current = false;
      setIsSubmitting(false);
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
        const updatedJob = await db.jobs.get(jobToEdit.id);
        if (updatedJob) pushSinglePublicRepair(updatedJob).catch(() => {});
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

        // If advance was paid, record cash entry in today's Day Book so closing balance matches
        if (parsedAdvance > 0) {
          const today = getLocalDateString();
          await db.entries.add({
            type: 'in',
            amount: parsedAdvance,
            paymentMethod: 'cash',
            item: `Advance — Repair: ${trimmedModel}`,
            customerName: trimmedName,
            note: `Advance for job #${id} (${trimmedComplaint})`,
            repairId: id,
            date: today,
            createdAt: Date.now(),
          });
        }

        const savedJob = await db.jobs.get(id);
        if (savedJob) pushSinglePublicRepair(savedJob).catch(() => {});

        // Send WhatsApp intake slip if selected
        if (sendWhatsAppSlip && savedJob) {
          const trackingUrl = savedJob.cloudId ? buildTrackingUrl(savedJob.cloudId) : undefined;
          openWhatsAppNotification(savedJob, shopName || 'My Mobile Shop', buildIntakeSlipMessage(savedJob, shopName || 'My Mobile Shop', trackingUrl));
        }

        onSaved(id);
      }
      onClose();
    } catch (err) {
      console.error('Failed to save job:', err);
      setFormError('Error saving job to database');
      isSubmittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={onClose}
      title={jobToEdit ? t('edit_job', language) : t('new_job_btn', language)}
      footer={
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            handleSave();
          }}
          disabled={isSubmitting}
          className={`w-full h-12 bg-iosBlue text-white rounded-[12px] font-semibold text-[16px] active:opacity-85 shadow-md shadow-iosBlue/20 transition-opacity ${
            isSubmitting ? 'opacity-70 cursor-not-allowed' : ''
          }`}
        >
          {jobToEdit ? t('update_job', language) : t('save_job', language)}
        </button>
      }
    >
      <form id="add-job-form" onSubmit={(e) => { e.preventDefault(); handleSave(e); }} className="space-y-3.5 pt-1">
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

        {/* Complaint with Stock Quick-Picker */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between ml-1">
            <label className="text-xs font-semibold text-[#8E8E93]">
              {t('field_complaint', language)} *
            </label>
            <button
              type="button"
              onClick={() => setIsStockPickerOpen(true)}
              className="text-xs font-semibold text-iosBlue hover:underline flex items-center space-x-1 active:opacity-75"
            >
              <Wrench className="w-3.5 h-3.5" />
              <span>Pick from Services ({serviceItems.length})</span>
            </button>
          </div>

          {/* Quick chips of services & repair labour */}
          {serviceItems.length > 0 && (
            <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar momentum-scroll overscroll-x-contain touch-pan-x text-xs">
              {serviceItems.slice(0, 8).map((si) => {
                const isSelected = selectedStockItem?.id === si.id;
                return (
                  <button
                    key={si.id}
                    type="button"
                    onClick={() => handleSelectStockItem(si)}
                    className={`shrink-0 px-2.5 py-1 rounded-full text-[11px] font-medium transition-all active:scale-95 flex items-center space-x-1 border ${
                      isSelected
                        ? 'bg-purple-600 text-white border-purple-600 shadow-xs'
                        : 'bg-white text-gray-700 border-gray-200/80 hover:border-purple-500'
                    }`}
                  >

                    <span className="font-semibold">{si.name}</span>
                    <span className={isSelected ? 'text-purple-100' : 'text-gray-400'}>
                      (₹{si.sellingPrice})
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          <div className="relative">
            <input
              type="text"
              required
              value={complaint}
              onChange={(e) => {
                setComplaint(e.target.value);
                if (selectedStockItem && selectedStockItem.name !== e.target.value) {
                  setSelectedStockItem(null);
                }
              }}
              placeholder="e.g. Screen broken, not charging"
              className="w-full bg-[#F2F2F7] rounded-[10px] px-3.5 py-2.5 text-[15px] text-black focus:outline-none focus:ring-2 focus:ring-iosBlue/40 border border-black/[0.04]"
            />
            {complaint && (
              <button
                type="button"
                onClick={() => {
                  setComplaint('');
                  setSelectedStockItem(null);
                }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 rounded-full"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Selected Stock / Service Indicator */}
          {selectedStockItem && (
            <div className="bg-purple-50/80 border border-purple-200 rounded-[10px] p-2 flex items-center justify-between text-xs animate-fade-in text-purple-900">
              <div className="flex items-center space-x-1.5 truncate">
                <Check className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                <span className="font-semibold truncate">
                  Linked: {selectedStockItem.name}
                </span>
                <span className="text-gray-500 shrink-0">
                  (₹{selectedStockItem.sellingPrice})
                </span>
              </div>
              <span className="text-[10px] text-purple-700 bg-white px-1.5 py-0.5 rounded border border-purple-200 shrink-0">
                Estimate auto-filled
              </span>
            </div>
          )}
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

        {/* Send WhatsApp Job Slip Toggle (For new jobs) */}
        {!jobToEdit && (
          <label className="flex items-center space-x-2.5 p-3 bg-green-50/70 border border-green-200/80 rounded-[12px] cursor-pointer select-none">
            <input
              type="checkbox"
              checked={sendWhatsAppSlip}
              onChange={(e) => setSendWhatsAppSlip(e.target.checked)}
              className="w-4 h-4 rounded text-iosGreen focus:ring-iosGreen border-gray-300"
            />
            <div className="flex-1 flex items-center space-x-1.5 text-xs text-green-900 font-medium">
              <MessageSquare className="w-3.5 h-3.5 text-iosGreen flex-shrink-0" />
              <span>Send WhatsApp Job Card to customer on save</span>
            </div>
          </label>
        )}
      </form>

      {/* Stock Picker Sheet */}
      <StockPickerSheet
        isOpen={isStockPickerOpen}
        onClose={() => setIsStockPickerOpen(false)}
        onSelect={handleSelectStockItem}
        language={language}
        title="Select Service"
        defaultFilter="service"
      />
    </BottomSheet>
  );
};
