import React, { useState } from 'react';
import { initAppSettings } from '../db/db';
import { auth, isFirebaseConfigured } from '../firebase/config';
import { pullCloudChanges } from '../firebase/sync';
import { LoginModal } from '../components/LoginModal';
import { seedSalonSampleData } from '../utils/seedData';
import { Sparkles, ArrowRight, Check } from 'lucide-react';

interface OnboardingScreenProps {
  onComplete: () => void;
}

export const OnboardingScreen: React.FC<OnboardingScreenProps> = ({ onComplete }) => {
  const [step, setStep] = useState<number>(1);
  const [salonName, setSalonName] = useState('Glow Studio');
  const [ownerName, setOwnerName] = useState('');
  const [ownerPhone, setOwnerPhone] = useState('');
  const [initialServices, setInitialServices] = useState<string[]>([
    'Haircut',
    'Hair Wash',
    'Facial',
    'Cleanup',
  ]);
  const [initialStaff] = useState<string[]>([
    'Anjali (Senior Stylist)',
    'Neha (Beautician)',
  ]);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);

  const availableSampleServices = [
    'Haircut',
    'Hair Wash',
    'Facial',
    'Cleanup',
    'Hair Coloring',
    'Manicure',
    'Pedicure',
    'Threading',
    'Waxing',
    'Bridal Makeup',
  ];

  const toggleService = (srv: string) => {
    setInitialServices((prev) =>
      prev.includes(srv) ? prev.filter((s) => s !== srv) : [...prev, srv]
    );
  };

  const handleFinish = async () => {
    try {
      const uid = auth?.currentUser?.uid;
      await initAppSettings(
        salonName.trim() || 'MySalon',
        'en',
        false,
        true,
        uid,
        ownerName.trim(),
        ownerPhone.trim()
      );
      // Seed initial sample data for high quality first launch experience
      await seedSalonSampleData();
      onComplete();
    } catch (err) {
      console.error(err);
      onComplete();
    }
  };

  const handleLoginSuccess = async () => {
    const uid = auth?.currentUser?.uid;
    if (uid) {
      await pullCloudChanges(uid);
    }
    onComplete();
  };

  return (
    <div className="min-h-screen bg-[#F6F5F3] flex flex-col justify-between p-6 max-w-md mx-auto select-none font-sans">
      {/* Top Header & Step Indicator */}
      <div className="pt-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-[10px] bg-[#171717] text-white flex items-center justify-center font-black text-sm">
              S
            </div>
            <span className="text-[17px] font-extrabold text-[#171717] tracking-tight">
              MySalon
            </span>
          </div>
          <span className="text-xs font-bold text-[#8E8E93] bg-[#EBEAE6] px-2.5 py-0.5 rounded-full">
            Step {step} of 5
          </span>
        </div>

        {/* Step 1: Salon Name */}
        {step === 1 && (
          <div className="space-y-4 pt-4 animate-fade-slide-in">
            <div>
              <h2 className="text-[26px] font-black text-[#171717] tracking-tight leading-tight">
                What is your salon called?
              </h2>
              <p className="text-[14px] text-[#6B6B6B] mt-1">
                This will appear on receipts and appointment confirmations.
              </p>
            </div>

            <div className="pt-2">
              <input
                type="text"
                autoFocus
                value={salonName}
                onChange={(e) => setSalonName(e.target.value)}
                placeholder="e.g. Glow Studio, Looks Parlour"
                className="w-full bg-white rounded-[16px] px-4 py-3.5 text-[18px] font-bold text-[#171717] border border-black/[0.06] shadow-xs focus:outline-none focus:ring-2 focus:ring-[#171717]/20"
              />
            </div>
          </div>
        )}

        {/* Step 2: Owner Name & Phone */}
        {step === 2 && (
          <div className="space-y-4 pt-4 animate-fade-slide-in">
            <div>
              <h2 className="text-[26px] font-black text-[#171717] tracking-tight leading-tight">
                Owner Details
              </h2>
              <p className="text-[14px] text-[#6B6B6B] mt-1">
                Your personal details to personalize your daily dashboard.
              </p>
            </div>

            <div className="space-y-3 pt-2">
              <div>
                <label className="text-[12px] font-semibold text-[#6B6B6B] block mb-1">
                  Owner Name
                </label>
                <input
                  type="text"
                  autoFocus
                  value={ownerName}
                  onChange={(e) => setOwnerName(e.target.value)}
                  placeholder="e.g. Priya / Rahul"
                  className="w-full bg-white rounded-[14px] px-4 py-3 text-[16px] font-bold text-[#171717] border border-black/[0.06] shadow-xs focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[12px] font-semibold text-[#6B6B6B] block mb-1">
                  WhatsApp Contact Number
                </label>
                <input
                  type="tel"
                  value={ownerPhone}
                  onChange={(e) => setOwnerPhone(e.target.value)}
                  placeholder="e.g. 9847123456"
                  className="w-full bg-white rounded-[14px] px-4 py-3 text-[16px] font-bold text-[#171717] border border-black/[0.06] shadow-xs focus:outline-none"
                />
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Add Initial Services */}
        {step === 3 && (
          <div className="space-y-4 pt-4 animate-fade-slide-in">
            <div>
              <h2 className="text-[26px] font-black text-[#171717] tracking-tight leading-tight">
                Select your services
              </h2>
              <p className="text-[14px] text-[#6B6B6B] mt-1">
                Pick what your salon offers. You can adjust prices anytime later.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2">
              {availableSampleServices.map((srv) => {
                const isSelected = initialServices.includes(srv);
                return (
                  <button
                    key={srv}
                    type="button"
                    onClick={() => toggleService(srv)}
                    className={`p-3 rounded-[14px] text-[13px] font-bold text-left flex items-center justify-between border transition-all ${
                      isSelected
                        ? 'bg-[#171717] text-white border-[#171717] shadow-xs'
                        : 'bg-white text-[#4A4A4A] border-black/[0.06]'
                    }`}
                  >
                    <span>{srv}</span>
                    {isSelected && <Check className="w-4 h-4 stroke-[2.5]" />}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Step 4: Add Staff */}
        {step === 4 && (
          <div className="space-y-4 pt-4 animate-fade-slide-in">
            <div>
              <h2 className="text-[26px] font-black text-[#171717] tracking-tight leading-tight">
                Add your team
              </h2>
              <p className="text-[14px] text-[#6B6B6B] mt-1">
                Keep MVP simple. We've added starter stylists for you.
              </p>
            </div>

            <div className="space-y-2 pt-2">
              {initialStaff.map((st, idx) => (
                <div
                  key={idx}
                  className="p-3.5 bg-white rounded-[14px] border border-black/[0.06] flex items-center justify-between text-[14px] font-bold text-[#171717]"
                >
                  <span>{st}</span>
                  <span className="text-xs text-[#34C759] font-semibold">Active</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Step 5: Done */}
        {step === 5 && (
          <div className="space-y-4 pt-10 text-center animate-fade-slide-in">
            <div className="w-16 h-16 bg-[#171717] text-white rounded-[22px] flex items-center justify-center mx-auto shadow-md">
              <Sparkles className="w-8 h-8" />
            </div>

            <div>
              <h2 className="text-[28px] font-black text-[#171717] tracking-tight leading-tight">
                Your salon is ready.
              </h2>
              <p className="text-[14px] text-[#6B6B6B] mt-1 max-w-xs mx-auto">
                Welcome to MySalon. Let's start managing appointments, clients and billing effortlessly.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Button Bar */}
      <div className="pt-6 space-y-3">
        {step < 5 ? (
          <button
            type="button"
            onClick={() => setStep((s) => s + 1)}
            className="w-full h-13 py-3.5 bg-[#171717] hover:bg-[#2C2C2E] active:scale-95 text-white font-bold text-[16px] rounded-[16px] shadow-sm flex items-center justify-center gap-2 transition-all"
          >
            <span>Continue</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        ) : (
          <button
            type="button"
            onClick={handleFinish}
            className="w-full h-13 py-3.5 bg-[#171717] hover:bg-[#2C2C2E] active:scale-95 text-white font-bold text-[16px] rounded-[16px] shadow-sm flex items-center justify-center gap-2 transition-all"
          >
            <span>Open MySalon</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        )}

        {step === 1 && isFirebaseConfigured() && (
          <button
            type="button"
            onClick={() => setIsLoginModalOpen(true)}
            className="w-full py-2.5 text-xs text-[#6B6B6B] hover:text-[#171717] font-semibold text-center"
          >
            Already have a salon account? Sign In
          </button>
        )}
      </div>

      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        onSuccess={handleLoginSuccess}
        language="en"
      />
    </div>
  );
};
