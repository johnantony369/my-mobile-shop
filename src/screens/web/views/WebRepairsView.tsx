import React, { useState } from 'react';
import { Job, Language } from '../../../types';
import { formatINR } from '../../../i18n';
import {
  Wrench,
  Search,
  Plus,
  Phone,
  Clock,
  PackageCheck,
  Eye
} from 'lucide-react';

interface WebRepairsViewProps {
  jobs: Job[];
  language: Language;
  onOpenAddJob: () => void;
  onSelectJob: (job: Job) => void;
  isReadOnly?: boolean;
}

export const WebRepairsView: React.FC<WebRepairsViewProps> = ({
  jobs,
  language: _language,
  onOpenAddJob,
  onSelectJob,
  isReadOnly = false,
}) => {
  const [statusFilter, setStatusFilter] = useState<'all' | 'received' | 'waiting' | 'ready' | 'delivered'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const readyJobsCount = jobs.filter((j) => j.status === 'ready').length;
  const inProgressCount = jobs.filter((j) => j.status === 'received' || j.status === 'waiting').length;

  const filteredJobs = jobs.filter((job) => {
    if (statusFilter !== 'all' && job.status !== statusFilter) return false;
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      (job.customerName && job.customerName.toLowerCase().includes(q)) ||
      (job.phone && job.phone.includes(q)) ||
      (job.model && job.model.toLowerCase().includes(q)) ||
      (job.complaint && job.complaint.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-6">
      {/* Top Repair KPI Counters */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Ready for Delivery</p>
            <h3 className="text-2xl font-black text-emerald-600 mt-1">{readyJobsCount}</h3>
            <p className="text-[11px] text-slate-400 mt-0.5">Customers can pick up now</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <PackageCheck className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">In Progress / Bench</p>
            <h3 className="text-2xl font-black text-indigo-600 mt-1">{inProgressCount}</h3>
            <p className="text-[11px] text-slate-400 mt-0.5">Currently being serviced</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
            <Clock className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Tickets</p>
            <h3 className="text-2xl font-black text-slate-900 mt-1">{jobs.length}</h3>
            <p className="text-[11px] text-slate-400 mt-0.5">Total repair history</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">
            <Wrench className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Repairs Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
        {/* Filter Chips & Action */}
        <div className="p-4 border-b border-slate-200/80 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto">
            <button
              type="button"
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                statusFilter === 'all'
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              All ({jobs.length})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('ready')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                statusFilter === 'ready'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
              }`}
            >
              Ready ({readyJobsCount})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('received')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                statusFilter === 'received'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100'
              }`}
            >
              Received
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('waiting')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                statusFilter === 'waiting'
                  ? 'bg-amber-600 text-white'
                  : 'bg-amber-50 text-amber-700 hover:bg-amber-100'
              }`}
            >
              Waiting for Parts
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('delivered')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                statusFilter === 'delivered'
                  ? 'bg-slate-700 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              Delivered
            </button>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="relative flex-1 md:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
              <input
                type="text"
                placeholder="Search customer, phone, model..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:border-blue-500 focus:bg-white transition-all"
              />
            </div>

            <button
              type="button"
              onClick={onOpenAddJob}
              disabled={isReadOnly}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs active:scale-95 transition-all disabled:opacity-50 shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>New Repair Job</span>
            </button>
          </div>
        </div>

        {/* Jobs List Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                <th className="py-3 px-5">Customer & Phone</th>
                <th className="py-3 px-5">Device Model</th>
                <th className="py-3 px-5">Issue / Complaint</th>
                <th className="py-3 px-5 text-right">Estimate</th>
                <th className="py-3 px-5 text-right">Advance / Due</th>
                <th className="py-3 px-5 text-center">Status</th>
                <th className="py-3 px-5 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {filteredJobs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    No repair tickets match the selected filter.
                  </td>
                </tr>
              ) : (
                filteredJobs.map((job) => {
                  const balance = Math.max(0, (job.estimate || 0) - (job.advance || 0));
                  return (
                    <tr key={job.id || job.cloudId} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-5">
                        <div className="font-semibold text-slate-900">{job.customerName}</div>
                        <div className="text-xs text-slate-400 font-medium flex items-center gap-1 mt-0.5">
                          <Phone className="w-3 h-3" />
                          <span>{job.phone}</span>
                        </div>
                      </td>
                      <td className="py-3 px-5 font-semibold text-slate-800">
                        {job.model}
                      </td>
                      <td className="py-3 px-5 text-xs text-slate-600 max-w-xs truncate">
                        {job.complaint || 'General service'}
                      </td>
                      <td className="py-3 px-5 text-right font-bold text-slate-900">
                        {formatINR(job.estimate || 0)}
                      </td>
                      <td className="py-3 px-5 text-right">
                        <div className="text-xs text-slate-500 font-medium">Adv: {formatINR(job.advance || 0)}</div>
                        <div className="text-xs font-bold text-rose-600 mt-0.5">Due: {formatINR(balance)}</div>
                      </td>
                      <td className="py-3 px-5 text-center">
                        <span
                          className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                            job.status === 'ready'
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                              : job.status === 'delivered'
                              ? 'bg-slate-100 text-slate-600'
                              : job.status === 'waiting'
                              ? 'bg-amber-100 text-amber-900 border border-amber-300'
                              : 'bg-indigo-50 text-indigo-700'
                          }`}
                        >
                          {job.status}
                        </span>
                      </td>
                      <td className="py-3 px-5 text-center">
                        <button
                          type="button"
                          onClick={() => onSelectJob(job)}
                          className="px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-800 transition-colors inline-flex items-center gap-1.5"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Manage</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
