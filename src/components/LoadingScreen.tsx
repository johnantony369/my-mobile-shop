import React from 'react';
import { ShieldCheck, RefreshCw } from 'lucide-react';

export interface LoadingScreenProps {
  message?: string;
  submessage?: string;
  timeout?: boolean;
  onReload?: () => void;
}

export const LoadingScreen: React.FC<LoadingScreenProps> = ({
  message = 'Loading your shop...',
  submessage = 'Syncing your offline ledger and Day Book',
  timeout = false,
  onReload,
}) => {
  return (
    <div className="min-h-screen bg-[#F2F2F7] flex flex-col items-center justify-between p-6 text-center select-none safe-top safe-bottom animate-fade-slide-in">
      {/* Top spacer to center content nicely */}
      <div className="w-full h-8" />

      {/* Center Branding & Loading Card */}
      <div className="flex flex-col items-center max-w-xs mx-auto space-y-5">
        {/* iOS App Squircle with breathing glow */}
        <div className="relative">
          <div className="size-20 rounded-[22px] bg-white shadow-md border border-black/5 flex items-center justify-center p-2.5">
            <img
              src="/icon-192.png"
              alt="My Mobile Shop"
              className="size-full object-cover rounded-[14px]"
            />
          </div>
          {/* Active pulse ring */}
          <span className="absolute -top-1 -right-1 flex size-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#007AFF] opacity-75" />
            <span className="relative inline-flex rounded-full size-3 bg-[#007AFF]" />
          </span>
        </div>

        {/* Title */}
        <div className="space-y-1">
          <h2 className="text-xl font-extrabold tracking-tight text-slate-900">
            My Mobile Shop
          </h2>
          <p className="text-sm font-semibold text-[#007AFF]">
            {message}
          </p>
          {submessage && (
            <p className="text-xs text-[#8E8E93] max-w-[260px] mx-auto leading-relaxed pt-0.5">
              {submessage}
            </p>
          )}
        </div>

        {/* iOS Blue Spinner */}
        <div className="pt-2">
          <div className="size-8 border-3 border-[#007AFF] border-t-transparent rounded-full animate-spin" />
        </div>

        {/* Timeout Fallback */}
        {timeout && (
          <div className="pt-3 space-y-2.5 animate-fade-slide-in">
            <p className="text-xs text-[#8E8E93]">
              Taking longer than usual to load...
            </p>
            <button
              type="button"
              onClick={onReload || (() => window.location.reload())}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#007AFF] hover:bg-[#0062cc] text-white text-xs font-semibold rounded-full shadow-xs active:scale-95 transition-all"
            >
              <RefreshCw className="size-3.5" />
              <span>Reload App</span>
            </button>
          </div>
        )}
      </div>

      {/* Bottom Trust Badge */}
      <div className="flex items-center gap-1.5 text-[11px] text-[#8E8E93] font-medium pb-2">
        <ShieldCheck className="size-3.5 text-[#34C759]" />
        <span>100% Offline-First & Cloud Protected</span>
      </div>
    </div>
  );
};
