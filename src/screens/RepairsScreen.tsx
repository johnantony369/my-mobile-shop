import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, calculateDaysInShop } from '../db/db';
import { Job, Language } from '../types';
import { t } from '../i18n';
import { SegmentedControl } from '../components/SegmentedControl';
import { AddEditJobSheet } from './AddEditJobSheet';
import { JobDetailSheet } from './JobDetailSheet';
import { DeliverySheet } from './DeliverySheet';
import { ConfirmModal } from '../components/ConfirmModal';
import { openWhatsAppNotification } from '../utils/repairs';
import {
  Search,
  Plus,
  Wrench,
  Clock,
  MessageSquare,
  X,
} from 'lucide-react';

interface RepairsScreenProps {
  language: Language;
  shopName: string;
  isReadOnly: boolean;
}

type RepairSegment = 'active' | 'ready' | 'history';

export const RepairsScreen: React.FC<RepairsScreenProps> = ({
  language,
  shopName,
  isReadOnly,
}) => {
  const [currentSegment, setCurrentSegment] = useState<RepairSegment>('active');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Sheet states
  const [isAddEditOpen, setIsAddEditOpen] = useState(false);
  const [jobToEdit, setJobToEdit] = useState<Job | null>(null);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [deliveryJob, setDeliveryJob] = useState<Job | null>(null);
  const [jobToDelete, setJobToDelete] = useState<Job | null>(null);

  // Live query for all jobs
  const allJobs = useLiveQuery(() => db.jobs.toArray()) ?? [];

  // Ready jobs count
  const readyCount = allJobs.filter((j) => j.status === 'ready').length;

  // Filter jobs by search or segment
  const trimmedSearch = searchQuery.trim().toLowerCase();

  let displayedJobs: Job[] = [];

  if (trimmedSearch) {
    // Search across ALL jobs
    displayedJobs = allJobs.filter(
      (j) =>
        j.customerName.toLowerCase().includes(trimmedSearch) ||
        j.phone.includes(trimmedSearch) ||
        j.model.toLowerCase().includes(trimmedSearch) ||
        j.complaint.toLowerCase().includes(trimmedSearch)
    );
  } else if (currentSegment === 'active') {
    // Active: received + waiting, oldest first
    displayedJobs = allJobs
      .filter((j) => j.status === 'received' || j.status === 'waiting')
      .sort((a, b) => a.receivedAt - b.receivedAt);
  } else if (currentSegment === 'ready') {
    // Ready: oldest ready first
    displayedJobs = allJobs
      .filter((j) => j.status === 'ready')
      .sort((a, b) => (a.readyAt || a.receivedAt) - (b.readyAt || b.receivedAt));
  } else {
    // History: delivered + returned, newest first
    displayedJobs = allJobs
      .filter((j) => j.status === 'delivered' || j.status === 'returned')
      .sort((a, b) => (b.deliveredAt || b.receivedAt) - (a.deliveredAt || a.receivedAt));
  }

  const getStatusChip = (status: Job['status']) => {
    switch (status) {
      case 'received':
        return { label: t('status_received', language), cls: 'bg-gray-100 text-gray-700' };
      case 'waiting':
        return { label: t('status_waiting', language), cls: 'bg-amber-100 text-[#FF9500]' };
      case 'ready':
        return { label: t('status_ready', language), cls: 'bg-green-100 text-iosGreen' };
      case 'delivered':
        return { label: t('status_delivered', language), cls: 'bg-gray-100 text-[#8E8E93]' };
      case 'returned':
        return { label: t('status_returned', language), cls: 'bg-gray-100 text-gray-500' };
    }
  };

  const handleDeleteJob = async () => {
    if (jobToDelete && jobToDelete.id) {
      await db.jobs.delete(jobToDelete.id);
      setJobToDelete(null);
      if (selectedJob?.id === jobToDelete.id) {
        setSelectedJob(null);
      }
    }
  };

  return (
    <div className="min-h-screen pb-28 pt-2">
      <div className="max-w-lg mx-auto px-4">
        {/* Header Title with Big Shop Name */}
        <div className="pt-2 pb-1 mb-2">
          <div className="flex items-center justify-between">
            <h1 className="text-[30px] font-black text-black tracking-tight leading-tight">
              {shopName || 'My Mobile Shop'}
            </h1>
            <span className="text-xs font-bold text-iosBlue bg-blue-50 px-2.5 py-1 rounded-full border border-blue-100">
              {t('tab_repairs', language)}
            </span>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative mb-3">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#8E8E93]">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t('search_jobs_placeholder', language)}
            className="w-full bg-[#E3E3E8]/80 text-[15px] text-black placeholder:text-[#8E8E93] rounded-[10px] pl-10 pr-9 py-2 focus:outline-none focus:ring-2 focus:ring-iosBlue/40 border border-black/[0.03]"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-[#8E8E93] hover:text-black"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Segmented Control (Active / Ready / History) */}
        {!searchQuery && (
          <div className="mb-3.5">
            <SegmentedControl<RepairSegment>
              value={currentSegment}
              onChange={(val) => setCurrentSegment(val)}
              size="md"
              options={[
                {
                  value: 'active',
                  label: t('segment_active', language),
                },
                {
                  value: 'ready',
                  label: `${t('segment_ready', language)}${readyCount > 0 ? ` (${readyCount})` : ''}`,
                },
                {
                  value: 'history',
                  label: t('segment_history', language),
                },
              ]}
            />
          </div>
        )}

        {/* List of Jobs */}
        {displayedJobs.length === 0 ? (
          <div className="bg-white rounded-[14px] p-8 text-center shadow-sm border border-black/[0.04] my-6">
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
                  setJobToEdit(null);
                  setIsAddEditOpen(true);
                }}
                className="mt-4 inline-flex items-center space-x-1.5 px-4 py-2 bg-iosBlue text-white text-sm font-semibold rounded-full shadow-sm active:opacity-80 transition-opacity"
              >
                <Plus className="w-4 h-4" />
                <span>{t('new_job_btn', language)}</span>
              </button>
            )}
          </div>
        ) : (
          <div className="bg-white rounded-[14px] shadow-sm border border-black/[0.04] overflow-hidden mb-6">
            {displayedJobs.map((job, idx) => {
              const chip = getStatusChip(job.status);
              const daysInShop = calculateDaysInShop(job.receivedAt);
              const showDaysCounter = job.status === 'received' || job.status === 'waiting' || job.status === 'ready';

              return (
                <div
                  key={job.id ?? idx}
                  onClick={() => setSelectedJob(job)}
                  className={`p-4 cursor-pointer hover:bg-black/[0.015] active:bg-black/[0.04] transition-colors ${
                    idx !== 0 ? 'border-t border-[#E5E5EA]' : ''
                  }`}
                >
                  <div className="flex items-start justify-between">
                    {/* Left info */}
                    <div className="flex-1 min-w-0 pr-3">
                      <div className="flex items-center space-x-2">
                        <span className="text-[16px] font-bold text-black truncate">
                          {job.customerName}
                        </span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${chip.cls}`}
                        >
                          {chip.label}
                        </span>
                      </div>

                      {/* Model & Complaint */}
                      <p className="text-[14px] font-semibold text-iosBlue mt-0.5 truncate">
                        {job.model}
                      </p>
                      <p className="text-xs text-[#8E8E93] mt-0.5 line-clamp-1 truncate">
                        {job.complaint}
                      </p>

                      {/* Days Counter */}
                      {showDaysCounter && (
                        <div className="flex items-center space-x-1 mt-1 text-[11px] text-[#8E8E93]">
                          <Clock className="w-3 h-3 text-amber-500" />
                          <span>{t('days_in_shop', language, { n: daysInShop })}</span>
                          <span className="font-mono ml-2">• {job.phone}</span>
                        </div>
                      )}
                    </div>

                    {/* Right side: WhatsApp Notify if Ready or Details arrow */}
                    <div className="flex items-center space-x-2 flex-shrink-0">
                      {job.status === 'ready' && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            openWhatsAppNotification(job, shopName);
                          }}
                          className="px-3 py-1.5 bg-green-50 text-iosGreen hover:bg-green-100 rounded-full text-xs font-bold flex items-center space-x-1 active:scale-95 transition-all border border-green-200"
                        >
                          <MessageSquare className="w-3.5 h-3.5 text-iosGreen" />
                          <span>{t('whatsapp_btn', language)}</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Floating "+ പുതിയ ജോലി" Button */}
      <div className="fixed bottom-[calc(env(safe-area-inset-bottom)+66px)] right-5 z-30">
        <button
          type="button"
          onClick={() => {
            setJobToEdit(null);
            setIsAddEditOpen(true);
          }}
          disabled={isReadOnly}
          className={`h-13 px-5 py-3 rounded-full flex items-center space-x-2 font-bold text-[15px] shadow-lg active:scale-95 transition-all duration-150 ${
            isReadOnly
              ? 'bg-gray-400 text-white cursor-not-allowed'
              : 'bg-iosBlue text-white shadow-iosBlue/35 hover:bg-blue-600'
          }`}
        >
          <Plus className="w-5 h-5 stroke-[2.5]" />
          <span>{t('new_job_btn', language)}</span>
        </button>
      </div>

      {/* Add / Edit Sheet */}
      <AddEditJobSheet
        isOpen={isAddEditOpen}
        onClose={() => setIsAddEditOpen(false)}
        jobToEdit={jobToEdit}
        language={language}
        onSaved={async (id) => {
          const fresh = await db.jobs.get(id);
          if (fresh) setSelectedJob(fresh);
        }}
      />

      {/* Job Detail Sheet */}
      <JobDetailSheet
        isOpen={!!selectedJob}
        onClose={() => setSelectedJob(null)}
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
        onJobUpdated={async () => {
          if (selectedJob?.id) {
            const fresh = await db.jobs.get(selectedJob.id);
            setSelectedJob(fresh || null);
          }
        }}
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
    </div>
  );
};
