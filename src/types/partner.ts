export type PartnerStatus = 'pending_verification' | 'active' | 'suspended';

export type ReferralLeadStatus =
  | 'contacted'
  | 'in_trial'
  | 'not_interested'
  | 'plan_purchased'
  | 'payout_in_progress'
  | 'paid';

export type LeadSource = 'qr_link' | 'csv_import' | 'manual_code';
export type LeadPayoutStatus = 'unpaid' | 'paid';

export interface PartnerStats {
  totalLeads: number;
  activeTrials: number;
  paidConversions: number;
  lifetimeEarnings: number;
  paidEarnings: number;
  pendingBalance: number;
}

export interface PartnerProfile {
  uid: string;
  fullName: string;
  businessName: string;
  marketCity: string;
  phoneNumber: string;
  upiId: string;
  referralCode: string;
  status: PartnerStatus;
  stats: PartnerStats;
  createdAt: string;
  updatedAt: string;
}

export interface ReferralLead {
  id: string;
  partnerUid: string;
  referralCode: string;
  referredShopUid?: string | null;
  shopName: string;
  ownerPhone: string;
  city?: string | null;
  source: LeadSource;
  status: ReferralLeadStatus;
  planPurchased: 'monthly' | 'yearly' | null;
  commissionEarned: number;
  payoutId?: string | null;
  utrReference?: string | null;
  notes?: string | null;
  registeredAt: string;
  convertedAt?: string | null;
  updatedAt: string;
}

export interface PartnerPayout {
  id: string;
  partnerUid: string;
  partnerBusinessName: string;
  partnerUpiId: string;
  amount: number;
  leadIds: string[];
  utrReference: string;
  notes?: string | null;
  processedByUid: string;
  processedAt: string;
}
