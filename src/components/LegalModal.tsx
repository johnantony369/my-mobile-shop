import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, ShieldCheck, FileText, Lock, Database, Mail } from 'lucide-react';

interface LegalModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'privacy' | 'terms';
}

export const LegalModal: React.FC<LegalModalProps> = ({
  isOpen,
  onClose,
  initialTab = 'privacy',
}) => {
  const [activeTab, setActiveTab] = useState<'privacy' | 'terms'>(initialTab);

  if (!isOpen) return null;

  const content = (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-lg max-h-[85vh] flex flex-col shadow-2xl relative border border-slate-200 dark:border-slate-800 overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-900/30 text-iosBlue flex items-center justify-center">
              {activeTab === 'privacy' ? (
                <ShieldCheck className="w-4 h-4 text-iosBlue" />
              ) : (
                <FileText className="w-4 h-4 text-iosBlue" />
              )}
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white leading-tight">
                {activeTab === 'privacy' ? 'Privacy Policy' : 'Terms of Service'}
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                My Mobile Shop • mymobileshop.online
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center text-slate-500 hover:text-black dark:hover:text-white transition-colors"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Selector */}
        <div className="px-5 pt-3 pb-2 flex gap-2 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
          <button
            type="button"
            onClick={() => setActiveTab('privacy')}
            className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-semibold transition-all ${
              activeTab === 'privacy'
                ? 'bg-white dark:bg-slate-800 text-iosBlue shadow-xs'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Privacy Policy
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('terms')}
            className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-semibold transition-all ${
              activeTab === 'terms'
                ? 'bg-white dark:bg-slate-800 text-iosBlue shadow-xs'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Terms of Service
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-5 text-xs text-slate-600 dark:text-slate-300 space-y-4 leading-relaxed">
          {activeTab === 'privacy' ? (
            <>
              <div className="p-3 bg-blue-50/70 dark:bg-blue-900/20 rounded-2xl border border-blue-100 dark:border-blue-900/40 text-[11px] text-blue-900 dark:text-blue-200">
                <strong>Summary:</strong> My Mobile Shop is designed with a privacy-first, local-first architecture. Your shop transactions, daybook entries, and customer repair records belong strictly to you.
              </div>

              <section className="space-y-1.5">
                <h3 className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-1.5">
                  <Database className="w-3.5 h-3.5 text-iosBlue" />
                  1. Data Storage & Local-First Architecture
                </h3>
                <p>
                  By default, all your shop data (cash entries, repair job cards, customer notes) is stored directly inside your device's browser using <strong>IndexedDB</strong>. It never leaves your device unless you explicitly sign in for cloud synchronization.
                </p>
              </section>

              <section className="space-y-1.5">
                <h3 className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-iosBlue" />
                  2. Cloud Synchronization via Firebase
                </h3>
                <p>
                  When you optionally sign in using an account or Google sign-in, encrypted data is backed up to Google <strong>Firebase</strong> (Cloud Firestore) to enable cross-device synchronization and disaster recovery. We do not sell, rent, or monetize your shop data with third parties.
                </p>
              </section>

              <section className="space-y-1.5">
                <h3 className="font-bold text-slate-900 dark:text-white text-sm">
                  3. Information We Collect
                </h3>
                <ul className="list-disc pl-4 space-y-1">
                  <li><strong>Account Credentials:</strong> Email or Shop Login ID, password hash (managed by Firebase Authentication), or phone number if SMS OTP is chosen.</li>
                  <li><strong>Shop Operational Records:</strong> Cash-in/cash-out entries, repair device models, complaints, and customer phone numbers entered for repair receipts.</li>
                </ul>
              </section>

              <section className="space-y-1.5">
                <h3 className="font-bold text-slate-900 dark:text-white text-sm">
                  4. Data Ownership & Deletion
                </h3>
                <p>
                  You can export your complete transaction ledger anytime to CSV or JSON backup files in Settings. You can also wipe all local data or delete your records directly from the application interface.
                </p>
              </section>

              <section className="space-y-1.5 border-t border-slate-100 dark:border-slate-800 pt-3">
                <h3 className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-iosBlue" />
                  5. Contact & Privacy Inquiries
                </h3>
                <p>
                  For questions or requests regarding your data, reach us at{' '}
                  <a
                    href="mailto:support@mymobileshop.online"
                    className="text-iosBlue font-medium hover:underline"
                  >
                    support@mymobileshop.online
                  </a>.
                </p>
              </section>
            </>
          ) : (
            <>
              <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-2xl text-[11px] text-slate-700 dark:text-slate-300">
                <strong>Notice:</strong> By accessing or using My Mobile Shop, you agree to these Terms of Service.
              </div>

              <section className="space-y-1.5">
                <h3 className="font-bold text-slate-900 dark:text-white text-sm">
                  1. Nature of the Application
                </h3>
                <p>
                  My Mobile Shop is a digital accounting daybook and repair workflow management software built for mobile repair shops and small electronics retailers.
                </p>
              </section>

              <section className="space-y-1.5">
                <h3 className="font-bold text-slate-900 dark:text-white text-sm">
                  2. User Responsibilities
                </h3>
                <p>
                  You are responsible for safeguarding your login credentials and maintaining local backups of your business records.
                </p>
              </section>

              <section className="space-y-1.5">
                <h3 className="font-bold text-slate-900 dark:text-white text-sm">
                  3. Subscriptions & Payments
                </h3>
                <p>
                  Subscription upgrades (My Mobile Shop Pro) provide unlimited transactions and automated cloud sync. Payments are processed securely via authorized payment gateways (e.g. Razorpay).
                </p>
              </section>

              <section className="space-y-1.5">
                <h3 className="font-bold text-slate-900 dark:text-white text-sm">
                  4. Disclaimer & Limitations
                </h3>
                <p>
                  The service is provided on an "as is" and "as available" basis. We strive for high availability and offline reliability but recommend regular data exports.
                </p>
              </section>

              <section className="space-y-1.5 border-t border-slate-100 dark:border-slate-800 pt-3">
                <h3 className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-iosBlue" />
                  5. Contact Information
                </h3>
                <p>
                  For billing, support, or general inquiries, contact{' '}
                  <a
                    href="mailto:support@mymobileshop.online"
                    className="text-iosBlue font-medium hover:underline"
                  >
                    support@mymobileshop.online
                  </a>.
                </p>
              </section>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-white font-semibold text-xs rounded-xl transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );

  if (typeof document !== 'undefined') {
    return createPortal(content, document.body);
  }
  return content;
};
