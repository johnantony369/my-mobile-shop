import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  query,
  where,
  writeBatch,
  increment,
} from 'firebase/firestore';
import { dbFirestore } from './config';
import {
  PartnerProfile,
  ReferralLead,
  PartnerPayout,
  LeadSource,
} from '../types/partner';
import { calculatePartnerCommission, normalizePhoneNumber } from '../utils/partner';

export const calculateLeadEarning = calculatePartnerCommission;

export function shouldPreventSelfReferral(
  partnerUid: string,
  partnerPhone: string,
  shopUid: string,
  shopPhone: string
): boolean {
  if (partnerUid && shopUid && partnerUid === shopUid) return true;
  const pNorm = normalizePhoneNumber(partnerPhone);
  const sNorm = normalizePhoneNumber(shopPhone);
  if (pNorm && sNorm && pNorm === sNorm) return true;
  return false;
}

export async function fetchPartnerByReferralCode(code: string): Promise<PartnerProfile | null> {
  if (!dbFirestore || !code) return null;
  const cleanCode = code.trim().toUpperCase();
  const q = query(
    collection(dbFirestore, 'partners'),
    where('referralCode', '==', cleanCode),
    where('status', '!=', 'suspended')
  );
  const snap = await getDocs(q);
  if (snap.empty) return null;
  return snap.docs[0].data() as PartnerProfile;
}

export async function fetchPartnerProfile(partnerUid: string): Promise<PartnerProfile | null> {
  if (!dbFirestore || !partnerUid) return null;
  const docRef = doc(dbFirestore, 'partners', partnerUid);
  const snap = await getDoc(docRef);
  if (!snap.exists()) return null;
  return snap.data() as PartnerProfile;
}

export async function registerPartner(
  profileData: Omit<PartnerProfile, 'stats' | 'status' | 'createdAt' | 'updatedAt'>
): Promise<PartnerProfile> {
  if (!dbFirestore) throw new Error('Firestore not initialized');
  const existingCode = await fetchPartnerByReferralCode(profileData.referralCode);
  if (existingCode && existingCode.uid !== profileData.uid) {
    throw new Error('This referral code is already taken. Please choose another.');
  }

  const now = new Date().toISOString();
  const profile: PartnerProfile = {
    ...profileData,
    status: 'pending_verification',
    stats: {
      totalLeads: 0,
      activeTrials: 0,
      paidConversions: 0,
      lifetimeEarnings: 0,
      paidEarnings: 0,
      pendingBalance: 0,
    },
    createdAt: now,
    updatedAt: now,
  };

  await setDoc(doc(dbFirestore, 'partners', profile.uid), profile);
  return profile;
}

export async function fetchPartnerLeads(partnerUid: string): Promise<ReferralLead[]> {
  if (!dbFirestore || !partnerUid) return [];
  const q = query(collection(dbFirestore, 'referral_leads'), where('partnerUid', '==', partnerUid));
  const snap = await getDocs(q);
  return snap.docs
    .map(d => d.data() as ReferralLead)
    .sort((a, b) => b.registeredAt.localeCompare(a.registeredAt));
}

export async function fetchPartnerPayouts(partnerUid: string): Promise<PartnerPayout[]> {
  if (!dbFirestore || !partnerUid) return [];
  const q = query(collection(dbFirestore, 'payouts'), where('partnerUid', '==', partnerUid));
  const snap = await getDocs(q);
  return snap.docs
    .map(d => d.data() as PartnerPayout)
    .sort((a, b) => b.processedAt.localeCompare(a.processedAt));
}

export async function importLeadsBatch(
  partnerUid: string,
  referralCode: string,
  leads: Array<{ shopName: string; phone: string; city?: string }>,
  source: LeadSource = 'csv_import'
): Promise<{ createdCount: number }> {
  if (!dbFirestore || !partnerUid || leads.length === 0) return { createdCount: 0 };
  const batch = writeBatch(dbFirestore);
  const now = new Date().toISOString();
  let createdCount = 0;

  for (const item of leads) {
    const leadId = `${partnerUid}_${item.phone}`;
    const leadRef = doc(dbFirestore, 'referral_leads', leadId);
    const newLead: ReferralLead = {
      id: leadId,
      partnerUid,
      referralCode,
      shopName: item.shopName,
      ownerPhone: item.phone,
      city: item.city || null,
      source,
      status: 'contacted',
      planPurchased: null,
      commissionEarned: 0,
      registeredAt: now,
      updatedAt: now,
    };
    batch.set(leadRef, newLead, { merge: true });
    createdCount++;
  }

  // Increment total leads on partner
  const partnerRef = doc(dbFirestore, 'partners', partnerUid);
  batch.update(partnerRef, {
    'stats.totalLeads': increment(createdCount),
    updatedAt: now,
  });

  await batch.commit();
  return { createdCount };
}

export async function bindLeadToAccount(
  shopUid: string,
  shopName: string,
  rawPhone: string,
  manualCode?: string
): Promise<{ partnerUid: string | null; trialDays: number }> {
  if (!dbFirestore || !shopUid) return { partnerUid: null, trialDays: 3 };

  let partner: PartnerProfile | null = null;
  const phone = normalizePhoneNumber(rawPhone) || rawPhone;

  // 1. Try manual code or URL captured code
  if (manualCode) {
    partner = await fetchPartnerByReferralCode(manualCode);
  }

  // 2. Fallback: check if pre-imported via CSV by phone
  if (!partner && phone) {
    const q = query(
      collection(dbFirestore, 'referral_leads'),
      where('ownerPhone', '==', phone),
      where('status', '==', 'contacted')
    );
    const snap = await getDocs(q);
    if (!snap.empty) {
      const existingLead = snap.docs[0].data() as ReferralLead;
      partner = await fetchPartnerProfile(existingLead.partnerUid);
    }
  }

  if (!partner || shouldPreventSelfReferral(partner.uid, partner.phoneNumber, shopUid, phone)) {
    return { partnerUid: null, trialDays: 3 };
  }

  const now = new Date().toISOString();
  const leadId = `${partner.uid}_${phone || shopUid}`;
  const leadRef = doc(dbFirestore, 'referral_leads', leadId);

  await setDoc(leadRef, {
    id: leadId,
    partnerUid: partner.uid,
    referralCode: partner.referralCode,
    referredShopUid: shopUid,
    shopName,
    ownerPhone: phone,
    source: manualCode ? 'manual_code' : 'qr_link',
    status: 'in_trial',
    planPurchased: null,
    commissionEarned: 0,
    registeredAt: now,
    updatedAt: now,
  }, { merge: true });

  // Update partner stats
  await updateDoc(doc(dbFirestore, 'partners', partner.uid), {
    'stats.activeTrials': increment(1),
    updatedAt: now,
  });

  // Stamp account
  await setDoc(doc(dbFirestore, 'accounts', shopUid), {
    referredByPartnerUid: partner.uid,
    referredByCode: partner.referralCode,
    referralTrialGranted: true,
    updatedAt: now,
  }, { merge: true });

  return { partnerUid: partner.uid, trialDays: 7 };
}

export async function recordPlanConversion(
  shopUid: string,
  plan: 'monthly' | 'yearly'
): Promise<void> {
  if (!dbFirestore || !shopUid) return;
  const accountSnap = await getDoc(doc(dbFirestore, 'accounts', shopUid));
  if (!accountSnap.exists()) return;
  const accountData = accountSnap.data();
  const partnerUid = accountData?.referredByPartnerUid;
  if (!partnerUid) return;

  const commission = calculatePartnerCommission(plan);
  const now = new Date().toISOString();

  // Find corresponding lead
  const q = query(
    collection(dbFirestore, 'referral_leads'),
    where('partnerUid', '==', partnerUid),
    where('referredShopUid', '==', shopUid)
  );
  const snap = await getDocs(q);
  if (snap.empty) return;

  const leadDoc = snap.docs[0];
  const leadData = leadDoc.data() as ReferralLead;
  if (leadData.status === 'plan_purchased' || leadData.status === 'paid') {
    return; // Already converted
  }

  const batch = writeBatch(dbFirestore);
  batch.update(leadDoc.ref, {
    status: 'plan_purchased',
    planPurchased: plan,
    commissionEarned: commission,
    convertedAt: now,
    updatedAt: now,
  });

  const partnerRef = doc(dbFirestore, 'partners', partnerUid);
  batch.update(partnerRef, {
    'stats.paidConversions': increment(1),
    'stats.activeTrials': increment(-1),
    'stats.lifetimeEarnings': increment(commission),
    'stats.pendingBalance': increment(commission),
    updatedAt: now,
  });

  await batch.commit();
}
