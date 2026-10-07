import React from 'react';
import { Link } from 'react-router-dom';
import { FileText, ArrowLeft, Mail } from 'lucide-react';

export const TermsScreen: React.FC = () => {
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
              <FileText className="w-3.5 h-3.5" />
              <span>Legal Terms</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Terms of Service
            </h1>
            <p className="text-xs text-slate-500 mt-1.5">
              Last updated: October 8, 2026 • Governing My Mobile Shop (Web & Mobile Apps)
            </p>
          </div>

          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 text-xs text-slate-700 leading-relaxed">
            <strong>Welcome to My Mobile Shop.</strong> By downloading, installing, or accessing the application (online at mymobileshop.online or via Android application), you agree to be bound by these Terms of Service.
          </div>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-slate-900">
              1. Purpose of the Software
            </h2>
            <p className="text-xs leading-relaxed text-slate-600">
              My Mobile Shop is a point-of-sale daybook, repair ticket tracking, and inventory accounting platform designed for electronics retail and mobile phone service shops.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-slate-900">
              2. User Accounts & Security
            </h2>
            <p className="text-xs leading-relaxed text-slate-600">
              You are responsible for keeping your device secure and safeguarding any authentication credentials. While My Mobile Shop offers local offline operation and encrypted cloud backups, you are strongly advised to perform regular CSV exports of critical financial daybooks.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-slate-900">
              3. Pro Subscriptions & Licensure
            </h2>
            <p className="text-xs leading-relaxed text-slate-600">
              Pro subscriptions provide extended benefits such as unlimited entries and automated multi-device cloud synchronization. Licensure may be activated via authorized activation codes, digital checkout, or enterprise agreements.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-slate-900">
              4. Disclaimer of Warranties & Limitation of Liability
            </h2>
            <p className="text-xs leading-relaxed text-slate-600">
              The service is provided on an &quot;AS IS&quot; and &quot;AS AVAILABLE&quot; basis without warranties of any kind. Under no circumstances will My Mobile Shop or its developers be held liable for indirect, incidental, or consequential business losses or device hardware issues.
            </p>
          </section>

          <section className="space-y-2 pt-4 border-t border-slate-100">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Mail className="w-4 h-4 text-iosBlue" />
              5. Contact Information
            </h2>
            <p className="text-xs leading-relaxed text-slate-600">
              If you have questions regarding these Terms, contact our support team at{' '}
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
            <Link to="/privacy" className="text-iosBlue hover:underline font-medium">
              Privacy Policy
            </Link>
            <span className="text-slate-300">•</span>
            <Link to="/delete-account" className="text-iosBlue hover:underline font-medium">
              Account Deletion
            </Link>
            <span className="text-slate-300">•</span>
            <Link to="/app" className="text-iosBlue hover:underline font-medium">
              Launch App
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
};
