import React, { useState } from 'react';
import { BottomSheet } from '../components/BottomSheet';
import { Job, Language, JobStatus } from '../types';
import { t, formatINR } from '../i18n';
import { db, calculateDaysInShop, cleanIndianPhone, generateCloudId, saveJobPhotos, getJobPhotos } from '../db/db';
import { formatTime } from '../utils/date';
import { openWhatsAppNotification, copyNotificationMessage, buildTrackingUrl, buildJobNotificationMessage } from '../utils/repairs';
import { pushSinglePublicRepair } from '../firebase/sync';
import { compressImageFile } from '../utils/image';
import { Camera } from 'lucide-react';
import { PhotoViewerModal, PhotoItem } from '../components/PhotoViewerModal';
import { JobPhoto } from '../types';
import {
  Phone,
  MessageSquare,
  Copy,
  ChevronRight,
  Edit3,
  Trash2,
  CheckCircle,
  Clock,
  RotateCcw,
  Check,
  ExternalLink,
} from 'lucide-react';
import { ConfirmModal } from '../components/ConfirmModal';

interface JobDetailSheetProps {
  isOpen: boolean;
  onClose: () => void;
  job: Job | null;
  shopName: string;
  language: Language;
  onEdit: (job: Job) => void;
  onDelete: (job: Job) => void;
  onOpenDelivery: (job: Job) => void;
  onJobUpdated: () => void;
}

export const JobDetailSheet: React.FC<JobDetailSheetProps> = ({
  isOpen,
  onClose,
  job,
  shopName,
  language,
  onEdit,
  onDelete,
  onOpenDelivery,
  onJobUpdated,
}) => {
  const [showOtherStatuses, setShowOtherStatuses] = useState(false);
  const [showReturnConfirm, setShowReturnConfirm] = useState(false);
  const [showReadyPhotoPrompt, setShowReadyPhotoPrompt] = useState(false);
  const [isUploadingReadyPhoto, setIsUploadingReadyPhoto] = useState(false);
  const readyFileInputRef = React.useRef<HTMLInputElement>(null);
  const [copiedToast, setCopiedToast] = useState(false);
  const [copiedLinkToast, setCopiedLinkToast] = useState(false);
  const [photos, setPhotos] = useState<JobPhoto[]>([]);
  const [selectedViewerPhoto, setSelectedViewerPhoto] = useState<PhotoItem | null>(null);

  React.useEffect(() => {
    if (isOpen && job?.cloudId) {
      getJobPhotos(job.cloudId).then(setPhotos).catch(() => {});
    } else {
      setPhotos([]);
    }
  }, [isOpen, job?.cloudId]);

  if (!job) return null;

  const trackingUrl = job.cloudId ? buildTrackingUrl(job.cloudId) : undefined;
  const isTerminal = job.status === 'delivered' || job.status === 'returned';
  const balance = job.estimate !== undefined ? job.estimate - (job.advance || 0) : null;
  const daysInShop = calculateDaysInShop(job.receivedAt);

  const getStatusBadge = (status: JobStatus) => {
    switch (status) {
      case 'received':
        return { label: t('status_received', language), color: 'bg-gray-100 text-gray-700' };
      case 'waiting':
        return { label: t('status_waiting', language), color: 'bg-amber-100 text-[#FF9500]' };
      case 'ready':
        return { label: t('status_ready', language), color: 'bg-green-100 text-iosGreen' };
      case 'delivered':
        return { label: t('status_delivered', language), color: 'bg-blue-100 text-iosBlue' };
      case 'returned':
        return { label: t('status_returned', language), color: 'bg-gray-100 text-gray-600' };
    }
  };

  const badge = getStatusBadge(job.status);

  const confirmMarkReady = async () => {
    if (!job.id) return;
    const now = Date.now();
    await db.jobs.update(job.id, { status: 'ready', readyAt: now });
    pushSinglePublicRepair({ ...job, status: 'ready', readyAt: now }).catch(() => {});
    setShowReadyPhotoPrompt(false);
    onJobUpdated();
  };

  const handleReadyPhotoCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !job.id) return;

    setIsUploadingReadyPhoto(true);
    try {
      const targetCloudId = job.cloudId || generateCloudId();
      if (!job.cloudId) {
        await db.jobs.update(job.id, { cloudId: targetCloudId });
      }

      for (const file of Array.from(files)) {
        try {
          const { dataUrl } = await compressImageFile(file);
          await saveJobPhotos(targetCloudId, [
            {
              photoId: generateCloudId(),
              dataUrl,
              tag: 'ready',
              label: 'Repaired Condition',
            },
          ]);
        } catch (err) {
          console.error('Error compressing ready photo:', err);
        }
      }

      // If not already ready, mark ready as well
      const now = Date.now();
      const updates: Partial<Job> = {
        status: 'ready',
        readyAt: job.readyAt || now,
      };
      await db.jobs.update(job.id, updates);
      const freshJob = await db.jobs.get(job.id);
      if (freshJob) {
        pushSinglePublicRepair(freshJob).catch(() => {});
      }
      setShowReadyPhotoPrompt(false);
      onJobUpdated();
    } finally {
      setIsUploadingReadyPhoto(false);
      if (readyFileInputRef.current) readyFileInputRef.current.value = '';
    }
  };

  // Status advancement
  const handleAdvanceStatus = async () => {
    if (!job.id) return;
    if (job.status === 'received') {
      await db.jobs.update(job.id, { status: 'waiting' });
      pushSinglePublicRepair({ ...job, status: 'waiting' }).catch(() => {});
      onJobUpdated();
    } else if (job.status === 'waiting') {
      setShowReadyPhotoPrompt(true);
    } else if (job.status === 'ready') {
      onOpenDelivery(job);
    }
  };

  const handleSetStatus = async (newStatus: 'received' | 'waiting' | 'ready') => {
    if (!job.id) return;
    if (newStatus === 'ready') {
      setShowOtherStatuses(false);
      setShowReadyPhotoPrompt(true);
      return;
    }
    const updates: Partial<Job> = { status: newStatus };
    await db.jobs.update(job.id, updates);
    pushSinglePublicRepair({ ...job, ...updates, status: newStatus }).catch(() => {});
    setShowOtherStatuses(false);
    onJobUpdated();
  };

  const handleReturnWithoutRepair = async () => {
    if (!job.id) return;
    await db.jobs.update(job.id, {
      status: 'returned',
      deliveredAt: Date.now(),
    });
    pushSinglePublicRepair({ ...job, status: 'returned', deliveredAt: Date.now() }).catch(() => {});
    setShowReturnConfirm(false);
    setShowOtherStatuses(false);
    onJobUpdated();
    onClose();
  };

  const handleSendWhatsApp = () => {
    const msg = buildJobNotificationMessage(job, shopName, trackingUrl);
    openWhatsAppNotification(job, shopName, msg);
  };

  const handleCopyMessage = async () => {
    const msg = buildJobNotificationMessage(job, shopName, trackingUrl);
    await copyNotificationMessage(job, shopName, msg);
    setCopiedToast(true);
    setTimeout(() => setCopiedToast(false), 2000);
  };

  const handleCopyTrackingLink = async () => {
    if (!trackingUrl) return;
    await navigator.clipboard.writeText(trackingUrl);
    setCopiedLinkToast(true);
    setTimeout(() => setCopiedLinkToast(false), 2000);
  };

  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={onClose}
      title={t('job_detail_title', language)}
    >
      <div className="space-y-4 pt-1 pb-4">
        {/* Header summary: Model & Status */}
        <div className="bg-white rounded-[14px] p-4 shadow-sm border border-black/[0.04]">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-xs font-semibold text-[#8E8E93] uppercase tracking-wider block mb-0.5">
                {job.customerName}
              </span>
              <h3 className="text-[20px] font-extrabold text-black leading-tight">
                {job.model}
              </h3>
            </div>
            <span
              className={`text-xs font-bold px-2.5 py-1 rounded-full uppercase tracking-wider ${badge.color}`}
            >
              {badge.label}
            </span>
          </div>

          <p className="mt-2 text-sm text-gray-700 bg-[#F2F2F7] p-2.5 rounded-[10px] leading-relaxed">
            {job.complaint}
          </p>

          <div className="mt-3 flex items-center justify-between text-xs text-[#8E8E93]">
            <span className="flex items-center">
              <Clock className="w-3.5 h-3.5 mr-1" />
              {t('days_in_shop', language, { n: daysInShop })}
            </span>
            {job.imei && (
              <span className="font-mono text-[11px]">IMEI: {job.imei}</span>
            )}
          </div>
        </div>

        {/* Condition & Repaired Photos Card */}
        {photos.length > 0 && (
          <div className="bg-white rounded-[14px] p-4 shadow-sm border border-black/[0.04] space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#8E8E93] uppercase tracking-wider block">
                {photos.some((p) => p.tag === 'ready')
                  ? `Condition Photos & Repaired (${photos.length})`
                  : `Condition Photos (${photos.length})`}
              </span>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
              {photos.map((p) => {
                const src = p.dataUrl || p.downloadUrl || '';
                const isReadyPhoto = p.tag === 'ready';
                return (
                  <button
                    key={p.photoId}
                    type="button"
                    onClick={() => setSelectedViewerPhoto(p)}
                    className={`relative shrink-0 w-16 h-16 rounded-[10px] overflow-hidden border active:scale-95 transition-transform ${
                      isReadyPhoto ? 'border-emerald-400 bg-emerald-50' : 'border-gray-200 bg-gray-100'
                    }`}
                  >
                    <img
                      src={src}
                      alt={p.label || 'Job Photo'}
                      className="w-full h-full object-cover"
                    />
                    {p.label ? (
                      <span
                        className={`absolute bottom-0 inset-x-0 text-[8px] font-bold py-0.5 text-center text-white truncate px-0.5 ${
                          isReadyPhoto ? 'bg-emerald-600/90' : 'bg-black/60'
                        }`}
                      >
                        {p.label}
                      </span>
                    ) : isReadyPhoto ? (
                      <span className="absolute bottom-0 inset-x-0 text-[8px] font-bold py-0.5 text-center text-white truncate bg-emerald-600/90">
                        Ready
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Customer Live Tracking Link Card */}
        {trackingUrl && (
          <div className="bg-white rounded-[14px] p-3.5 shadow-sm border border-black/[0.04] space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="w-7 h-7 rounded-full bg-blue-50 text-iosBlue flex items-center justify-center">
                  <ExternalLink className="w-3.5 h-3.5" />
                </div>
                <div>
                  <h4 className="text-[13px] font-bold text-slate-900 leading-tight">Customer Tracking Link</h4>
                  <p className="text-[11px] text-slate-400">Customer can track repair progress live</p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleCopyTrackingLink}
                className="py-1 px-2.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold flex items-center space-x-1 active:scale-95 transition-all"
              >
                {copiedLinkToast ? <Check className="w-3.5 h-3.5 text-iosGreen" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedLinkToast ? 'Copied' : 'Copy Link'}</span>
              </button>
            </div>
            <div className="p-2 bg-[#F2F2F7] rounded-[10px] text-xs font-mono text-slate-600 truncate select-all flex items-center justify-between">
              <span className="truncate">{trackingUrl}</span>
              <a
                href={trackingUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="ml-2 text-iosBlue text-xs font-sans font-semibold shrink-0 hover:underline"
              >
                Preview
              </a>
            </div>
          </div>
        )}

        {/* Suggestion Card for RECEIVED / WAITING Jobs: Send Job Intake Slip */}
        {(job.status === 'received' || job.status === 'waiting') && (
          <div className="bg-blue-50/80 border border-blue-200/90 rounded-[14px] p-3.5 shadow-sm space-y-2">
            <div className="flex items-center space-x-2">
              <MessageSquare className="w-4 h-4 text-iosBlue" />
              <h4 className="text-[14px] font-bold text-slate-900">
                Send Repair Job Card Slip
              </h4>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Send an intake receipt to {job.customerName} on WhatsApp with device model, complaint, advance, estimate, and live tracking link.
            </p>

            <div className="flex items-center space-x-2 pt-1">
              <button
                type="button"
                onClick={handleSendWhatsApp}
                className="flex-1 py-2 px-3 bg-iosBlue text-white rounded-full text-xs font-bold flex items-center justify-center space-x-1.5 active:opacity-85 shadow-sm"
              >
                <MessageSquare className="w-4 h-4" />
                <span>Send WhatsApp Slip</span>
              </button>

              <button
                type="button"
                onClick={handleCopyMessage}
                className="py-2 px-3 bg-white text-slate-700 border border-slate-300 rounded-full text-xs font-medium flex items-center justify-center space-x-1 active:bg-slate-50"
              >
                {copiedToast ? <Check className="w-4 h-4 text-iosGreen" /> : <Copy className="w-4 h-4" />}
                <span>{copiedToast ? t('message_copied_toast', language) : t('copy_message', language)}</span>
              </button>
            </div>
          </div>
        )}

        {/* Suggestion Card for READY Jobs */}
        {job.status === 'ready' && (
          <div className="bg-green-50 border border-green-200 rounded-[14px] p-3.5 shadow-sm space-y-2.5">
            <div className="flex items-center space-x-2">
              <span className="w-2 h-2 rounded-full bg-iosGreen animate-pulse" />
              <h4 className="text-[14px] font-bold text-green-900">
                {t('ready_suggestion_title', language)}
              </h4>
            </div>
            <p className="text-xs text-green-800 leading-relaxed">
              {t('ready_suggestion_desc', language)}
            </p>

            <div className="flex items-center space-x-2 pt-1">
              <button
                type="button"
                onClick={handleSendWhatsApp}
                className="flex-1 py-2 px-3 bg-iosGreen text-white rounded-full text-xs font-bold flex items-center justify-center space-x-1.5 active:opacity-85 shadow-sm"
              >
                <MessageSquare className="w-4 h-4" />
                <span>{t('notify_customer', language)}</span>
              </button>

              <button
                type="button"
                onClick={handleCopyMessage}
                className="py-2 px-3 bg-white text-green-900 border border-green-300 rounded-full text-xs font-medium flex items-center justify-center space-x-1 active:bg-green-50"
              >
                {copiedToast ? <Check className="w-4 h-4 text-iosGreen" /> : <Copy className="w-4 h-4" />}
                <span>{copiedToast ? t('message_copied_toast', language) : t('copy_message', language)}</span>
              </button>
            </div>
          </div>
        )}

        {/* Suggestion Card for DELIVERED Jobs */}
        {job.status === 'delivered' && (
          <div className="bg-slate-50 border border-slate-200 rounded-[14px] p-3 shadow-sm flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 rounded-full bg-blue-50 text-iosBlue flex items-center justify-center shrink-0">
                <MessageSquare className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-900">Send Delivery Receipt</h4>
                <p className="text-[11px] text-slate-500">WhatsApp receipt for final payment</p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleSendWhatsApp}
              className="py-1.5 px-3 bg-white border border-slate-300 text-slate-800 rounded-full text-xs font-bold flex items-center space-x-1 active:bg-slate-100 shadow-2xs"
            >
              <MessageSquare className="w-3.5 h-3.5 text-iosBlue" />
              <span>WhatsApp</span>
            </button>
          </div>
        )}

        {/* 1. Customer Block */}
        <div className="bg-white rounded-[14px] p-4 shadow-sm border border-black/[0.04] space-y-3">
          <span className="text-xs font-semibold text-[#8E8E93] uppercase tracking-wider block">
            {t('customer_section_title', language)}
          </span>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[16px] font-bold text-black">{job.customerName}</p>
              <p className="text-sm font-mono text-[#8E8E93] mt-0.5">{job.phone}</p>
            </div>
            <div className="flex items-center space-x-2">
              <a
                href={`tel:${cleanIndianPhone(job.phone)}`}
                className="w-10 h-10 rounded-full bg-blue-50 text-iosBlue flex items-center justify-center active:scale-95 transition-transform"
                title={t('call_btn', language)}
              >
                <Phone className="w-4 h-4" />
              </a>
              <button
                type="button"
                onClick={() => openWhatsAppNotification(job, shopName)}
                className="w-10 h-10 rounded-full bg-green-50 text-iosGreen flex items-center justify-center active:scale-95 transition-transform"
                title={t('whatsapp_btn', language)}
              >
                <MessageSquare className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* 2. Charges / Money Block */}
        <div className="bg-white rounded-[14px] p-4 shadow-sm border border-black/[0.04] space-y-2">
          <span className="text-xs font-semibold text-[#8E8E93] uppercase tracking-wider block">
            {t('money_section_title', language)}
          </span>
          <div className="grid grid-cols-3 gap-2 text-center pt-1">
            <div className="bg-[#F2F2F7] rounded-[10px] p-2">
              <span className="text-[11px] text-[#8E8E93] block">{t('field_estimate', language)}</span>
              <span className="text-sm font-bold text-black mt-0.5 block">
                {job.estimate !== undefined ? formatINR(job.estimate) : '-'}
              </span>
            </div>
            <div className="bg-[#F2F2F7] rounded-[10px] p-2">
              <span className="text-[11px] text-[#8E8E93] block">{t('field_advance', language)}</span>
              <span className="text-sm font-bold text-black mt-0.5 block">
                {formatINR(job.advance || 0)}
              </span>
            </div>
            <div className="bg-[#F2F2F7] rounded-[10px] p-2">
              <span className="text-[11px] text-[#8E8E93] block">{t('field_balance', language)}</span>
              <span className={`text-sm font-bold mt-0.5 block ${balance && balance > 0 ? 'text-iosRed' : 'text-iosGreen'}`}>
                {balance !== null ? formatINR(Math.max(0, balance)) : '-'}
              </span>
            </div>
          </div>

          {job.finalAmount !== null && job.finalAmount !== undefined && (
            <div className="mt-2 pt-2 border-t border-[#E5E5EA] flex justify-between items-center text-sm">
              <span className="font-semibold text-black">{t('field_final_amount', language)}</span>
              <span className="font-bold text-iosGreen text-[16px]">{formatINR(job.finalAmount)}</span>
            </div>
          )}
        </div>

        {/* 3. Dates Block */}
        <div className="bg-white rounded-[14px] p-4 shadow-sm border border-black/[0.04] space-y-2 text-xs">
          <span className="text-xs font-semibold text-[#8E8E93] uppercase tracking-wider block mb-1">
            {t('dates_section_title', language)}
          </span>
          <div className="flex justify-between py-1 border-b border-[#E5E5EA]/70">
            <span className="text-[#8E8E93]">{t('received_date_label', language)}</span>
            <span className="font-medium text-black">
              {new Date(job.receivedAt).toLocaleDateString()} {formatTime(job.receivedAt)}
            </span>
          </div>
          {job.expectedDate && (
            <div className="flex justify-between py-1 border-b border-[#E5E5EA]/70">
              <span className="text-[#8E8E93]">{t('field_expected_date', language)}</span>
              <span className="font-medium text-black">{job.expectedDate}</span>
            </div>
          )}
          {job.readyAt && (
            <div className="flex justify-between py-1 border-b border-[#E5E5EA]/70">
              <span className="text-[#8E8E93]">{t('ready_date_label', language)}</span>
              <span className="font-medium text-iosGreen">
                {new Date(job.readyAt).toLocaleDateString()} {formatTime(job.readyAt)}
              </span>
            </div>
          )}
          {job.deliveredAt && (
            <div className="flex justify-between py-1">
              <span className="text-[#8E8E93]">{t('delivered_date_label', language)}</span>
              <span className="font-medium text-iosBlue">
                {new Date(job.deliveredAt).toLocaleDateString()} {formatTime(job.deliveredAt)}
              </span>
            </div>
          )}
        </div>

        {/* Primary Action Buttons */}
        {!isTerminal ? (
          <div className="space-y-2 pt-2">
            {/* Advance Status Primary Button */}
            {job.status === 'received' && (
              <button
                type="button"
                onClick={handleAdvanceStatus}
                className="w-full h-12 bg-iosBlue text-white rounded-[12px] font-semibold text-[15px] flex items-center justify-center space-x-1.5 shadow-md shadow-iosBlue/20 active:opacity-85"
              >
                <span>{t('advance_status_action', language, { next: t('status_waiting', language) })}</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            )}

            {job.status === 'waiting' && (
              <button
                type="button"
                onClick={handleAdvanceStatus}
                className="w-full h-12 bg-iosGreen text-white rounded-[12px] font-semibold text-[15px] flex items-center justify-center space-x-1.5 shadow-md shadow-iosGreen/20 active:opacity-85"
              >
                <span>{t('advance_status_action', language, { next: t('status_ready', language) })}</span>
                <CheckCircle className="w-4 h-4" />
              </button>
            )}

            {job.status === 'ready' && (
              <>
                <button
                  type="button"
                  onClick={() => onOpenDelivery(job)}
                  className="w-full h-12 bg-iosBlue text-white rounded-[12px] font-semibold text-[15px] flex items-center justify-center space-x-1.5 shadow-md shadow-iosBlue/20 active:opacity-85"
                >
                  <span>{t('mark_delivered_action', language)}</span>
                  <Check className="w-4 h-4" />
                </button>

                {/* Take Photo button above other status button */}
                <button
                  type="button"
                  disabled={isUploadingReadyPhoto}
                  onClick={() => readyFileInputRef.current?.click()}
                  className="w-full py-2.5 bg-emerald-50 text-emerald-800 border border-emerald-200/80 rounded-[10px] text-xs font-bold flex items-center justify-center space-x-1.5 active:bg-emerald-100 transition-colors"
                >
                  <Camera className="w-3.5 h-3.5 text-emerald-600" />
                  <span>{isUploadingReadyPhoto ? 'Processing photo...' : 'Take Photo (Repaired Device)'}</span>
                </button>
              </>
            )}

            {/* Hidden file input for ready photo capture */}
            <input
              ref={readyFileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={handleReadyPhotoCapture}
            />

            {/* Other status dropdown/menu button */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowOtherStatuses(!showOtherStatuses)}
                className="w-full py-2.5 bg-[#E5E5EA] text-black rounded-[10px] text-xs font-semibold active:opacity-80 transition-opacity"
              >
                {t('other_status_action', language)}
              </button>

              {showOtherStatuses && (
                <div className="mt-1 bg-white rounded-[12px] shadow-lg border border-black/[0.08] p-1 space-y-1">
                  {job.status !== 'received' && (
                    <button
                      type="button"
                      onClick={() => handleSetStatus('received')}
                      className="w-full text-left px-3 py-2 text-xs rounded-[8px] hover:bg-gray-100 font-medium text-black"
                    >
                      {t('status_received', language)}
                    </button>
                  )}
                  {job.status !== 'waiting' && (
                    <button
                      type="button"
                      onClick={() => handleSetStatus('waiting')}
                      className="w-full text-left px-3 py-2 text-xs rounded-[8px] hover:bg-gray-100 font-medium text-[#FF9500]"
                    >
                      {t('status_waiting', language)}
                    </button>
                  )}
                  {job.status !== 'ready' && (
                    <button
                      type="button"
                      onClick={() => handleSetStatus('ready')}
                      className="w-full text-left px-3 py-2 text-xs rounded-[8px] hover:bg-gray-100 font-medium text-iosGreen"
                    >
                      {t('status_ready', language)}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setShowOtherStatuses(false);
                      onOpenDelivery(job);
                    }}
                    className="w-full text-left px-3 py-2 text-xs rounded-[8px] hover:bg-gray-100 font-semibold text-iosBlue"
                  >
                    {t('mark_delivered_action', language)}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowReturnConfirm(true)}
                    className="w-full text-left px-3 py-2 text-xs rounded-[8px] hover:bg-red-50 font-medium text-iosRed flex items-center justify-between"
                  >
                    <span>{t('return_without_repair_action', language)}</span>
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>

            {/* Row with Edit & Delete */}
            <div className="flex items-center space-x-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onEdit(job);
                }}
                className="flex-1 py-2.5 bg-white border border-[#E5E5EA] rounded-[10px] text-xs font-semibold text-black flex items-center justify-center space-x-1.5 active:bg-gray-50"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>{t('edit_action', language)}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  onClose();
                  onDelete(job);
                }}
                className="flex-1 py-2.5 bg-red-50 border border-red-200 rounded-[10px] text-xs font-semibold text-iosRed flex items-center justify-center space-x-1.5 active:bg-red-100"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{t('delete_action', language)}</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="p-3 bg-gray-100 rounded-[10px] text-center text-xs text-[#8E8E93]">
            {job.status === 'delivered' ? t('status_delivered', language) : t('status_returned', language)}
          </div>
        )}
      </div>

      {/* Return confirmation modal */}
      <ConfirmModal
        isOpen={showReturnConfirm}
        title={t('return_confirm_title', language)}
        message={t('return_confirm_message', language)}
        confirmLabel={t('return_without_repair_action', language)}
        cancelLabel={t('cancel_action', language)}
        isDestructive={true}
        onConfirm={handleReturnWithoutRepair}
        onCancel={() => setShowReturnConfirm(false)}
      />

      {/* Mark as Ready Photo Prompt Modal */}
      {showReadyPhotoPrompt && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/45 backdrop-blur-[3px] transition-opacity"
            onClick={() => setShowReadyPhotoPrompt(false)}
          />
          <div className="relative z-10 w-full max-w-[310px] bg-white/95 rounded-[16px] shadow-2xl overflow-hidden text-center transform transition-all animate-dialog-pop">
            <div className="pt-5 pb-4 px-4">
              <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-2.5">
                <Camera className="w-5 h-5" />
              </div>
              <h4 className="text-[17px] font-bold text-black tracking-tight">Mark as Ready</h4>
              <p className="mt-1 text-[13px] text-slate-600 leading-relaxed">
                Take photo of repaired phone?
              </p>
            </div>

            <div className="border-t border-slate-200/80 flex flex-col divide-y divide-slate-200/80">
              <button
                type="button"
                onClick={() => {
                  readyFileInputRef.current?.click();
                }}
                className="w-full py-3 text-[16px] font-bold text-iosBlue hover:bg-black/[0.03] active:bg-black/[0.06] transition-colors flex items-center justify-center space-x-1.5"
              >
                <Camera className="w-4 h-4 text-iosBlue" />
                <span>Take Photo</span>
              </button>
              <button
                type="button"
                onClick={confirmMarkReady}
                className="w-full py-3 text-[15px] font-medium text-slate-700 hover:bg-black/[0.03] active:bg-black/[0.06] transition-colors"
              >
                Skip / Mark Ready
              </button>
              <button
                type="button"
                onClick={() => setShowReadyPhotoPrompt(false)}
                className="w-full py-2.5 text-[14px] text-slate-400 hover:bg-black/[0.03] active:bg-black/[0.06] transition-colors"
              >
                {t('cancel_action', language)}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Full-Screen Photo Viewer Modal */}
      <PhotoViewerModal
        isOpen={Boolean(selectedViewerPhoto)}
        photo={selectedViewerPhoto}
        onClose={() => setSelectedViewerPhoto(null)}
      />
    </BottomSheet>
  );
};
