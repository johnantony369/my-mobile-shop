import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { doc, onSnapshot } from 'firebase/firestore';
import { dbFirestore, isFirebaseConfigured } from '../firebase/config';
import { db, getJobPhotos } from '../db/db';
import { PublicRepairTrack } from '../types';
import { formatINR } from '../i18n';
import { buildPublicRepairTrack } from '../firebase/sync';
import { PhotoViewerModal, PhotoItem } from '../components/PhotoViewerModal';
import {
  Smartphone,
  CheckCircle2,
  Clock,
  Wrench,
  PackageCheck,
  Phone,
  MessageCircle,
  Store,
  AlertTriangle,
  RefreshCw,
  ShieldCheck,
  Camera,
} from 'lucide-react';

function formatDateTime(ms?: number | null): string {
  if (!ms) return '';
  const d = new Date(ms);
  return d.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

interface TrackRepairViewProps {
  repair: PublicRepairTrack;
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

export const TrackRepairView: React.FC<TrackRepairViewProps> = ({
  repair,
  onRefresh,
  isRefreshing,
}) => {
  const isReturned = repair.status === 'returned';
  const isDelivered = repair.status === 'delivered';
  const isReady = repair.status === 'ready';
  const isInProgress = repair.status === 'waiting' || repair.status === 'received';

  const [selectedPhoto, setSelectedPhoto] = useState<PhotoItem | null>(null);

  const intakePhotos = (repair.photos || []).filter((p) => !p.tag || p.tag === 'intake');
  const readyPhotos = (repair.photos || []).filter((p) => p.tag === 'ready');
  const hasPhotos = (repair.photos || []).length > 0;

  // Step active checks:
  // 1: Received is always done
  // 2: In Progress is done if ready or delivered; active if received or waiting
  // 3: Ready is done if delivered; active if ready; upcoming if received or waiting
  // 4: Delivered is done if delivered; upcoming otherwise
  const step1Done = true;
  const step2Done = isReady || isDelivered;
  const step2Active = isInProgress;
  const step3Done = isDelivered;
  const step3Active = isReady;
  const step4Done = isDelivered;

  const balanceDue = repair.balanceDue ?? Math.max(0, (repair.estimate || 0) - (repair.advance || 0));

  const cleanPhone = (repair.shopPhone || '').replace(/\D/g, '');

  return (
    <div className="min-h-screen bg-[#F2F2F7] text-slate-900 pb-12 selection:bg-iosBlue/20 font-sans">
      {/* Header bar */}
      <header className="sticky top-0 z-20 bg-white/90 backdrop-blur-md border-b border-black/[0.06] py-3.5 px-4 shadow-2xs">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {repair.shopLogo ? (
              <img
                src={repair.shopLogo}
                alt={repair.shopName}
                className="w-8 h-8 rounded-full object-cover shadow-2xs border border-black/[0.06]"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-blue-50 text-iosBlue flex items-center justify-center font-bold text-xs shadow-2xs">
                <Wrench className="w-4 h-4" />
              </div>
            )}
            <div>
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block leading-none">
                Live Repair Tracker
              </span>
              <span className="text-[15px] font-bold text-slate-900 tracking-tight leading-tight">
                {repair.shopName || 'Mobile Repair Center'}
              </span>
            </div>
          </div>

          {onRefresh && (
            <button
              type="button"
              onClick={onRefresh}
              disabled={isRefreshing}
              className="p-2 rounded-full text-slate-500 hover:text-slate-900 active:scale-95 transition-all"
              title="Refresh status"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-iosBlue' : ''}`} />
            </button>
          )}
        </div>
      </header>

      <main className="max-w-md mx-auto px-4 pt-4 space-y-3.5">
        {/* Device & Status Card */}
        <div className="bg-white rounded-[20px] p-5 shadow-sm border border-black/[0.04]">
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-3">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-700 shrink-0 shadow-2xs">
                <Smartphone className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-iosBlue bg-blue-50 px-2 py-0.5 rounded-full inline-block mb-1">
                  Job ID: #{repair.cloudId.slice(-6).toUpperCase()}
                </span>
                <h1 className="text-[20px] font-extrabold text-slate-900 tracking-tight leading-tight">
                  {repair.model}
                </h1>
                <p className="text-[13px] text-slate-500 mt-0.5">
                  Issue: <span className="text-slate-800 font-medium">{repair.complaint}</span>
                </p>
              </div>
            </div>
          </div>

          {/* Alert if returned */}
          {isReturned && (
            <div className="mt-4 p-3 bg-amber-50 border border-amber-200/80 rounded-[14px] text-amber-900 text-xs flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600" />
              <span>Device returned without repair. Please visit the shop for more details.</span>
            </div>
          )}

          {/* Highlight banner if ready */}
          {isReady && !isReturned && (
            <div className="mt-4 p-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-[16px] text-white shadow-md shadow-blue-500/20 flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                  <PackageCheck className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h4 className="text-[14px] font-bold leading-tight">Ready for Pickup!</h4>
                  <p className="text-xs text-blue-100 mt-0.5">Please bring your slip to collect.</p>
                </div>
              </div>
              <span className="text-xs bg-white text-blue-700 font-bold px-2.5 py-1 rounded-full shadow-2xs">
                Collect Now
              </span>
            </div>
          )}

          {/* Highlight banner if delivered */}
          {isDelivered && (
            <div className="mt-4 p-3.5 bg-emerald-50 border border-emerald-200 rounded-[16px] text-emerald-900 flex items-center space-x-2.5">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <div className="text-xs">
                <span className="font-bold block">Delivered & Completed</span>
                <span className="text-emerald-700">Thank you for visiting {repair.shopName}!</span>
              </div>
            </div>
          )}
        </div>

        {/* Visual Step Timeline */}
        <div className="bg-white rounded-[20px] p-5 shadow-sm border border-black/[0.04]">
          <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4 flex items-center justify-between">
            <span>Repair Progress</span>
            <span className="text-[11px] text-iosBlue font-bold flex items-center space-x-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Live Updates</span>
            </span>
          </h2>

          <div className="relative pl-7 space-y-6 before:absolute before:left-3 before:top-2 before:bottom-3 before:w-[2px] before:bg-slate-200">
            {/* Step 1: Received */}
            <div className="relative">
              <div
                className={`absolute -left-7 top-0 w-6 h-6 rounded-full flex items-center justify-center shadow-xs ${
                  step1Done
                    ? 'bg-emerald-500 text-white'
                    : 'bg-slate-200 text-slate-400'
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
              </div>
              <div>
                <h3 className="text-[14px] font-bold text-slate-900 leading-tight">
                  Device Received
                </h3>
                <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                  Device received at counter & logged for inspection
                </p>
                {repair.receivedAt && (
                  <span className="text-[11px] text-slate-400 font-medium block mt-1">
                    {formatDateTime(repair.receivedAt)}
                  </span>
                )}
              </div>
            </div>

            {/* Step 2: Under Service & Diagnosis */}
            <div className="relative">
              <div
                className={`absolute -left-7 top-0 w-6 h-6 rounded-full flex items-center justify-center shadow-xs transition-all ${
                  step2Done
                    ? 'bg-emerald-500 text-white'
                    : step2Active
                    ? 'bg-amber-500 text-white ring-4 ring-amber-100 animate-pulse'
                    : 'bg-slate-200 text-slate-400'
                }`}
              >
                {step2Done ? (
                  <CheckCircle2 className="w-3.5 h-3.5" />
                ) : (
                  <Clock className="w-3.5 h-3.5" />
                )}
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h3 className="text-[14px] font-bold text-slate-900 leading-tight">
                    Under Service &amp; Diagnosis
                  </h3>
                  {step2Active && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                      In Progress
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                  Technician diagnosing / waiting for parts &amp; repair underway
                </p>
                {repair.expectedDate && (
                  <span className="text-[11px] text-iosBlue font-medium block mt-1">
                    Estimated ready: {repair.expectedDate}
                  </span>
                )}
              </div>
            </div>

            {/* Step 3: Ready for Pickup */}
            <div className="relative">
              <div
                className={`absolute -left-7 top-0 w-6 h-6 rounded-full flex items-center justify-center shadow-xs transition-all ${
                  step3Done
                    ? 'bg-emerald-500 text-white'
                    : step3Active
                    ? 'bg-blue-600 text-white ring-4 ring-blue-100 animate-pulse'
                    : 'bg-slate-200 text-slate-400'
                }`}
              >
                {step3Done ? (
                  <CheckCircle2 className="w-3.5 h-3.5" />
                ) : (
                  <PackageCheck className="w-3.5 h-3.5" />
                )}
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h3 className="text-[14px] font-bold text-slate-900 leading-tight">
                    Ready for Pickup
                  </h3>
                  {step3Active && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
                      Completed
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                  Quality check passed! Your device is ready to collect at the counter.
                </p>
                {repair.readyAt && (
                  <span className="text-[11px] text-slate-400 font-medium block mt-1">
                    {formatDateTime(repair.readyAt)}
                  </span>
                )}
              </div>
            </div>

            {/* Step 4: Delivered & Completed */}
            <div className="relative">
              <div
                className={`absolute -left-7 top-0 w-6 h-6 rounded-full flex items-center justify-center shadow-xs ${
                  step4Done
                    ? 'bg-emerald-500 text-white'
                    : 'bg-slate-200 text-slate-400'
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
              </div>
              <div>
                <h3 className="text-[14px] font-bold text-slate-900 leading-tight">
                  Delivered
                </h3>
                <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                  Thank you for choosing us
                </p>
                {repair.deliveredAt && (
                  <span className="text-[11px] text-slate-400 font-medium block mt-1">
                    {formatDateTime(repair.deliveredAt)}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Payment & Estimate Card */}
        <div className="bg-white rounded-[20px] p-5 shadow-sm border border-black/[0.04]">
          <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
            Payment &amp; Estimate
          </h2>

          <div className="space-y-2.5">
            {repair.estimate !== undefined && repair.estimate > 0 && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500">Repair Estimate</span>
                <span className="font-semibold text-slate-800">{formatINR(repair.estimate)}</span>
              </div>
            )}

            {repair.advance !== undefined && repair.advance > 0 && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500">Advance Paid</span>
                <span className="font-semibold text-emerald-600">-{formatINR(repair.advance)}</span>
              </div>
            )}

            <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
              <div>
                <span className="text-sm font-bold text-slate-900 block leading-tight">
                  {isDelivered ? 'Total Amount Paid' : 'Amount To Pay'}
                </span>
                <span className="text-[11px] text-slate-400">
                  {isDelivered ? 'Settled on delivery' : 'Payable upon collection'}
                </span>
              </div>
              <span className="text-[18px] font-extrabold text-slate-900 tracking-tight">
                {formatINR(balanceDue)}
              </span>
            </div>
          </div>
        </div>

        {/* Device Photos Card (Intake & Ready) */}
        {hasPhotos && (
          <div className="bg-white rounded-[20px] p-5 shadow-sm border border-black/[0.04] space-y-4">
            <div className="flex items-center space-x-2">
              <Camera className="w-4 h-4 text-iosBlue" />
              <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Device Condition &amp; Work Photos
              </h2>
            </div>

            {/* Intake Photos */}
            {intakePhotos.length > 0 && (
              <div>
                <span className="text-[12px] font-bold text-slate-700 block mb-2">
                  Received Condition ({intakePhotos.length})
                </span>
                <div className="grid grid-cols-4 gap-2">
                  {intakePhotos.map((p) => {
                    const src = p.dataUrl || p.downloadUrl || '';
                    return (
                      <button
                        key={p.photoId}
                        type="button"
                        onClick={() => setSelectedPhoto(p)}
                        className="aspect-square rounded-[12px] overflow-hidden bg-slate-100 border border-slate-200/80 active:scale-95 transition-transform relative group focus:outline-hidden"
                      >
                        <img
                          src={src}
                          alt={p.label || 'Intake Condition'}
                          className="w-full h-full object-cover"
                        />
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Ready Photos */}
            {readyPhotos.length > 0 && (
              <div>
                <span className="text-[12px] font-bold text-emerald-700 block mb-2">
                  Repaired / Ready for Pickup ({readyPhotos.length})
                </span>
                <div className="grid grid-cols-4 gap-2">
                  {readyPhotos.map((p) => {
                    const src = p.dataUrl || p.downloadUrl || '';
                    return (
                      <button
                        key={p.photoId}
                        type="button"
                        onClick={() => setSelectedPhoto(p)}
                        className="aspect-square rounded-[12px] overflow-hidden bg-emerald-50/50 border border-emerald-300 active:scale-95 transition-transform relative group focus:outline-hidden"
                      >
                        <img
                          src={src}
                          alt={p.label || 'Repaired Device'}
                          className="w-full h-full object-cover"
                        />
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Shop Contact Card */}
        <div className="bg-white rounded-[20px] p-5 shadow-sm border border-black/[0.04]">
          <div className="flex items-center space-x-3 mb-3.5">
            {repair.shopLogo ? (
              <img
                src={repair.shopLogo}
                alt={repair.shopName}
                className="w-10 h-10 rounded-full object-cover shrink-0 border border-black/[0.06]"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-700 shrink-0">
                <Store className="w-5 h-5 text-iosBlue" />
              </div>
            )}
            <div>
              <h3 className="text-[15px] font-bold text-slate-900 leading-tight">
                {repair.shopName || 'Mobile Repair Center'}
              </h3>
              {repair.shopAddress && (
                <p className="text-xs text-slate-500 mt-0.5 leading-snug">{repair.shopAddress}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-1">
            {cleanPhone ? (
              <>
                <a
                  href={`tel:${cleanPhone}`}
                  className="py-2.5 px-3 rounded-[12px] bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-800 text-xs font-bold flex items-center justify-center space-x-1.5 transition-all"
                >
                  <Phone className="w-3.5 h-3.5 text-iosBlue" />
                  <span>Call Shop</span>
                </a>
                <a
                  href={`https://wa.me/91${cleanPhone.slice(-10)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="py-2.5 px-3 rounded-[12px] bg-[#25D366] hover:bg-emerald-600 active:scale-95 text-white text-xs font-bold flex items-center justify-center space-x-1.5 shadow-xs transition-all"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  <span>WhatsApp</span>
                </a>
              </>
            ) : (
              <div className="col-span-2 py-2 text-center text-xs text-slate-400">
                Contact your service center for inquiries.
              </div>
            )}
          </div>
        </div>

        {/* Trust & Safe Footer */}
        <div className="text-center pt-2 space-y-1">
          <div className="flex items-center justify-center space-x-1 text-xs text-slate-400">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>Official live service tracking</span>
          </div>
          <p className="text-[11px] text-slate-400">
            Powered by My Mobile Shop Digital Day Book
          </p>
        </div>
      </main>

      <PhotoViewerModal
        isOpen={Boolean(selectedPhoto)}
        photo={selectedPhoto}
        onClose={() => setSelectedPhoto(null)}
      />
    </div>
  );
};

export const TrackRepairScreen: React.FC = () => {
  const { trackingId } = useParams<{ trackingId: string }>();
  const [repair, setRepair] = useState<PublicRepairTrack | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchTrackData = async () => {
    if (!trackingId) {
      setError('Invalid tracking URL');
      setLoading(false);
      return;
    }

    try {
      // 1. Try local IndexedDB first for instant local testing or offline shop owner preview
      const localJob = await db.jobs.where('cloudId').equals(trackingId).first();
      if (localJob) {
        const settings = await db.settings.toCollection().first();
        const photos = await getJobPhotos(trackingId);
        setRepair(buildPublicRepairTrack(localJob, settings, photos));
        setLoading(false);
      }

      // 2. Try Firestore public_repairs collection
      if (isFirebaseConfigured() && dbFirestore) {
        const docRef = doc(dbFirestore, 'public_repairs', trackingId);
        const unsub = onSnapshot(
          docRef,
          (snapshot) => {
            if (snapshot.exists()) {
              setRepair(snapshot.data() as PublicRepairTrack);
              setError(null);
            } else if (!localJob) {
              setError('Repair record not found. Please verify the tracking link.');
            }
            setLoading(false);
            setIsRefreshing(false);
          },
          (err) => {
            console.warn('Firestore live track error:', err);
            if (!localJob) {
              setError('Unable to load live status. Please check your internet connection.');
            }
            setLoading(false);
            setIsRefreshing(false);
          }
        );
        return () => unsub();
      } else if (!localJob) {
        setError('Repair record not found. Please check your link.');
        setLoading(false);
      }
    } catch (err) {
      console.error('Failed to load tracking data:', err);
      setError('Unable to connect to service. Please try again.');
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchTrackData();
  }, [trackingId]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchTrackData();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F2F2F7] flex flex-col items-center justify-center p-6 text-center">
        <div className="w-10 h-10 border-3 border-iosBlue border-t-transparent rounded-full animate-spin mb-3" />
        <h3 className="text-sm font-semibold text-slate-700">Connecting to Live Service Tracker...</h3>
        <p className="text-xs text-slate-400 mt-1">Retrieving latest status updates</p>
      </div>
    );
  }

  if (error || !repair) {
    return (
      <div className="min-h-screen bg-[#F2F2F7] flex flex-col items-center justify-center p-6 text-center">
        <div className="w-14 h-14 rounded-2xl bg-white shadow-sm flex items-center justify-center text-amber-600 mb-3 border border-black/[0.04]">
          <AlertTriangle className="w-7 h-7" />
        </div>
        <h2 className="text-[18px] font-bold text-slate-900 tracking-tight">Repair Not Found</h2>
        <p className="text-xs text-slate-500 max-w-xs mt-1.5 leading-relaxed">
          {error || 'We could not locate this repair record. Please confirm the link provided by the shop.'}
        </p>
        <button
          type="button"
          onClick={handleRefresh}
          className="mt-4 px-4 py-2 bg-white rounded-full text-xs font-semibold text-slate-800 shadow-xs border border-black/[0.06] active:scale-95 transition-all"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <TrackRepairView
      repair={repair}
      onRefresh={handleRefresh}
      isRefreshing={isRefreshing}
    />
  );
};
export default TrackRepairScreen;
