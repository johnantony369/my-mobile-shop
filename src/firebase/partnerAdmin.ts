import {
  collection,
  doc,
  getDocs,
  updateDoc,
  writeBatch,
  increment,
} from 'firebase/firestore';
import { dbFirestore } from './config';
import {
  PartnerProfile,
  ReferralLead,
  PartnerPayout,
  PartnerStatus,
  ReferralLeadStatus,
} from '../types/partner';
import { calculatePartnerCommission } from '../utils/partner';

export async function fetchAllPartners(): Promise<PartnerProfile[]> {
  if (!dbFirestore) return [];
  const snap = await getDocs(collection(dbFirestore, 'partners'));
  return snap.docs
    .map(d => d.data() as PartnerProfile)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function setPartnerStatus(partnerUid: string, status: PartnerStatus): Promise<void> {
  if (!dbFirestore || !partnerUid) return;
  await updateDoc(doc(dbFirestore, 'partners', partnerUid), {
    status,
    updatedAt: new Date().toISOString(),
  });
}

export async function fetchLeadsForPartnerAdmin(partnerUid: string): Promise<ReferralLead[]> {
  if (!dbFirestore || !partnerUid) return [];
  const snap = await getDocs(collection(dbFirestore, 'referral_leads'));
  return snap.docs
    .map(d => d.data() as ReferralLead)
    .filter(lead => lead.partnerUid === partnerUid)
    .sort((a, b) => b.registeredAt.localeCompare(a.registeredAt));
}

export async function updateLeadStatus(
  leadId: string,
  newStatus: ReferralLeadStatus,
  details?: { plan?: 'monthly' | 'yearly'; notes?: string }
): Promise<void> {
  if (!dbFirestore || !leadId) return;
  const leadRef = doc(dbFirestore, 'referral_leads', leadId);
  const now = new Date().toISOString();

  const updates: Partial<ReferralLead> = {
    status: newStatus,
    updatedAt: now,
  };
  if (details?.notes !== undefined) updates.notes = details.notes;
  if (newStatus === 'plan_purchased' && details?.plan) {
    updates.planPurchased = details.plan;
    updates.commissionEarned = calculatePartnerCommission(details.plan);
    updates.convertedAt = now;
  }

  await updateDoc(leadRef, updates);
}

export async function executePartnerPayout(
  partner: PartnerProfile,
  amount: number,
  utrReference: string,
  leadIds: string[],
  adminUid: string,
  notes?: string
): Promise<PartnerPayout> {
  if (!dbFirestore) throw new Error('Firestore not initialized');
  const now = new Date().toISOString();
  const payoutId = `payout_${Date.now()}`;

  const payoutRecord: PartnerPayout = {
    id: payoutId,
    partnerUid: partner.uid,
    partnerBusinessName: partner.businessName,
    partnerUpiId: partner.upiId,
    amount,
    leadIds,
    utrReference,
    notes: notes || null,
    processedByUid: adminUid,
    processedAt: now,
  };

  const batch = writeBatch(dbFirestore);
  batch.set(doc(dbFirestore, 'payouts', payoutId), payoutRecord);

  // Update leads to paid
  for (const leadId of leadIds) {
    batch.update(doc(dbFirestore, 'referral_leads', leadId), {
      status: 'paid',
      payoutId,
      utrReference,
      updatedAt: now,
    });
  }

  // Update partner stats
  const partnerRef = doc(dbFirestore, 'partners', partner.uid);
  batch.update(partnerRef, {
    'stats.pendingBalance': increment(-amount),
    'stats.paidEarnings': increment(amount),
    updatedAt: now,
  });

  await batch.commit();
  return payoutRecord;
}
