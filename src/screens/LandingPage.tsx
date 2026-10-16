import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowRight, Check, ChevronDown, Menu, X, ShieldCheck, WifiOff, Mail, Globe } from 'lucide-react';
import { LegalModal } from '../components/LegalModal';
import {
  CountryCode,
  PRICING_CONFIG,
  SUPPORTED_COUNTRIES,
  formatPrice,
  calculateSavings,
  detectVisitorCountry,
  saveVisitorCountry,
  resolveVisitorCountry,
  STORAGE_KEY_COUNTRY,
  PlanId,
} from '../utils/pricing';

interface LandingPageProps { isAuthenticated?: boolean }
const faqs = [
  ['Will it work without internet?', 'Yes. My Mobile Shop is offline-first, so you can keep recording at the counter when your connection drops.'],
  ['Can I send repair receipts?', 'Create a job card with the device, fault and estimate, then share a clear receipt with your customer.'],
  ['Is my shop data private?', 'Your customer and shop data stays tied to your account and is not published as a public listing.'],
  ['How quickly can I start?', 'Create your shop, add your opening balance and start recording your first sale or repair.'],
];

export const LandingPage: React.FC<LandingPageProps> = ({ isAuthenticated = false }) => {
  const navigate = useNavigate();
  const [menu, setMenu] = useState(false);
  const [faq, setFaq] = useState<number | null>(null);
  const [legal, setLegal] = useState<'privacy' | 'terms' | null>(null);
  const [selectedCountry, setSelectedCountry] = useState<CountryCode>(() => detectVisitorCountry());

  useEffect(() => {
    let isMounted = true;
    try {
      const saved = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY_COUNTRY) : null;
      if (!saved) {
        resolveVisitorCountry().then((geoCountry) => {
          if (isMounted && geoCountry && !localStorage.getItem(STORAGE_KEY_COUNTRY)) {
            setSelectedCountry(geoCountry);
          }
        });
      }
    } catch {
      // ignore
    }
    return () => {
      isMounted = false;
    };
  }, []);

  const handleSelectCountry = (country: CountryCode) => {
    setSelectedCountry(country);
    saveVisitorCountry(country);
  };

  const start = () => navigate(isAuthenticated ? '/app' : '/login?mode=register');
  const signin = () => navigate(isAuthenticated ? '/app' : '/login');
  return (
    <div className="relative min-h-screen bg-white font-sans text-[#101828] antialiased selection:bg-sky-200 selection:text-sky-900">
      {/* Lunera-style Blue Sky Gradient Background at top */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-[880px] sm:h-[1020px] overflow-hidden bg-gradient-to-b from-[#b8ddfc] via-[#d7ecfd] via-35% to-white"
      >
        {/* Soft atmospheric radial glow */}
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 h-[560px] w-full max-w-6xl rounded-full bg-[radial-gradient(ellipse_at_center,rgba(130,190,255,0.45)_0%,rgba(215,236,253,0.25)_50%,transparent_75%)] blur-2xl" />
        {/* Soft cloud-like ambient highlights (Lunera fluffy clouds) */}
        <div className="absolute bottom-0 -left-24 h-72 w-96 rounded-full bg-white/75 blur-3xl" />
        <div className="absolute bottom-0 -right-24 h-72 w-96 rounded-full bg-white/75 blur-3xl" />
        <div className="absolute bottom-10 left-1/3 h-48 w-80 rounded-full bg-white/60 blur-3xl" />
      </div>

      {/* Floating Pill Header - Lunera Style */}
      <header className="sticky top-3 sm:top-5 z-50 px-3 sm:px-6">
        <div className="mx-auto flex h-14 sm:h-16 max-w-4xl items-center justify-between rounded-full border border-slate-200/80 bg-white/90 px-4 sm:px-6 shadow-[0_4px_24px_rgba(15,23,42,0.06)] backdrop-blur-md transition-all">
          {/* Logo & Brand */}
          <button
            onClick={() => {
              window.scrollTo({ top: 0, behavior: 'smooth' });
              navigate('/');
            }}
            className="flex items-center gap-2.5 text-left group"
          >
            <img
              src="/icon-192.png"
              alt="My Mobile Shop"
              className="size-7 sm:size-8 rounded-full object-cover shadow-xs ring-1 ring-slate-200/60 transition-transform group-hover:scale-105"
            />
            <span className="font-bold tracking-tight text-slate-900 text-sm sm:text-base">
              My Mobile Shop
            </span>
          </button>

          {/* Desktop Nav Links */}
          <nav className="hidden items-center gap-7 lg:gap-8 text-sm font-medium text-slate-600 md:flex">
            <a href="#features" className="hover:text-slate-950 transition-colors">Features</a>
            <a href="#workflow" className="hover:text-slate-950 transition-colors">How it works</a>
            <a href="#pricing" className="hover:text-slate-950 transition-colors">Pricing</a>
            <a href="#faq" className="hover:text-slate-950 transition-colors">FAQ</a>
          </nav>

          {/* Right Action Buttons */}
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={signin}
              className="hidden text-xs sm:text-sm font-semibold text-slate-600 hover:text-slate-950 transition-colors px-2 py-1.5 md:block"
            >
              {isAuthenticated ? 'Open shop' : 'Sign in'}
            </button>
            <button
              onClick={start}
              className="hidden rounded-full bg-black hover:bg-slate-900 px-4 sm:px-5 py-2 sm:py-2.5 text-xs sm:text-sm font-semibold text-white shadow-sm transition-all hover:shadow active:scale-95 md:inline-flex items-center gap-1.5"
            >
              {isAuthenticated ? 'Open shop' : 'Get started'}
              <ArrowRight className="size-3.5" />
            </button>
            <button
              onClick={() => setMenu(!menu)}
              className="flex size-9 items-center justify-center rounded-full text-slate-800 hover:bg-slate-100 active:scale-95 transition-all md:hidden"
              aria-label="Toggle navigation"
            >
              {menu ? <X className="size-5" /> : <Menu className="size-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Menu Card */}
        {menu && (
          <nav className="mt-2 mx-auto max-w-4xl rounded-2xl sm:rounded-3xl border border-slate-200/90 bg-white/95 p-4 shadow-xl backdrop-blur-xl md:hidden animate-fade-slide-in">
            <div className="space-y-1">
              {[
                { href: '#features', label: 'Features' },
                { href: '#workflow', label: 'How it works' },
                { href: '#pricing', label: 'Pricing' },
                { href: '#faq', label: 'FAQ' },
              ].map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  onClick={() => setMenu(false)}
                  className="block rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 hover:text-slate-950 transition-colors"
                >
                  {link.label}
                </a>
              ))}
            </div>
            <div className="flex gap-2.5 border-t border-slate-100 pt-3 mt-2">
              <button
                onClick={() => {
                  setMenu(false);
                  signin();
                }}
                className="flex-1 rounded-full border border-slate-200 py-2.5 text-sm font-semibold text-slate-800 active:bg-slate-50"
              >
                {isAuthenticated ? 'Open shop' : 'Sign in'}
              </button>
              <button
                onClick={() => {
                  setMenu(false);
                  start();
                }}
                className="flex-1 rounded-full bg-black py-2.5 text-sm font-semibold text-white active:bg-slate-900 shadow-sm"
              >
                {isAuthenticated ? 'Open shop' : 'Get started'}
              </button>
            </div>
          </nav>
        )}
      </header>

      {/* Main Content */}
      <main className="relative z-10">
        <section className="mx-auto max-w-6xl px-5 pb-20 pt-10 sm:pt-16 text-center sm:px-8">
          <p className="mx-auto mb-6 inline-flex items-center gap-2 rounded-full border border-sky-300/70 bg-white/80 backdrop-blur-sm px-3.5 py-1.5 text-xs font-semibold text-sky-950 shadow-xs">
            <span className="size-1.5 rounded-full bg-[#1769FF]" /> Built for independent mobile shops
          </p>
          <h1 className="mx-auto max-w-4xl text-balance text-[42px] font-bold leading-[1.04] tracking-[-0.05em] text-slate-950 sm:text-7xl">
            A calmer way to run your mobile shop.
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-base leading-7 text-slate-600 sm:text-lg">
            Keep your daily book, repair jobs and stock in one dependable counter app—so every sale, device and customer is easy to find.
          </p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <button
              onClick={start}
              className="min-h-12 inline-flex items-center justify-center gap-2 rounded-full bg-[#1769FF] hover:bg-[#1258d9] px-7 text-sm font-semibold text-white shadow-[0_10px_25px_rgba(23,105,255,0.28)] active:scale-95 transition-all"
            >
              {isAuthenticated ? 'Open my shop' : 'Start for your shop'} <ArrowRight className="inline size-4" />
            </button>
            <a
              href="#features"
              className="min-h-12 inline-flex items-center justify-center rounded-full border border-slate-200/90 bg-white/80 px-7 text-sm font-semibold text-slate-800 shadow-xs backdrop-blur-sm hover:bg-white active:scale-95 transition-all"
            >
              Explore features
            </a>
          </div>
          <div className="mt-8 flex justify-center gap-5 text-xs font-medium text-slate-600">
            <span><Check className="mr-1 inline size-3.5 text-[#1769FF]" />Offline-first</span>
            <span><Check className="mr-1 inline size-3.5 text-[#1769FF]" />No setup fee</span>
            <span><Check className="mr-1 inline size-3.5 text-[#1769FF]" />Made for India</span>
          </div>
          <div className="relative mx-auto mt-14 max-w-5xl">
            <div className="flex h-[440px] justify-center overflow-hidden rounded-[28px] border border-slate-200/80 bg-slate-50/80 p-3 shadow-[0_24px_70px_rgba(15,23,42,0.12)] backdrop-blur-sm sm:h-[560px]">
              <img
                src="/dailybook-ui-screenshot.png"
                alt="Actual My Mobile Shop day book screen"
                className="h-full w-auto rounded-2xl border border-slate-200/80 object-cover object-top shadow-md"
              />
            </div>
            <div className="absolute -bottom-6 left-4 rounded-2xl border border-slate-200/90 bg-white/95 p-3 text-left shadow-xl backdrop-blur-md sm:left-10 sm:p-4">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Always ready</p>
              <p className="mt-1 text-xs font-bold text-slate-900">
                <WifiOff className="mr-1.5 inline size-3.5 text-[#1769FF]" />Works offline at the counter
              </p>
            </div>
          </div>
        </section>
      <section id="features" className="border-y border-slate-200 bg-slate-50/70 py-20 sm:py-24"><div className="mx-auto max-w-6xl px-5 sm:px-8"><p className="text-xs font-bold uppercase tracking-[.14em] text-[#1769FF]">One counter. One clear system.</p><h2 className="mt-3 max-w-2xl text-3xl font-bold tracking-[-.05em] sm:text-5xl">The essentials, designed around your day.</h2><div className="mt-10 grid gap-5 md:grid-cols-3"><Feature label="Daily book" title="Know today’s cash and UPI at a glance." text="Capture income and expenses in seconds, then close the day with a number you can trust." /><Feature label="Repairs" title="Every device has a clear record." text="Keep job cards, estimates, receipts and customer updates together." /><Feature label="Used phones" title="Buy with a better paper trail." text="Keep KYC and IMEI details organised as your stock moves." /></div></div></section>
      <section id="workflow" className="mx-auto max-w-6xl px-5 py-20 sm:px-8 sm:py-24"><div className="grid gap-12 lg:grid-cols-2"><div><p className="text-xs font-bold uppercase tracking-[.14em] text-[#1769FF]">A simpler daily rhythm</p><h2 className="mt-3 text-3xl font-bold tracking-[-.05em] sm:text-5xl">From opening balance to shutter down.</h2><p className="mt-5 max-w-md text-base leading-7 text-slate-600">No extra process to learn. MMS follows the work already happening at your counter.</p></div><div className="divide-y divide-slate-200 border-y border-slate-200">{[['01','Open with clarity','Start with your opening balance and yesterday’s records within reach.'],['02','Record as you serve','Log a payment, repair intake or stock movement without breaking the conversation.'],['03','Close with confidence','Review cash, UPI and activity before you lock up for the night.']].map(([n,t,d]) => <div className="flex gap-5 py-7" key={n}><span className="text-xs font-bold text-[#1769FF]">{n}</span><div><span className="mb-3 flex size-9 items-center justify-center rounded-xl bg-[#1769FF]/10 text-[#1769FF]"><ShieldCheck className="size-4" /></span><h3 className="text-lg font-bold">{t}</h3><p className="mt-2 text-sm leading-6 text-slate-600">{d}</p></div></div>)}</div></div></section>
      <section id="pricing" className="border-t border-slate-200/80 bg-white py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <p className="inline-flex items-center gap-1.5 rounded-full border border-sky-300/60 bg-sky-50 px-3.5 py-1 text-xs font-bold uppercase tracking-wider text-[#1769FF]">
              Simple pricing
            </p>
            <h2 className="mt-3.5 text-3xl font-bold tracking-[-0.04em] text-slate-950 sm:text-5xl">
              Simple plans. Clear value.
            </h2>
            <p className="mt-3.5 text-base sm:text-lg text-slate-600">
              No commission on your sales and no confusing setup fee.
            </p>

            {/* Regional Country Selector */}
            <div className="mt-8 flex flex-wrap items-center justify-center gap-1.5 sm:gap-2">
              <span className="text-xs font-bold text-slate-500 mr-1 flex items-center gap-1">
                <Globe className="size-3.5 text-[#1769FF]" /> Region:
              </span>
              {SUPPORTED_COUNTRIES.map((code) => {
                const country = PRICING_CONFIG[code];
                const isSelected = selectedCountry === code;
                return (
                  <button
                    key={code}
                    type="button"
                    onClick={() => handleSelectCountry(code)}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all ${
                      isSelected
                        ? 'bg-[#1769FF] text-white shadow-sm ring-2 ring-[#1769FF]/20'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                    }`}
                    aria-pressed={isSelected}
                  >
                    <span>{code === 'US' ? 'Global · USD' : `${country.countryName.split(' ')[0]} · ${country.currencyCode}`}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 5 Pro Plans Grid */}
          <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 items-stretch">
            {(['monthly', 'yearly', 'two_year', 'three_year', 'lifetime'] as PlanId[]).map((planId) => {
              const countryConfig = PRICING_CONFIG[selectedCountry] || PRICING_CONFIG.IN;
              const plan = countryConfig.plans[planId];
              const savings = calculateSavings(planId, selectedCountry);

              const badge =
                plan.recommended ? 'Recommended' :
                plan.bestValue ? 'Best Value' :
                plan.isOneTime ? 'One-Time Payment' : undefined;

              const suffix =
                planId === 'monthly' ? '/ month' :
                planId === 'yearly' ? '/ year' :
                planId === 'two_year' ? '/ 2 years' :
                planId === 'three_year' ? '/ 3 years' : 'one-time';

              const durationLabel =
                planId === 'monthly' ? 'Billed monthly' :
                planId === 'yearly' ? 'Billed annually (12 months)' :
                planId === 'two_year' ? 'Billed every 2 years (24 months)' :
                planId === 'three_year' ? 'Billed every 3 years (36 months)' : 'One-time payment · Never expires';

              let savingsLabel: string | null = null;
              if (planId === 'monthly' && selectedCountry === 'IN') {
                savingsLabel = '₹249 / month · Flexible everyday counter access';
              } else if (planId === 'yearly' && selectedCountry === 'IN') {
                savingsLabel = '₹2,499 / year · Only ₹208/mo · Save ₹489 every year · 2 Months Free';
              } else if (savings && savings.savingsAmount > 0) {
                savingsLabel = `Only ${savings.formattedEffectiveMonthly} / month · Save ${savings.formattedSavings}`;
              } else if (plan.isOneTime) {
                savingsLabel = 'Permanent product-lifetime access';
              }

              const blurb =
                planId === 'monthly' ? 'Flexible access for your everyday counter.' :
                planId === 'yearly' ? 'Our best balance of flexibility and annual savings.' :
                planId === 'two_year' ? 'Extended 24-month peace of mind for your shop.' :
                planId === 'three_year' ? 'Maximum long-term value for established retailers.' :
                'Pay once, keep full access forever.';

              return (
                <Plan
                  key={planId}
                  name={plan.name}
                  price={formatPrice(plan.price, selectedCountry)}
                  suffix={suffix}
                  durationLabel={durationLabel}
                  savingsLabel={savingsLabel}
                  text={blurb}
                  badge={badge}
                  featured={plan.recommended || plan.bestValue}
                  onClick={start}
                />
              );
            })}
          </div>
        </div>
      </section>
      <section id="faq" className="mx-auto max-w-4xl px-5 py-20 sm:px-8 sm:py-24"><div className="text-center"><p className="text-xs font-bold uppercase tracking-[.14em] text-[#1769FF]">FAQ</p><h2 className="mt-3 text-3xl font-bold tracking-[-.05em] sm:text-5xl">Questions before you start.</h2></div><div className="mt-10 divide-y divide-slate-200 border-y border-slate-200">{faqs.map(([q,a],i) => <div key={q}><button onClick={() => setFaq(faq === i ? null : i)} className="flex w-full justify-between gap-4 py-5 text-left text-sm font-semibold" aria-expanded={faq === i}>{q}<ChevronDown className={`size-5 text-[#1769FF] ${faq === i ? 'rotate-180' : ''}`} /></button>{faq === i && <p className="pb-5 text-sm leading-6 text-slate-600">{a}</p>}</div>)}</div></section>
      <section className="px-5 pb-20 sm:px-8"><div className="mx-auto max-w-6xl rounded-[28px] bg-[#1769FF] px-6 py-14 text-center text-white sm:px-12"><h2 className="text-3xl font-bold tracking-[-.05em] sm:text-5xl">Your counter deserves a clearer view.</h2><button onClick={start} className="mt-7 rounded-full bg-white px-7 py-3 text-sm font-bold text-[#101828]">Get started <ArrowRight className="inline size-4" /></button></div></section>
    </main>
    <footer className="border-t border-slate-200 px-5 py-10 sm:px-8">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-5 text-xs text-slate-500">
        <span className="font-bold text-[#101828]">My Mobile Shop</span>
        <div className="flex flex-wrap items-center gap-5">
          <Link to="/partner" className="hover:text-slate-900 transition-colors">
            Partner program
          </Link>
          <Link to="/privacy" className="hover:text-slate-900 transition-colors">
            Privacy Policy
          </Link>
          <Link to="/terms" className="hover:text-slate-900 transition-colors">
            Terms of Service
          </Link>
          <a
            href="mailto:support@mymobileshop.online"
            className="hover:text-slate-900 transition-colors flex items-center gap-1"
          >
            <Mail className="inline size-3.5" /> Support
          </a>
        </div>
        <span>© {new Date().getFullYear()} My Mobile Shop</span>
      </div>
    </footer>
    {legal && (
      <LegalModal isOpen={!!legal} onClose={() => setLegal(null)} initialTab={legal || 'privacy'} />
    )}
  </div>
  );
};
function Feature({ label, title, text }: { label: string; title: string; text: string }) { return <article className="rounded-[24px] border border-slate-200 bg-white p-6 sm:p-8"><span className="text-xs font-bold uppercase tracking-[.12em] text-[#1769FF]">{label}</span><h3 className="mt-3 text-xl font-bold tracking-[-.04em]">{title}</h3><p className="mt-3 text-sm leading-6 text-slate-600">{text}</p></article>; }

function Plan({
  name,
  price,
  suffix,
  durationLabel,
  savingsLabel,
  text,
  badge,
  featured,
  onClick,
}: {
  name: string;
  price: string;
  suffix: string;
  durationLabel: string;
  savingsLabel?: string | null;
  text: string;
  badge?: string;
  featured?: boolean;
  onClick: () => void;
}) {
  const features = [
    'Unlimited day book entries',
    'Repair job cards & receipts',
    'Offline-first counter workflow',
    'Stock records & inventory',
  ];

  return (
    <article
      className={`relative flex flex-col justify-between rounded-[24px] p-6 shadow-xs transition-all ${
        featured
          ? 'border-2 border-[#1769FF] bg-gradient-to-b from-sky-50/50 via-white to-white shadow-md shadow-sky-500/10'
          : 'border border-slate-200/90 bg-white hover:border-slate-300 hover:shadow-md'
      }`}
    >
      {badge && (
        <div className="absolute -top-3 right-4">
          <span
            className={`rounded-full px-3 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-white shadow-xs ${
              badge === 'Best Value'
                ? 'bg-gradient-to-r from-amber-500 to-orange-500'
                : badge === 'One-Time Payment'
                ? 'bg-gradient-to-r from-purple-600 to-indigo-600'
                : 'bg-[#1769FF]'
            }`}
          >
            {badge}
          </span>
        </div>
      )}

      <div>
        <div>
          <h3 className="text-lg font-bold text-slate-900">{name}</h3>
          <p className="mt-1 text-xs text-slate-500 min-h-[32px]">{text}</p>
        </div>

        <div className="mt-5 flex items-baseline gap-1">
          <span className="text-3xl font-extrabold tracking-tight text-slate-950">{price}</span>
          <span className="text-xs font-semibold text-slate-500">{suffix}</span>
        </div>

        <p className="mt-1 text-[11px] font-medium text-slate-400">{durationLabel}</p>

        {savingsLabel ? (
          <p className="mt-2 text-[11px] font-semibold text-[#1769FF] leading-snug">
            {savingsLabel}
          </p>
        ) : (
          <div className="mt-2 h-[18px]" />
        )}

        <ul className="mt-6 space-y-2.5 border-t border-slate-100 pt-5 text-xs text-slate-700">
          {features.map((feature) => (
            <li key={feature} className="flex items-center gap-2.5">
              <div
                className={`flex size-4 shrink-0 items-center justify-center rounded-full ${
                  featured ? 'bg-[#1769FF] text-white' : 'bg-sky-50 text-[#1769FF]'
                }`}
              >
                <Check className="size-2.5 stroke-[2.5]" />
              </div>
              <span className="font-medium text-slate-800">{feature}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-6 pt-2">
        <button
          onClick={onClick}
          className={`min-h-11 w-full rounded-full px-4 text-xs font-bold transition-all active:scale-95 ${
            featured
              ? 'bg-[#1769FF] hover:bg-[#1258d9] text-white shadow-md shadow-[#1769FF]/20'
              : 'border border-slate-300 bg-white text-slate-800 hover:border-slate-400 hover:bg-slate-50'
          }`}
        >
          Choose {name.replace(' Pro', '')}
        </button>
      </div>
    </article>
  );
}
