import { FloatingAction } from '../components/FloatingAction';
import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, calculateDaysInShop, softDeleteJob } from '../db/db';
import { Job, Language } from '../types';
import { t, formatINR } from '../i18n';
import { AddEditJobSheet } from './AddEditJobSheet';
import { JobDetailSheet } from './JobDetailSheet';
import { DeliverySheet } from './DeliverySheet';
import { BillSheet } from './BillSheet';
import { ConfirmModal } from '../components/ConfirmModal';
import { BarcodeScannerModal } from '../components/BarcodeScannerModal';
import { openWhatsAppNotification } from '../utils/repairs';
import { getLocalDateString } from '../utils/date';
import {
  Search,
  Plus,
  Wrench,
  Clock,
  X,
  Phone,
  MessageCircle,
  Smartphone,
  CheckCircle2,
  Edit2,
  ScanBarcode,
  Undo2,
} from 'lucide-react';

interface RepairsScreenProps {
  language: Language;
  shopName: string;
  isReadOnly: boolean;
  isActivated?: boolean;
  trialDays?: number;
  onOpenPaywall?: () => void;
  initialCloudId?: string;
  initialJobId?: number;
}

type RepairSegment = 'active' | 'ready' | 'history';

export const RepairsScreen: React.FC<RepairsScreenProps> = ({
  language,
  shopName,
  isReadOnly,
  isActivated: _isActivated,
  trialDays: _trialDays,
  onOpenPaywall,
  initialCloudId,
  initialJobId,
}) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [currentSegment, setCurrentSegment] = useState<RepairSegment>('active');
  const [searchQuery, setSearchQuery] = useState('');
  const [isScrolled, setIsScrolled] = useState(false);
  const [isScanModalOpen, setIsScanModalOpen] = useState(false);

  // Scroll listener for sticky header
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 40);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);
  
  // Sheet states
  const [isAddEditOpen, setIsAddEditOpen] = useState(false);
  const [jobToEdit, setJobToEdit] = useState<Job | null>(null);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [deliveryJob, setDeliveryJob] = useState<Job | null>(null);
  const [billingJob, setBillingJob] = useState<Job | null>(null);
  const [jobToDelete, setJobToDelete] = useState<Job | null>(null);

  // Automatically reopen specific job sheet when navigated back with trackCloudId or jobId
  useEffect(() => {
    const targetCloudId = initialCloudId || searchParams.get('trackCloudId');
    const targetJobId = initialJobId || (searchParams.get('jobId') ? Number(searchParams.get('jobId')) : undefined);

    if (targetCloudId) {
      db.jobs.where('cloudId').equals(targetCloudId).first().then((job) => {
        if (job) {
          setSelectedJob(job);
          if (job.status === 'ready') setCurrentSegment('ready');
          else if (job.status === 'delivered' || job.status === 'returned') setCurrentSegment('history');
          else setCurrentSegment('active');
        }
      });
    } else if (targetJobId) {
      db.jobs.get(targetJobId).then((job) => {
        if (job) {
          setSelectedJob(job);
          if (job.status === 'ready') setCurrentSegment('ready');
          else if (job.status === 'delivered' || job.status === 'returned') setCurrentSegment('history');
          else setCurrentSegment('active');
        }
      });
    }
  }, [initialCloudId, initialJobId, searchParams]);

  // Live query for all active jobs
  const allJobs = useLiveQuery(
    async () => {
      const jobs = await db.jobs.toArray();
      return jobs.filter((j) => !j.deletedAt && j.syncStatus !== 'deleted');
    },
    []
  ) ?? [];

  // Segment counts
  const activeCount = allJobs.filter((j) => j.status === 'received' || j.status === 'in_progress' || j.status === 'waiting').length;
  const readyCount = allJobs.filter((j) => j.status === 'ready').length;
  const historyCount = allJobs.filter((j) => j.status === 'delivered' || j.status === 'returned').length;

  // Filter jobs by search or segment
  const trimmedSearch = searchQuery.trim().toLowerCase();

  let displayedJobs: Job[] = [];

  if (trimmedSearch) {
    // Search across ALL jobs (newest first)
    displayedJobs = allJobs
      .filter(
        (j) =>
          j.customerName.toLowerCase().includes(trimmedSearch) ||
          j.phone.includes(trimmedSearch) ||
          j.model.toLowerCase().includes(trimmedSearch) ||
          j.complaint.toLowerCase().includes(trimmedSearch)
      )
      .sort((a, b) => b.receivedAt - a.receivedAt);
  } else if (currentSegment === 'active') {
    // Active: received + in_progress + waiting, newest first
    displayedJobs = allJobs
      .filter((j) => j.status === 'received' || j.status === 'in_progress' || j.status === 'waiting')
      .sort((a, b) => b.receivedAt - a.receivedAt);
  } else if (currentSegment === 'ready') {
    // Ready: newest ready first
    displayedJobs = allJobs
      .filter((j) => j.status === 'ready')
      .sort((a, b) => (b.readyAt || b.receivedAt) - (a.readyAt || a.receivedAt));
  } else {
    // History: delivered + returned, newest first
    displayedJobs = allJobs
      .filter((j) => j.status === 'delivered' || j.status === 'returned')
      .sort((a, b) => (b.deliveredAt || b.receivedAt) - (a.deliveredAt || a.receivedAt));
  }

  const renderStatusBadge = (status: Job['status']) => {
    switch (status) {
      case 'ready':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-bold shrink-0">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
            {t('status_ready', language)}
          </span>
        );
      case 'in_progress':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-800 text-[11px] font-bold shrink-0">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 animate-pulse"></span>
            {t('status_in_progress', language)}
          </span>
        );
      case 'waiting':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[11px] font-bold shrink-0">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-600"></span>
            {t('status_waiting', language)}
          </span>
        );
      case 'received':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[11px] font-bold shrink-0">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-500"></span>
            {t('status_received', language)}
          </span>
        );
      case 'delivered':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 text-[11px] font-bold shrink-0">
            <span className="w-1.5 h-1.5 rounded-full bg-iosBlue"></span>
            {t('status_delivered', language)}
          </span>
        );
      case 'returned':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-700 text-[11px] font-bold shrink-0 border border-rose-200/60">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
            {t('status_returned', language)}
          </span>
        );
    }
  };

  const handleDeleteJob = async () => {
    if (jobToDelete && jobToDelete.id) {
      await softDeleteJob(jobToDelete.id);
      setJobToDelete(null);
      if (selectedJob?.id === jobToDelete.id) {
        setSelectedJob(null);
      }
    }
  };

  return (
    <div className="min-h-screen pb-28">
      {/* Sticky top navigation bar for collapsed title */}
      <div
        className={`sticky top-0 z-30 transition-all duration-200 ${
          isScrolled
            ? 'bg-white/95 backdrop-blur-md shadow-sm border-b border-[#E5E5EA] py-2.5'
            : 'bg-transparent py-1'
        }`}
      >
        <div className="max-w-lg mx-auto px-4 flex items-center justify-between">
          <span
            className={`text-[17px] font-bold text-black transition-opacity duration-200 ${
              isScrolled ? 'opacity-100' : 'opacity-0 pointer-events-none'
            }`}
          >
            Repairs & Service
          </span>
          {isScrolled && (
            <button
              type="button"
              onClick={() => {
                if (isReadOnly && onOpenPaywall) {
                  onOpenPaywall();
                } else {
                  setJobToEdit(null);
                  setIsAddEditOpen(true);
                }
              }}
              className="bg-iosBlue text-white text-xs font-semibold px-3 py-1.5 rounded-full flex items-center space-x-1 shadow-xs active:scale-95 transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{t('new_job_btn', language)}</span>
            </button>
          )}
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 space-y-3.5">
        {/* Header Title & Quick Actions */}
        <div className="pt-2 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-[26px] sm:text-[28px] font-extrabold text-black tracking-tight leading-tight truncate">
              {shopName || 'QuickFix'}
            </h1>
            <p className="text-xs text-gray-500 mt-0.5 font-medium">Repair Tickets</p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => {
                if (isReadOnly && onOpenPaywall) {
                  onOpenPaywall();
                } else {
                  setJobToEdit(null);
                  setIsAddEditOpen(true);
                }
              }}
              disabled={isReadOnly}
              className="bg-iosBlue hover:bg-blue-600 active:scale-95 text-white font-semibold text-[13px] px-3.5 py-2 rounded-xl shadow-xs flex items-center space-x-1.5 transition-all select-none"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>{t('new_job_btn', language)}</span>
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative w-full">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search customer, phone, IMEI, or ticket #..."
            className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-gray-100 text-[14px] text-black placeholder:text-gray-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-iosBlue/30 border border-black/[0.04] transition-all"
          />
          {searchQuery ? (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-black"
            >
              <X className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setIsScanModalOpen(true)}
              title="Scan Ticket or IMEI"
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-iosBlue active:scale-90 transition-all"
            >
              <ScanBarcode className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Segmented Control Bar (iOS 18 tactile style) */}
        {!searchQuery && (
          <div className="p-1 rounded-xl bg-[#EBEBF0] flex items-center justify-between text-center select-none shadow-inner">
            <button
              type="button"
              onClick={() => setCurrentSegment('active')}
              className={`flex-1 py-1.5 px-2 rounded-lg text-[13px] font-semibold transition-all flex items-center justify-center gap-1.5 ${
                currentSegment === 'active'
                  ? 'bg-white text-black shadow-xs'
                  : 'text-gray-500 hover:text-black'
              }`}
            >
              <span>{t('segment_active', language)}</span>
              <span
                className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                  currentSegment === 'active'
                    ? 'bg-gray-100 text-gray-700'
                    : 'bg-black/5 text-gray-500'
                }`}
              >
                {activeCount}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setCurrentSegment('ready')}
              className={`flex-1 py-1.5 px-2 rounded-lg text-[13px] font-semibold transition-all flex items-center justify-center gap-1.5 relative ${
                currentSegment === 'ready'
                  ? 'bg-white text-black shadow-xs'
                  : 'text-gray-500 hover:text-black'
              }`}
            >
              <span>{t('segment_ready', language)}</span>
              {readyCount > 0 && (
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
              )}
              <span
                className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                  currentSegment === 'ready'
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-emerald-100/60 text-emerald-700'
                }`}
              >
                {readyCount}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setCurrentSegment('history')}
              className={`flex-1 py-1.5 px-2 rounded-lg text-[13px] font-semibold transition-all flex items-center justify-center gap-1.5 ${
                currentSegment === 'history'
                  ? 'bg-white text-black shadow-xs'
                  : 'text-gray-500 hover:text-black'
              }`}
            >
              <span>{t('segment_history', language)}</span>
              {historyCount > 0 && (
                <span
                  className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                    currentSegment === 'history'
                      ? 'bg-gray-100 text-gray-700'
                      : 'bg-black/5 text-gray-500'
                  }`}
                >
                  {historyCount}
                </span>
              )}
            </button>
          </div>
        )}

        {/* List of Jobs */}
        {displayedJobs.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 text-center shadow-xs border border-black/[0.04] my-6">
            <div className="w-14 h-14 bg-blue-50 text-iosBlue rounded-full flex items-center justify-center mx-auto mb-3">
              <Wrench className="w-7 h-7" />
            </div>
            <h3 className="text-[17px] font-semibold text-black">
              {searchQuery
                ? 'No matching repairs found'
                : currentSegment === 'active'
                ? t('empty_active_jobs', language)
                : currentSegment === 'ready'
                ? t('empty_ready_jobs', language)
                : t('empty_history_jobs', language)}
            </h3>
            {!searchQuery && currentSegment === 'active' && (
              <button
                type="button"
                onClick={() => {
                  if (isReadOnly && onOpenPaywall) {
                    onOpenPaywall();
                  } else {
                    setJobToEdit(null);
                    setIsAddEditOpen(true);
                  }
                }}
                className="mt-4 inline-flex items-center space-x-1.5 px-4 py-2 text-sm font-semibold rounded-full shadow-xs active:opacity-80 transition-opacity bg-iosBlue text-white"
              >
                <Plus className="w-4 h-4" />
                <span>{t('new_job_btn', language)}</span>
              </button>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-3 mb-6">
            {displayedJobs.map((job, idx) => {
              const daysInShop = calculateDaysInShop(job.receivedAt);
              const showDaysCounter = job.status === 'received' || job.status === 'in_progress' || job.status === 'waiting' || job.status === 'ready';
              const totalAmount = job.finalAmount !== null && job.finalAmount !== undefined ? job.finalAmount : (job.estimate ?? 0);
              const hasAmount = (job.finalAmount !== null && job.finalAmount !== undefined) || (job.estimate !== undefined && job.estimate > 0);
              const dueAmount = Math.max(0, totalAmount - (job.advance ?? 0));

              return (
                <div
                  key={job.id ?? idx}
                  onClick={() => setSelectedJob(job)}
                  className="rounded-2xl bg-white shadow-xs p-3.5 sm:p-4 flex flex-col gap-2.5 active:scale-[0.99] transition-all border border-black/[0.06] hover:border-black/[0.12] cursor-pointer"
                >
                  {/* Header row: Customer Info & Dual Quick Contact Actions */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex flex-col min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-[15px] sm:text-[16px] text-gray-900 truncate">
                          {job.customerName}
                        </span>
                        <span className="text-[11px] sm:text-[12px] text-gray-400 font-semibold shrink-0">
                          #{job.id ? String(job.id).padStart(4, '0') : '—'}
                        </span>
                      </div>
                      <span className="text-[13px] text-gray-500 font-medium">
                        {job.phone}
                      </span>
                    </div>

                    {/* Dual Quick Action Shortcuts (Call & WhatsApp) */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      <a
                        href={`tel:${job.phone}`}
                        onClick={(e) => e.stopPropagation()}
                        title={`Call ${job.customerName}`}
                        className="w-9 h-9 rounded-full bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white flex items-center justify-center transition-colors active:scale-95 shadow-xs border border-emerald-200/50"
                      >
                        <Phone className="w-4 h-4" />
                      </a>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          openWhatsAppNotification(job, shopName);
                        }}
                        title={`WhatsApp ${job.customerName}`}
                        className="h-9 px-2.5 rounded-full bg-[#25D366]/15 text-[#128C7E] hover:bg-[#25D366] hover:text-white flex items-center gap-1 text-[12px] font-bold transition-colors active:scale-95 shadow-xs"
                      >
                        <MessageCircle className="w-4 h-4" />
                        <span>WhatsApp</span>
                      </button>
                    </div>
                  </div>

                  {/* Device & Status Badge Row */}
                  <div className="flex items-center justify-between gap-2 pt-0.5">
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-gray-100 text-[12px] font-semibold text-gray-800 max-w-[65%] truncate">
                      <Smartphone className="w-3.5 h-3.5 text-iosBlue shrink-0" />
                      <span className="truncate">{job.model}</span>
                    </div>
                    {renderStatusBadge(job.status)}
                  </div>

                  {/* 1-Line Issue Summary & Days Counter */}
                  <div className="flex items-center justify-between text-[13px] text-gray-600 gap-2">
                    <p className="truncate flex-1">
                      {job.complaint}
                    </p>
                    {showDaysCounter && (
                      <div className="inline-flex items-center gap-1 text-[11px] text-gray-400 shrink-0 font-medium">
                        <Clock className="w-3 h-3 text-amber-500" />
                        <span>{t('days_in_shop', language, { n: daysInShop })}</span>
                      </div>
                    )}
                  </div>

                  {/* Clean Compact Financial Strip & Single Primary Bottom Action */}
                  <div className="flex items-center justify-between gap-3 pt-2 border-t border-gray-100">
                    <div className="flex items-center gap-1.5 text-[13px] text-gray-500">
                      <span>{job.status === 'delivered' ? 'Paid:' : (job.finalAmount ? 'Total:' : 'Est:')}</span>
                      <span className="font-bold text-gray-900 font-mono">
                        {hasAmount ? formatINR(totalAmount) : 'TBD'}
                      </span>
                      {job.status !== 'delivered' && (
                        <>
                          <span className="text-gray-300 mx-0.5">•</span>
                          <span className={dueAmount > 0 ? 'font-semibold text-rose-600' : 'font-medium text-emerald-600'}>
                            Due: {formatINR(dueAmount)}
                          </span>
                        </>
                      )}
                    </div>

                    {job.status === 'ready' ? (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeliveryJob(job);
                        }}
                        className="py-1.5 px-3 rounded-lg bg-iosBlue hover:bg-blue-600 text-white text-[12px] font-bold shadow-xs active:scale-95 transition-transform flex items-center gap-1 shrink-0"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Deliver &amp; Settle</span>
                      </button>
                    ) : job.status === 'delivered' || job.status === 'returned' ? (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedJob(job);
                        }}
                        className="py-1.5 px-3 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-800 text-[12px] font-bold active:scale-95 transition-transform flex items-center gap-1 shrink-0"
                      >
                        <Undo2 className="w-3.5 h-3.5 text-iosBlue" />
                        <span>Update / Reopen</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedJob(job);
                        }}
                        className="py-1.5 px-3 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-800 text-[12px] font-bold active:scale-95 transition-transform flex items-center gap-1 shrink-0"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                        <span>Update Status</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Floating New Job Button */}
      <FloatingAction>
        <button
          type="button"
          onClick={() => {
            if (isReadOnly && onOpenPaywall) {
              onOpenPaywall();
            } else {
              setJobToEdit(null);
              setIsAddEditOpen(true);
            }
          }}
          className="h-13 px-5 py-3 rounded-full flex items-center space-x-2 font-bold text-[15px] shadow-lg active:scale-95 transition-all duration-150 bg-iosBlue text-white shadow-iosBlue/35 hover:bg-blue-600"
        >
          <Plus className="w-5 h-5 stroke-[2.5]" />
          <span>{t('new_job_btn', language)}</span>
        </button>
      </FloatingAction>

      {/* Add / Edit Sheet */}
      <AddEditJobSheet
        isOpen={isAddEditOpen}
        onClose={() => setIsAddEditOpen(false)}
        jobToEdit={jobToEdit}
        language={language}
        shopName={shopName}
        onSaved={async (id) => {
          const fresh = await db.jobs.get(id);
          if (fresh) setSelectedJob(fresh);
        }}
      />

      {/* Job Detail Sheet */}
      <JobDetailSheet
        isOpen={!!selectedJob}
        onClose={() => {
          setSelectedJob(null);
          if (searchParams.get('trackCloudId') || searchParams.get('jobId')) {
            const nextParams = new URLSearchParams(searchParams);
            nextParams.delete('trackCloudId');
            nextParams.delete('jobId');
            setSearchParams(nextParams, { replace: true });
          }
        }}
        job={selectedJob}
        shopName={shopName}
        language={language}
        onEdit={(job) => {
          setSelectedJob(null);
          setJobToEdit(job);
          setIsAddEditOpen(true);
        }}
        onDelete={(job) => setJobToDelete(job)}
        onOpenDelivery={(job) => {
          setSelectedJob(null);
          setDeliveryJob(job);
        }}
        onOpenBilling={(job) => {
          setBillingJob(job);
        }}
        onJobUpdated={async () => {
          if (selectedJob?.id) {
            const fresh = await db.jobs.get(selectedJob.id);
            setSelectedJob(fresh || null);
          }
        }}
      />

      {/* Instant Bill Sheet for Ready Jobs */}
      <BillSheet
        isOpen={!!billingJob}
        onClose={() => setBillingJob(null)}
        defaultDate={getLocalDateString()}
        shopName={shopName}
        language={language}
        initialCustomerName={billingJob?.customerName}
        initialCustomerPhone={billingJob?.phone}
        initialItems={
          billingJob
            ? [
                {
                  name: `Repair Service: ${billingJob.model}`,
                  qty: 1,
                  price:
                    billingJob.finalAmount ??
                    (billingJob.estimate && billingJob.estimate > 0
                      ? billingJob.estimate
                      : 0),
                },
              ]
            : []
        }
      />

      {/* Delivery Confirmation Sheet */}
      <DeliverySheet
        isOpen={!!deliveryJob}
        onClose={() => setDeliveryJob(null)}
        job={deliveryJob}
        language={language}
        onDelivered={() => {
          setDeliveryJob(null);
        }}
      />

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={!!jobToDelete}
        title={t('delete_job_title', language)}
        message={t('delete_job_message', language)}
        confirmLabel={t('delete_action', language)}
        cancelLabel={t('cancel_action', language)}
        isDestructive={true}
        onConfirm={handleDeleteJob}
        onCancel={() => setJobToDelete(null)}
      />

      {/* Barcode / QR Scanner Modal */}
      <BarcodeScannerModal
        isOpen={isScanModalOpen}
        onClose={() => setIsScanModalOpen(false)}
        onScan={(scanned) => {
          setIsScanModalOpen(false);
          setSearchQuery(scanned.trim());
        }}
        title="Scan Ticket or IMEI"
      />
    </div>
  );
};
