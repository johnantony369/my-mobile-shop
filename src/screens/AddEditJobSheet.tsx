import React, { useState, useEffect, useRef } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { BottomSheet } from '../components/BottomSheet';
import { Job, Language, StockItem } from '../types';
import { t } from '../i18n';
import { db, cleanIndianPhone, isValidIndianPhone, generateCloudId, saveJobPhotos, getJobPhotos, deleteJobPhoto } from '../db/db';
import { getLocalDateString } from '../utils/date';
import { openWhatsAppNotification, buildIntakeSlipMessage, buildTrackingUrl } from '../utils/repairs';
import { compressImageFile } from '../utils/image';
import { pushSinglePublicRepair } from '../firebase/sync';
import { StockPickerSheet } from '../components/StockPickerSheet';
import { DeviceAutoSuggest } from '../components/DeviceAutoSuggest';
import { Wrench, X, Check, MessageSquare, Camera } from 'lucide-react';

interface PendingPhoto {
  photoId: string;
  dataUrl: string;
  label?: string;
  tag?: 'intake' | 'ready';
}

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
  const [photos, setPhotos] = useState<PendingPhoto[]>([]);
  const [deletedPhotoIds, setDeletedPhotoIds] = useState<string[]>([]);
  const [isCompressing, setIsCompressing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isSubmittingRef = useRef(false);

  // Stock / Services picker state
  const [isStockPickerOpen, setIsStockPickerOpen] = useState(false);
  const [selectedServices, setSelectedServices] = useState<StockItem[]>([]);

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

        if (jobToEdit.cloudId) {
          getJobPhotos(jobToEdit.cloudId)
            .then((existingPhotos) => {
              setPhotos(
                existingPhotos.map((p) => ({
                  photoId: p.photoId,
                  dataUrl: p.dataUrl || p.downloadUrl || '',
                  label: p.label,
                }))
              );
            })
            .catch((err) => {
              console.error('Failed to load existing job photos:', err);
              setPhotos([]);
            });
        } else {
          setPhotos([]);
        }
      } else {
        setCustomerName('');
        setPhone('');
        setModel('');
        setComplaint('');
        setEstimateStr('');
        setAdvanceStr('');
        setExpectedDate('');
        setImei('');
        setPhotos([]);
      }
      setDeletedPhotoIds([]);
      setSelectedServices([]);
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

  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (photos.length >= 4) {
      if (typeof alert !== 'undefined') alert('Maximum 4 photos allowed');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    const availableSlots = 4 - photos.length;
    const fileList = Array.from(files).slice(0, availableSlots);

    if (files.length > availableSlots) {
      if (typeof alert !== 'undefined') alert('Maximum 4 photos allowed');
    }

    setIsCompressing(true);
    try {
      for (const file of fileList) {
        try {
          const { dataUrl } = await compressImageFile(file);
          setPhotos((prev) => {
            if (prev.length >= 4) return prev;
            return [
              ...prev,
              {
                photoId: generateCloudId(),
                dataUrl,
                tag: 'intake',
              },
            ];
          });
        } catch (err) {
          console.error('Error compressing intake photo:', err);
        }
      }
    } finally {
      setIsCompressing(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemovePhoto = (photoIdToRemove: string) => {
    setPhotos((prev) => prev.filter((p) => p.photoId !== photoIdToRemove));
    setDeletedPhotoIds((prev) => [...prev, photoIdToRemove]);
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setPhone(val);
    if (phoneError) setPhoneError(null);
  };

  const handleToggleService = (item: StockItem) => {
    const exists = selectedServices.some((s) => s.id === item.id);
    let updated: StockItem[];
    if (exists) {
      updated = selectedServices.filter((s) => s.id !== item.id);
    } else {
      updated = [...selectedServices, item];
    }
    applySelectedServices(updated);
  };

  const applySelectedServices = (services: StockItem[]) => {
    setSelectedServices(services);
    if (services.length > 0) {
      const names = services.map((s) => s.name).join(', ');
      setComplaint(names);
      const totalEst = services.reduce((sum, s) => sum + (s.sellingPrice || 0), 0);
      setEstimateStr(totalEst > 0 ? totalEst.toString() : '');
    }
    if (formError) setFormError(null);
  };

  const handleSelectMultipleFromSheet = (services: StockItem[]) => {
    applySelectedServices(services);
  };

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (isSubmittingRef.current) return;
    if (isCompressing) return;
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
        if (updatedJob) {
          const targetCloudId = updatedJob.cloudId || jobToEdit.cloudId || generateCloudId();
          if (!updatedJob.cloudId) {
            await db.jobs.update(jobToEdit.id, { cloudId: targetCloudId });
            updatedJob.cloudId = targetCloudId;
          }
          for (const pid of deletedPhotoIds) {
            await deleteJobPhoto(pid);
          }
          if (photos.length > 0) {
            await saveJobPhotos(targetCloudId, photos);
          }
          pushSinglePublicRepair(updatedJob).catch(() => {});
        }
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
        if (savedJob) {
          if (savedJob.cloudId && photos.length > 0) {
            await saveJobPhotos(savedJob.cloudId, photos);
          }
          pushSinglePublicRepair(savedJob).catch(() => {});
        }

        // Send WhatsApp intake slip if selected
        if (sendWhatsAppSlip && savedJob) {
          const trackingUrl = savedJob.cloudId ? buildTrackingUrl(savedJob.cloudId) : undefined;
          openWhatsAppNotification(
            savedJob,
            shopName || 'My Mobile Shop',
            buildIntakeSlipMessage(savedJob, shopName || 'My Mobile Shop', trackingUrl, photos.length)
          );
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
            return handleSave();
          }}
          disabled={isSubmitting || isCompressing}
          className={`w-full h-12 bg-iosBlue text-white rounded-[12px] font-semibold text-[16px] active:opacity-85 shadow-md shadow-iosBlue/20 transition-opacity ${
            isSubmitting || isCompressing ? 'opacity-70 cursor-not-allowed' : ''
          }`}
        >
          {jobToEdit ? t('update_job', language) : t('save_job', language)}
        </button>
      }
    >
      <form id="add-job-form" onSubmit={(e) => { e.preventDefault(); return handleSave(e); }} className="space-y-3.5 pt-1">
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
            placeholder="Customer Name"
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
              placeholder="Mobile Number"
              className={`w-full bg-[#F2F2F7] rounded-[10px] px-3.5 py-2.5 text-[15px] font-mono text-black focus:outline-none focus:ring-2 focus:ring-iosBlue/40 border ${
                phoneError ? 'border-iosRed ring-1 ring-iosRed' : 'border-black/[0.04]'
              }`}
            />
          </div>
          {phoneError && (
            <p className="text-xs text-iosRed font-medium mt-1 ml-1">{phoneError}</p>
          )}
        </div>

        {/* Model with Database Search */}
        <div className="space-y-1">
          <label className="text-xs font-semibold text-[#8E8E93] ml-1">
            {t('field_model', language)} *
          </label>
          <DeviceAutoSuggest
            value={model}
            onChange={(val) => setModel(val)}
            required
            placeholder="Device Name (e.g. Redmi Note 10 Pro, iPhone 13)"
          />
        </div>

        {/* Complaint with Multiple Services Selection */}
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
              <span>Pick Services ({serviceItems.length})</span>
            </button>
          </div>

          {/* Quick chips of services with multi-select toggle */}
          {serviceItems.length > 0 && (
            <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar momentum-scroll overscroll-x-contain touch-pan-x text-xs">
              {serviceItems.slice(0, 10).map((si) => {
                const isSelected = selectedServices.some((s) => s.id === si.id);
                return (
                  <button
                    key={si.id}
                    type="button"
                    onClick={() => handleToggleService(si)}
                    className={`shrink-0 px-2.5 py-1 rounded-full text-[11px] font-medium transition-all active:scale-95 flex items-center space-x-1 border ${
                      isSelected
                        ? 'bg-purple-600 text-white border-purple-600 shadow-xs'
                        : 'bg-white text-gray-700 border-gray-200/80 hover:border-purple-500'
                    }`}
                  >
                    {isSelected && <Check className="w-3 h-3 text-white" />}
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
                // If user cleared text, clear selected service badges
                if (!e.target.value.trim()) {
                  setSelectedServices([]);
                }
              }}
              placeholder="Fault / Issue (e.g. Screen broken, not charging)"
              className="w-full bg-[#F2F2F7] rounded-[10px] px-3.5 py-2.5 text-[15px] text-black focus:outline-none focus:ring-2 focus:ring-iosBlue/40 border border-black/[0.04]"
            />
            {complaint && (
              <button
                type="button"
                onClick={() => {
                  setComplaint('');
                  setSelectedServices([]);
                }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 rounded-full"
                aria-label="Clear complaint"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Selected Services Indicator */}
          {selectedServices.length > 0 && (
            <div className="bg-purple-50/80 border border-purple-200 rounded-[10px] p-2 flex items-center justify-between text-xs animate-fade-in text-purple-900">
              <div className="flex items-center space-x-1.5 truncate">
                <Check className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                <span className="font-semibold truncate">
                  {selectedServices.length} {selectedServices.length === 1 ? 'service' : 'services'} selected: {selectedServices.map((s) => s.name).join(', ')}
                </span>
              </div>
              <span className="text-[10px] text-purple-700 bg-white px-1.5 py-0.5 rounded border border-purple-200 shrink-0 ml-2">
                Estimate: ₹{selectedServices.reduce((sum, s) => sum + (s.sellingPrice || 0), 0)}
              </span>
            </div>
          )}
        </div>

        {/* Condition Photos (Max 4) */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between ml-1">
            <label className="text-xs font-semibold text-[#8E8E93]">
              Condition Photos (Max 4)
            </label>
            <span className="text-[11px] text-[#8E8E93] font-medium">
              {photos.length}/4
            </span>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
            {photos.map((photo, index) => (
              <div
                key={photo.photoId || index}
                className="relative w-16 h-16 rounded-[10px] overflow-hidden border border-black/[0.08] bg-[#E5E5EA] shrink-0"
              >
                <img
                  src={photo.dataUrl}
                  alt={photo.label || `Condition photo ${index + 1}`}
                  className="w-full h-full object-cover select-none"
                />
                <button
                  type="button"
                  onClick={() => handleRemovePhoto(photo.photoId)}
                  aria-label={`Remove photo ${index + 1}`}
                  className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60 hover:bg-black/80 active:scale-95 text-white flex items-center justify-center transition-all shadow-sm"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}

            {photos.length < 4 && (
              <button
                type="button"
                onClick={() => {
                  if (photos.length >= 4) {
                    if (typeof alert !== 'undefined') alert('Maximum 4 photos allowed');
                    return;
                  }
                  fileInputRef.current?.click();
                }}
                disabled={isCompressing}
                aria-label="Add intake photo"
                className="w-16 h-16 rounded-[10px] border-2 border-dashed border-[#C7C7CC] hover:border-iosBlue bg-[#F2F2F7] active:bg-[#E5E5EA] flex flex-col items-center justify-center text-[#8E8E93] hover:text-iosBlue transition-colors shrink-0"
              >
                <Camera className="w-5 h-5" />
                <span className="text-[10px] font-medium mt-1">
                  {isCompressing ? '...' : 'Add'}
                </span>
              </button>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handlePhotoSelect}
              className="hidden"
            />
          </div>
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
        onSelect={(item) => handleToggleService(item)}
        multiple={true}
        selectedItems={selectedServices}
        onSelectMultiple={handleSelectMultipleFromSheet}
        language={language}
        title="Select Services"
        defaultFilter="service"
      />
    </BottomSheet>
  );
};
