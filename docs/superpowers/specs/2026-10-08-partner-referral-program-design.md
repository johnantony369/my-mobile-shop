# Design Specification: Partner Referral & Distribution Subsystem

**Date:** 2026-10-08  
**Status:** Approved for Implementation  
**Target:** Distribution via Wholesale Partners, Dedicated `/partner` Portal, Standee QR Generator, CSV Lead Import (Partner & Admin), Attribution Lifecycle, and Super Admin UPI Payout Settlement with Bank UTR Tracking.

---

## 1. Overview & Objectives

Local wholesale markets (spare parts dealers, accessory distributors, tool vendors) possess established daily counter relationships with retail mobile shop owners. The Partner Referral Program turns these distributors into an active sales channel:

1. **Brand Identity & Terminology:** Exclusively use the term **Partner** (Partner Portal, Partner Program, Partner Code).
2. **Fixed Commission Payout Structure:**
   * **Monthly Plan (₹249):** **₹75 flat commission** per paid conversion.
   * **Yearly Plan (₹2,499):** **₹499 flat commission** per paid conversion.
3. **Retailer Incentive (Win-Win):**
   * Retailers scanning a Partner QR or entering a Partner code receive an **Extended 7-Day Pro Trial** (standard public trial is 3 days).
4. **CSV Lead Import Capability (Partners & Super Admin):**
   * Partners can upload a CSV of their existing retail customer contacts (Shop Name, Phone Number, City) directly from `/partner`.
   * Super Admin can also upload a CSV of leads in `/admin` and select the target Partner for attribution.
   * Pre-attributes leads so when a retailer signs up with their matching mobile number, the attribution is automatically bound.
5. **Distributor / Partner Experience (`/partner`):**
   * Fast self-serve onboarding with neutral input placeholders.
   * Instant printable counter standee QR code & 1-tap WhatsApp sharing.
   * Live real-time KPIs, referred shops ledger, and CSV lead importer.
   * **Real Data Only:** Zero mock data; clear, friendly empty states when no leads or settlements exist.
6. **Admin Settlement Flow (`/admin`):**
   * Dedicated "Partners & Payouts" management tab.
   * Partner verification and status toggle.
   * Manual UPI payout queue with 1-tap UPI ID copy and Bank UTR / Reference ID verification.

---

## 2. Architecture & Routing

### 2.1 Route Definitions (`src/AppRouter.tsx`)
* `/partner`: Entry point for partners.
  * If unauthenticated: Displays the Partner Join / Sign In screen.
  * If authenticated as a partner: Displays the Partner Dashboard.
* `/partner/login`: Dedicated login sub-route if navigating directly.
* Lazy loaded via `React.lazy(() => import('./screens/partner/PartnerPortalScreen'))` to keep the main mobile counter bundle lean and fast.

### 2.2 Navigation Integration
* In `LandingPage.tsx`: Minimalist footer link: "Become a Partner" linking to `/partner`.
* In `AdminScreen.tsx`: Top tab toggle `[ Shops Directory | Partners & Payouts ]`.

---

## 3. Data Models & Firestore Schema

### 3.1 `partners` Collection (`/partners/{partnerUid}`)
```typescript
export type PartnerStatus = 'pending_verification' | 'active' | 'suspended';

export interface PartnerStats {
  totalLeads: number;          // Total retail shops attributed (QR + CSV)
  activeTrials: number;        // Shops currently in 7-day trial
  paidConversions: number;     // Shops that bought Monthly or Yearly Pro
  lifetimeEarnings: number;    // Cumulative ₹ earned
  paidEarnings: number;        // Cumulative ₹ settled via UPI
  pendingBalance: number;      // ₹ awaiting admin payout
}

export interface PartnerProfile {
  uid: string;
  fullName: string;            // Contact person name
  businessName: string;        // Shop or wholesale firm name
  marketCity: string;          // Market/city location
  phoneNumber: string;         // 10-digit mobile number
  upiId: string;               // e.g. mobile@upi, name@okaxis
  referralCode: string;        // Unique uppercase code (e.g. METRO99)
  status: PartnerStatus;       // Default: 'pending_verification'
  stats: PartnerStats;
  createdAt: string;           // ISO timestamp
  updatedAt: string;           // ISO timestamp
}
```

### 3.2 `referral_leads` Collection (`/referral_leads/{leadId}`)
```typescript
export type ReferralLeadStatus = 'trial' | 'pro_active' | 'expired';
export type LeadSource = 'qr_link' | 'csv_import' | 'manual_code';
export type LeadPayoutStatus = 'unpaid' | 'paid';

export interface ReferralLead {
  id: string;                  // `${partnerUid}_${phone_or_shopUid}`
  partnerUid: string;
  referralCode: string;
  referredShopUid?: string | null; // Set when account registers/claims
  shopName: string;
  ownerPhone: string;          // 10-digit phone number (used for CSV matching)
  source: LeadSource;
  status: ReferralLeadStatus;
  planPurchased: 'monthly' | 'yearly' | null;
  commissionEarned: number;    // 75 for monthly, 499 for yearly, 0 while trial
  payoutStatus: LeadPayoutStatus;
  payoutId?: string | null;    // ID of payout batch once settled
  registeredAt: string;        // ISO timestamp
  convertedAt?: string | null; // ISO timestamp
}
```

### 3.3 `payouts` Collection (`/payouts/{payoutId}`)
```typescript
export interface PartnerPayout {
  id: string;
  partnerUid: string;
  partnerBusinessName: string;
  partnerUpiId: string;
  amount: number;              // In ₹
  utrReference: string;        // Bank 12-digit UPI UTR number
  notes?: string | null;
  processedByUid: string;      // Admin UID
  processedAt: string;         // ISO timestamp
}
```

### 3.4 Retail Account Attribution Updates (`/accounts/{shopUid}`)
```typescript
// Additions to ShopAccountSummary in src/firebase/admin.ts:
referredByPartnerUid?: string | null;
referredByCode?: string | null;
referralTrialGranted?: boolean; // True if extended 7-day trial was awarded
```

---

## 4. Attribution & Conversion Lifecycle

### 4.1 URL Sniffing & Storage (`useReferralCapture.ts`)
* When any visitor lands on `/`, `/login`, or `/app` with query params `?ref=CODE` or `?partner=CODE`:
  1. Sniffs the query parameter and sanitizes it (trims and converts to uppercase).
  2. Saves to `localStorage.setItem('mms_partner_code', code)` and `localStorage.setItem('mms_partner_code_time', Date.now())`.
  3. Attribution window: 30 days validity.

### 4.2 CSV Lead Pre-Attribution Workflow
* **Partner & Admin CSV Import**:
  1. Accepts CSV with headers: `Shop Name`, `Phone Number`, `City` (optional).
  2. Cleans & normalizes 10-digit mobile numbers (stripping +91, 0, spaces, dashes).
  3. Pre-creates `referral_leads` records with `source = 'csv_import'` and `status = 'trial'`.
  4. Automatically updates `partner.stats.totalLeads`.
* **Automatic Phone Match on Signup**:
  * When a retailer registers with phone number or enters it in Settings/Onboarding:
  * The system checks `referral_leads` for any existing lead matching that phone number.
  * If a pre-imported lead exists: Automatically binds `referredShopUid = user.uid`, grants the **Extended 7-Day Pro Trial**, and links the shop to the partner.

### 4.3 Shop Onboarding & Linking (`OnboardingScreen.tsx` / `LoginScreen.tsx`)
* During shop registration / onboarding:
  1. Checks `localStorage` for `mms_partner_code` OR matching pre-imported phone OR optional input field *"Have a partner referral code?"*.
  2. If present: Queries Firestore `partners` collection where `referralCode == code` and `status != 'suspended'`.
  3. If partner found and `partner.phoneNumber !== shopOwner.phoneNumber`:
     - Sets `referredByPartnerUid = partner.uid`.
     - Sets `referredByCode = partner.referralCode`.
     - Sets initial trial days to **7 days** (extended from standard 3 days).
     - Creates/updates `/referral_leads/{partnerUid}_{shopUid}` with status `'trial'`.
     - Increments `partner.stats.totalLeads` (if not already from CSV) and `partner.stats.activeTrials`.
     - Clears `mms_partner_code` from `localStorage`.

### 4.4 Pro Plan Upgrade Trigger
* When a shop account is upgraded to Pro (via `/admin` plan dialog or payment checkout):
  1. System checks if `accounts/{uid}.referredByPartnerUid` is populated.
  2. If yes:
     - Fetches `/referral_leads/{partnerUid}_{shopUid}`.
     - Calculates commission:
       * If plan is `'monthly'` $\rightarrow$ **₹75**
       * If plan is `'yearly'` $\rightarrow$ **₹499**
     - Updates `referral_leads`:
       * `status = 'pro_active'`
       * `planPurchased = plan`
       * `commissionEarned = commission`
       * `convertedAt = new Date().toISOString()`
     - Updates `partners/{partnerUid}`:
       * `stats.paidConversions += 1`
       * `stats.activeTrials = Math.max(0, stats.activeTrials - 1)`
       * `stats.lifetimeEarnings += commission`
       * `stats.pendingBalance += commission`

---

## 5. Partner Portal UI Specification (`src/screens/partner/`)

### 5.1 Join & Login View
* **Segmented switch:** `[ Sign In | Join Partner Program ]`
* **Form Inputs with Neutral Placeholders:**
  * Full Name: placeholder *"Enter your full name"*
  * Business Name: placeholder *"Enter business / shop name"*
  * Market / City: placeholder *"Enter wholesale market or city"*
  * Mobile Phone: placeholder *"Enter 10-digit mobile number"*
  * UPI ID: placeholder *"Enter UPI ID (e.g. mobile@upi)"*
  * Referral Code: placeholder *"Choose 4–8 uppercase characters (e.g. METRO99)"*
  * Password: placeholder *"Create secure password"*
* **Commission Guarantee Callout:**
  * Card highlighting: *"Earn ₹75 on every Monthly shop & ₹499 on every Yearly shop you refer."*

### 5.2 Partner Dashboard
* **Header Bar:**
  * Partner Business Name & Location.
  * Status Badge: `Verified Partner` (Green) or `Pending Verification` (Amber).
  * Sign Out button.
* **Counter Standee Card:**
  * Clean vector QR Code pointing to `https://mymobileshop.online/?ref=YOURCODE`.
  * Display of Partner Code in bold mono pill.
  * **1-Tap WhatsApp Share:** Fires pre-formatted WhatsApp message with direct link.
  * **1-Tap Print Standee:** Renders a clean printable A5 counter card layout.
* **CSV Lead Importer Card / Button:**
  * Button: **"Import Leads via CSV"** with modal allowing upload of `.csv` file.
  * Download sample CSV template (`Shop Name, Phone Number, City`).
  * Instant feedback: *"Imported 45 leads successfully"*.
* **Real-time KPI Metric Cards (No Mock Data):**
  * `Total Shops`: `stats.totalLeads`
  * `Active 7-Day Trials`: `stats.activeTrials`
  * `Paid Pro Conversions`: `stats.paidConversions`
  * `Pending Payout Balance`: `₹stats.pendingBalance` (highlighted)
  * `Total Settled`: `₹stats.paidEarnings`
* **Referred Shops Ledger:**
  * Real-time list of shops from `referral_leads`.
  * Row columns: Shop Name, Phone Number, Date Joined / Imported, Source (`QR Link` / `CSV Import`), Status (`Trial Active` / `Monthly (+₹75)` / `Yearly (+₹499)`), Settlement Status (`Pending Settlement` / `Paid`).
  * Empty State: *"No shops joined yet. Share your counter QR code or import a customer CSV to start earning."*
* **Payout Settlements History:**
  * Real-time list from `payouts` where `partnerUid == currentUid`.
  * Row columns: Date, Amount (₹), UPI ID, Bank UTR Reference.
  * Empty State: *"No payouts processed yet. Earnings will appear here once settled by admin."*

---

## 6. Super Admin Management (`src/screens/AdminScreen.tsx`)

### 6.1 Top Tab Navigation
* `[ 📱 Shop Directory | 🤝 Partners & Payouts ]`

### 6.2 Partners & Payouts View
1. **Pending Settlements Queue:**
   * Filter of all partners with `pendingBalance > 0`.
   * Card for each pending payout displaying:
     * Partner Business Name, Contact Person & Phone Number.
     * Registered UPI ID with a 1-tap **Copy UPI ID** button.
     * Pending Amount in bold green.
     * Action Button: **"Settle Payout"**.
2. **Settle Payout Modal:**
   * Step 1: Displays total amount to transfer and target UPI ID.
   * Step 2: Input field *"Bank UTR / UPI Reference ID"* (placeholder: *"Enter 12-digit UPI UTR number"*).
   * Step 3: Optional notes input.
   * Step 4: Click *"Mark as Paid"*.
   * **Result:** Creates record in `payouts`, marks attributed leads as `paid`, sets `partner.pendingBalance = 0`, and increases `partner.paidEarnings += amount`.
3. **Partner Directory Table:**
   * Lists all registered partners.
   * Toggle button to change status between `Active`, `Pending`, and `Suspended`.
   * **Admin CSV Lead Import:** Admin can upload a CSV and assign it to any selected partner.
   * View full lead history for any partner.

---

## 7. Security Rules & Integrity

### 7.1 Firestore Security Rules (`firestore.rules`)
```javascript
// partners collection
match /partners/{partnerId} {
  allow read: if request.auth != null && (request.auth.uid == partnerId || isSuperAdmin(request.auth.uid));
  allow create: if request.auth != null && request.auth.uid == partnerId;
  allow update: if request.auth != null && (
    (request.auth.uid == partnerId && !request.resource.data.diff(resource.data).affectedKeys().hasAny(['status', 'stats'])) ||
    isSuperAdmin(request.auth.uid)
  );
  allow delete: if request.auth != null && isSuperAdmin(request.auth.uid);
}

// referral_leads collection
match /referral_leads/{leadId} {
  allow read: if request.auth != null && (resource.data.partnerUid == request.auth.uid || isSuperAdmin(request.auth.uid));
  allow create: if request.auth != null;
  allow update, delete: if request.auth != null && isSuperAdmin(request.auth.uid);
}

// payouts collection
match /payouts/{payoutId} {
  allow read: if request.auth != null && (resource.data.partnerUid == request.auth.uid || isSuperAdmin(request.auth.uid));
  allow create, update, delete: if request.auth != null && isSuperAdmin(request.auth.uid);
}
```

### 7.2 Anti-Fraud & Self-Referral Prevention
* Self-referral validation: Blocks attribution if `shopOwner.phoneNumber === partner.phoneNumber` or `shopOwner.uid === partner.uid`.
* One-time attribution lock: Once `referredByPartnerUid` is written to an account, it cannot be overridden.

---

## 8. Automated Testing Strategy

1. **`tests/referralAttribution.test.ts`**:
   * Validates query parameter capture (`?ref=CODE`), sanitization, and 30-day expiration in `localStorage`.
   * Tests self-referral rejection when partner and shop share credentials.
   * Tests CSV pre-attribution phone matching logic.
2. **`tests/partnerCommissions.test.ts`**:
   * Validates exact fixed commission calculations:
     * ₹75 on Monthly plan (₹249)
     * ₹499 on Yearly plan (₹2,499)
     * ₹0 on Free trial
   * Verifies stats update math (pending balance, lifetime earnings).
3. **`tests/partnerSettlement.test.ts`**:
   * Simulates Admin recording UPI UTR reference.
   * Verifies pending balance reset to 0 and `paidEarnings` increment.
   * Validates lead status transition from `unpaid` to `paid`.
4. **`tests/partnerCsvImport.test.ts`**:
   * Tests CSV parsing, header validation, 10-digit phone normalization, and bulk lead creation.
