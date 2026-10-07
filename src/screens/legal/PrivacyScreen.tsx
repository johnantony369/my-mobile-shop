import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, Database, Lock, Mail, ArrowLeft, ArrowUpRight } from 'lucide-react';

export const PrivacyScreen: React.FC = () => {
  return (
    <div className="min-h-screen bg-[#F2F2F7] text-slate-800 font-sans selection:bg-iosBlue/20 pb-16">
      {/* Top Bar */}
      <header className="sticky top-0 z-20 bg-white/90 backdrop-blur-md border-b border-black/[0.06] px-4 py-3.5">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-iosBlue hover:underline active:scale-95 transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Home</span>
          </Link>
          <div className="flex items-center gap-2">
            <img src="/icon-192.png" alt="My Mobile Shop" className="w-6 h-6 rounded-md shadow-xs" />
            <span className="text-xs font-bold text-slate-900 tracking-tight">My Mobile Shop</span>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-3xl mx-auto px-4 pt-8">
        <div className="bg-white rounded-3xl p-6 sm:p-10 shadow-sm border border-black/[0.04] space-y-6">
          {/* Header */}
          <div className="border-b border-slate-100 pb-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-50 text-iosBlue rounded-full text-xs font-semibold mb-3">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Official Policy</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Privacy Policy
            </h1>
            <p className="text-xs text-slate-500 mt-1.5">
              Last updated: October 8, 2026 • Effective for My Mobile Shop (Web & Android)
            </p>
          </div>

          {/* Highlights Box */}
          <div className="p-4 bg-blue-50/70 rounded-2xl border border-blue-100 text-xs text-blue-900 leading-relaxed">
            <strong>Summary:</strong> My Mobile Shop is architected privacy-first and local-first. Your daybook accounts, cash receipts, and customer repair phone numbers belong exclusively to you. We do not sell or monetize your business records with third parties.
          </div>

          {/* Section 1 */}
          <section className="space-y-2">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Database className="w-4 h-4 text-iosBlue" />
              1. Local-First Storage & IndexedDB
            </h2>
            <p className="text-xs leading-relaxed text-slate-600">
              By default, all your shop registers (cash-in/out entries, customer names, repair tickets, inventory counts) are saved directly on your local device storage using <strong>IndexedDB</strong>. The app works 100% offline without sending your daily records to remote servers unless cloud synchronization is enabled.
            </p>
          </section>

          {/* Section 2 */}
          <section className="space-y-2">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Lock className="w-4 h-4 text-iosBlue" />
              2. Cloud Backup & Google Firebase
            </h2>
            <p className="text-xs leading-relaxed text-slate-600">
              When you optionally log in with an account (Google Sign-In, Shop ID, or Phone OTP), encrypted records are synchronized to <strong>Google Firebase (Cloud Firestore & Firebase Authentication)</strong>. This guarantees that your business records survive hardware failure and sync across your mobile counter and PC devices.
            </p>
          </section>

          {/* Section 3 */}
          <section className="space-y-2">
            <h2 className="text-base font-bold text-slate-900">
              3. Information We Collect
            </h2>
            <ul className="list-disc pl-5 text-xs text-slate-600 space-y-1.5 leading-relaxed">
              <li><strong>Account Credentials:</strong> Shop ID, email address, or phone number used to verify your business account.</li>
              <li><strong>Shop Operational Records:</strong> Cash transaction amounts, device model numbers, repair fault notes, and customer contact numbers entered for invoice generation.</li>
              <li><strong>Device & Diagnostics:</strong> Anonymous app crash telemetry and offline caching state to improve app reliability.</li>
            </ul>
          </section>

          {/* Section 4 */}
          <section className="space-y-2">
            <h2 className="text-base font-bold text-slate-900">
              4. Data Retention & Account Deletion
            </h2>
            <p className="text-xs leading-relaxed text-slate-600">
              You maintain total ownership of your data. You can export complete CSV / JSON daybook ledgers at any time from Settings. You can also wipe all local records or initiate complete account and cloud data deletion via our in-app settings or through our dedicated{' '}
              <Link to="/delete-account" className="text-iosBlue font-semibold hover:underline inline-flex items-center gap-0.5">
                Account Deletion Page <ArrowUpRight className="w-3 h-3" />
              </Link>.
            </p>
          </section>

          {/* Section 5 */}
          <section className="space-y-2">
            <h2 className="text-base font-bold text-slate-900">
              5. Children’s Privacy
            </h2>
            <p className="text-xs leading-relaxed text-slate-600">
              My Mobile Shop is a commercial daybook tool intended solely for business owners and technicians aged 18 and older. We do not knowingly solicit or collect data from children under 13.
            </p>
          </section>

          {/* Section 6 */}
          <section className="space-y-2 pt-4 border-t border-slate-100">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Mail className="w-4 h-4 text-iosBlue" />
              6. Contact & Data Privacy Officer
            </h2>
            <p className="text-xs leading-relaxed text-slate-600">
              For any questions regarding this Privacy Policy or your personal data rights, please email us directly at{' '}
              <a
                href="mailto:support@mymobileshop.online"
                className="text-iosBlue font-semibold hover:underline"
              >
                support@mymobileshop.online
              </a>.
            </p>
          </section>

          {/* Navigation Links */}
          <div className="pt-6 border-t border-slate-100 flex flex-wrap gap-4 text-xs">
            <Link to="/terms" className="text-iosBlue hover:underline font-medium">
              Terms of Service
            </Link>
            <span className="text-slate-300">•</span>
            <Link to="/delete-account" className="text-iosBlue hover:underline font-medium">
              Data & Account Deletion Request
            </Link>
            <span className="text-slate-300">•</span>
            <Link to="/app" className="text-iosBlue hover:underline font-medium">
              Open App Counter
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
};
