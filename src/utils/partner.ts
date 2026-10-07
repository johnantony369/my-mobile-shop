import { ReferralLeadStatus } from '../types/partner';

export function calculatePartnerCommission(plan: 'monthly' | 'yearly' | null | undefined): number {
  if (plan === 'monthly') return 75;
  if (plan === 'yearly') return 499;
  return 0;
}

export function normalizePhoneNumber(raw: string): string | null {
  if (!raw) return null;
  let digits = raw.replace(/\D/g, '');
  if (digits.startsWith('91') && digits.length === 12) {
    digits = digits.slice(2);
  } else if (digits.startsWith('0') && digits.length === 11) {
    digits = digits.slice(1);
  }
  return digits.length === 10 ? digits : null;
}

export function parseLeadsCsv(csvContent: string): {
  leads: Array<{ shopName: string; phone: string; city?: string }>;
  errors: string[];
} {
  const lines = csvContent.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  if (lines.length <= 1) {
    return { leads: [], errors: ['CSV contains no data rows.'] };
  }

  const shopNameIdx = 0;
  const phoneIdx = 1;
  const cityIdx = 2;

  const leads: Array<{ shopName: string; phone: string; city?: string }> = [];
  const errors: string[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',').map(c => c.trim().replace(/^["']|["']$/g, ''));
    const shopName = cols[shopNameIdx] || `Shop ${i}`;
    const rawPhone = cols[phoneIdx] || '';
    const city = cols[cityIdx] || undefined;

    const normalizedPhone = normalizePhoneNumber(rawPhone);
    if (!normalizedPhone) {
      errors.push(`Row ${i + 1}: Invalid phone number "${rawPhone}"`);
      continue;
    }

    leads.push({
      shopName,
      phone: normalizedPhone,
      city,
    });
  }

  return { leads, errors };
}

export function formatCurrencyINR(amount: number): string {
  return `₹${amount.toLocaleString('en-IN')}`;
}

export const CRM_STATUS_LABELS: Record<ReferralLeadStatus, { label: string; color: string }> = {
  contacted: { label: 'Contacted', color: 'bg-slate-100 text-slate-700 border-slate-200' },
  in_trial: { label: 'In Trial (7d)', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  not_interested: { label: 'Not Interested', color: 'bg-gray-100 text-gray-500 border-gray-200' },
  plan_purchased: { label: 'Plan Purchased', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  payout_in_progress: { label: 'Payout in Progress', color: 'bg-amber-50 text-amber-700 border-amber-200' },
  paid: { label: 'Paid', color: 'bg-purple-50 text-purple-700 border-purple-200' },
};
