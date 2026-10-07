import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Trash2, AlertTriangle, ArrowLeft, Mail, CheckCircle2 } from 'lucide-react';

export const DeleteAccountScreen: React.FC = () => {
  const [emailInput, setEmailInput] = useState('');
  const [shopNameInput, setShopNameInput] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmitRequest = (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailInput.trim()) return;
    setSubmitted(true);
  };

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

      {/* Main Content */}
      <main className="max-w-3xl mx-auto px-4 pt-8">
        <div className="bg-white rounded-3xl p-6 sm:p-10 shadow-sm border border-black/[0.04] space-y-6">
          <div className="border-b border-slate-100 pb-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-red-50 text-iosRed rounded-full text-xs font-semibold mb-3">
              <Trash2 className="w-3.5 h-3.5" />
              <span>Data & Account Privacy</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Delete Account & Associated Data
            </h1>
            <p className="text-xs text-slate-500 mt-1.5">
              Google Play Policy Compliant Account & Data Deletion Resource
            </p>
          </div>

          <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200/70 text-xs text-amber-900 leading-relaxed flex items-start gap-3">
            <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <strong>Permanent Action:</strong> Requesting account deletion permanently wipes all cloud-synchronized registers, repair job cards, customer details, and backup snapshots associated with your account from Google Cloud Firestore.
            </div>
          </div>

          {/* Option 1: In-App */}
          <section className="space-y-3">
            <h2 className="text-base font-bold text-slate-900">
              Method 1: Immediate In-App Deletion
            </h2>
            <p className="text-xs text-slate-600 leading-relaxed">
              If you have access to the app on your phone or computer, you can delete your account instantly:
            </p>
            <ol className="list-decimal pl-5 text-xs text-slate-600 space-y-1.5">
              <li>Open <strong>My Mobile Shop</strong>.</li>
              <li>Go to <strong>Settings</strong> (gear icon in the bottom menu).</li>
              <li>Scroll down to the <strong>Danger Zone / Account</strong> section.</li>
              <li>Tap <strong>Delete Account & All Data</strong> and confirm the deletion.</li>
            </ol>
            <div className="pt-1">
              <Link
                to="/app"
                className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl transition-colors"
              >
                Go to App Settings
              </Link>
            </div>
          </section>

          {/* Option 2: Web Deletion Request Form */}
          <section className="space-y-3 pt-6 border-t border-slate-100">
            <h2 className="text-base font-bold text-slate-900">
              Method 2: Web Request (Without Installing the App)
            </h2>
            <p className="text-xs text-slate-600 leading-relaxed">
              If you have uninstalled the app or lost access to your device, you can submit a manual deletion request below. Our team processes verification and cloud purging within 48 hours.
            </p>

            {submitted ? (
              <div className="p-4 bg-green-50 border border-green-200 rounded-2xl flex items-center gap-3 text-xs text-green-800">
                <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />
                <div>
                  <strong>Deletion Request Received:</strong> We have logged your request for <strong>{emailInput}</strong>. You will receive an email confirmation once cloud records are permanently purged.
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmitRequest} className="space-y-3 max-w-md pt-1">
                <div>
                  <label htmlFor="delete-email" className="block text-xs font-semibold text-slate-700 mb-1">
                    Registered Email or Phone Number *
                  </label>
                  <input
                    id="delete-email"
                    type="text"
                    required
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    placeholder="e.g. shopowner@gmail.com or 9876543210"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:border-iosBlue outline-none transition-all"
                  />
                </div>
                <div>
                  <label htmlFor="delete-shop-name" className="block text-xs font-semibold text-slate-700 mb-1">
                    Shop Name (Optional)
                  </label>
                  <input
                    id="delete-shop-name"
                    type="text"
                    value={shopNameInput}
                    onChange={(e) => setShopNameInput(e.target.value)}
                    placeholder="e.g. Metro Mobiles"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:border-iosBlue outline-none transition-all"
                  />
                </div>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-iosRed hover:bg-red-600 text-white text-xs font-bold rounded-xl active:scale-95 transition-all shadow-xs"
                >
                  Submit Account Deletion Request
                </button>
              </form>
            )}
          </section>

          {/* Option 3: Direct Email */}
          <section className="space-y-2 pt-6 border-t border-slate-100">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Mail className="w-4 h-4 text-iosBlue" />
              Method 3: Direct Email Assistance
            </h2>
            <p className="text-xs text-slate-600 leading-relaxed">
              You can also email us directly at{' '}
              <a
                href="mailto:support@mymobileshop.online?subject=Account%20Deletion%20Request"
                className="text-iosBlue font-semibold hover:underline"
              >
                support@mymobileshop.online
              </a>{' '}
              with the subject &quot;Account Deletion Request&quot; from your registered email address.
            </p>
          </section>

          {/* Footer links */}
          <div className="pt-6 border-t border-slate-100 flex flex-wrap gap-4 text-xs">
            <Link to="/privacy" className="text-iosBlue hover:underline font-medium">
              Privacy Policy
            </Link>
            <span className="text-slate-300">•</span>
            <Link to="/terms" className="text-iosBlue hover:underline font-medium">
              Terms of Service
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
};
