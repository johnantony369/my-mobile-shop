# Design Specification: Partner Referral & Distribution Subsystem

**Date:** 2026-10-08  
**Status:** Approved for Implementation  
**Target:** Distribution via Wholesale Partners, Dedicated `/partner` Portal, Standee QR Generator, CSV Lead Import (Partner & Admin), Lead Lifecycle CRM Statuses (`contacted`, `in_trial`, `not_interested`, `plan_purchased`, `payout_in_progress`, `paid`), and Super Admin UPI Payout Settlement with Bank UTR Tracking.

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
5. **Full Lead CRM Lifecycle Statuses (Managed by Super Admin & Tracked by Partners):**
   * Super Admin can manually update or auto-advance lead statuses:
     * `contacted`: Initial outreach done.
     * `in_trial`: Shop actively running 7-day extended trial.
     * `not_interested`: Shop declined or dropped off.
     * `plan_purchased`: Shop bought Monthly (+₹75) or Yearly (+₹499) Pro plan.
     * `payout_in_progress`: Settlement initiated / queued.
     * `paid`: Bank UPI transfer completed with UTR number.
6. **Distributor / Partner Experience (`/partner`):**
   * Fast self-serve onboarding with neutral input placeholders.
   * Instant printable counter standee QR code & 1-tap WhatsApp sharing.
   * Live real-time KPIs, referred shops ledger with CRM statuses, and CSV lead importer.
   * **Real Data Only:** Zero mock data; clear, friendly empty states when no leads or settlements exist.
7. **Admin Settlement Flow (`/admin`):**
   * Dedicated "Partners & Payouts" management tab.
   * Partner verification and status toggle.
   * Lead status updater dropdown for every lead.
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
export type ReferralLeadStatus =
  | 'contacted'
  | 'in_trial'
  | 'not_interested'
  | 'plan_purchased'
  | 'payout_in_progress'
  | 'paid';

export type LeadSource = 'qr_link' | 'csv_import' | 'manual_code';

export interface ReferralLead {
  id: string;                  // `${partnerUid}_${phone_or_shopUid}`
  partnerUid: string;
  referralCode: string;
  referredShopUid?: string | null; // Set when account registers/claims
  shopName: string;
  ownerPhone: string;          // 10-digit phone number (used for CSV matching)
  city?: string | null;
  source: LeadSource;
  status: ReferralLeadStatus;  // Lead CRM state
  planPurchased: 'monthly' | 'yearly' | null;
  commissionEarned: number;    // 75 for monthly, 499 for yearly, 0 while trial
  payoutId?: string | null;    // ID of payout batch once settled
  utrReference?: string | null;
  notes?: string | null;
  registeredAt: string;        // ISO timestamp
  convertedAt?: string | null; // ISO timestamp
  updatedAt: string;           // ISO timestamp
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
  leadIds: string[];           // Array of lead IDs included in this payout
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

## 4. Attribution & Lead CRM Lifecycle

### 4.1 URL Sniffing & Storage (`useReferralCapture.ts`)
* When any visitor lands on `/`, `/login`, or `/app` with query params `?ref=CODE` or `?partner=CODE`:
  1. Sniffs query parameter, sanitizes (trims, uppercase).
  2. Saves to `localStorage.setItem('mms_partner_code', code)` with 30-day validity window.

### 4.2 CSV Lead Pre-Attribution Workflow
* **Partner & Admin CSV Import**:
  1. Accepts CSV with headers: `Shop Name`, `Phone Number`, `City` (optional).
  2. Normalizes 10-digit mobile number.
  3. Pre-creates `referral_leads` records with `source = 'csv_import'` and initial status `contacted`.
  4. Automatically updates `partner.stats.totalLeads`.
* **Automatic Phone Match on Signup**:
  * When a retailer registers with that mobile number:
  * Automatically binds `referredShopUid = user.uid`, transitions status to `in_trial`, grants **Extended 7-Day Pro Trial**, and links the shop to the partner.

### 4.3 Super Admin CRM Lead Status Management
In `/admin`, Super Admin can view all leads per partner and change status via a simple dropdown:
* `contacted`: Admin/Partner contacted shop via call/WhatsApp.
* `in_trial`: Shop active on 7-day trial.
* `not_interested`: Marked as declined/dropped.
* `plan_purchased`: If marked or automatically detected on Pro plan activation:
  * Prompts for plan tier (`monthly` $\rightarrow$ ₹75 commission, `yearly` $\rightarrow$ ₹499 commission).
  * Automatically updates partner balances (`pendingBalance += commission`, `lifetimeEarnings += commission`).
* `payout_in_progress`: In settlement review.
* `paid`: Marked paid upon entering Bank UTR number (deducts `pendingBalance`, increases `paidEarnings`).

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
  * `Total Leads`: `stats.totalLeads`
  * `Active 7-Day Trials`: `stats.activeTrials`
  * `Plan Purchased`: `stats.paidConversions`
  * `Pending Payout Balance`: `₹stats.pendingBalance` (highlighted)
  * `Total Settled`: `₹stats.paidEarnings`
* **Referred Shops Ledger:**
  * Real-time list of shops from `referral_leads`.
  * Row columns:
    * Shop Name & Phone Number
    * Date Joined / Imported
    * Source (`QR Link` / `CSV Import`)
    * CRM Status Badge:
      * `Contacted` (Slate badge)
      * `In Trial` (Blue badge)
      * `Not Interested` (Gray badge)
      * `Plan Purchased` (Green badge with `+₹75` or `+₹499`)
      * `Payout in Progress` (Amber badge)
      * `Paid` (Purple badge with UTR)
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
   * Displays total amount to transfer and target UPI ID.
   * Input field *"Bank UTR / UPI Reference ID"* (placeholder: *"Enter 12-digit UPI UTR number"*).
   * Optional notes input.
   * Action *"Mark as Paid"*:
     * Writes record to `payouts`.
     * Updates leads to status `paid` and sets `utrReference`.
     * Zeroes `pendingBalance` and increments `paidEarnings`.
3. **Partner Directory & Lead CRM Management:**
   * Lists all registered partners.
   * Partner status toggle: `Active` / `Pending` / `Suspended`.
   * **Expand Partner Leads Drawer**:
     * View all leads attributed to this partner.
     * Status Dropdown for each lead: `Contacted`, `In Trial`, `Not Interested`, `Plan Purchased`, `Payout in Progress`, `Paid`.
   * **Admin CSV Lead Import**: Upload CSV directly assigned to any partner.

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
  allow update: if request.auth != null && (
    (resource.data.partnerUid == request.auth.uid && request.resource.data.diff(resource.data).affectedKeys().hasOnly(['notes'])) ||
    isSuperAdmin(request.auth.uid)
  );
  allow delete: if request.auth != null && isSuperAdmin(request.auth.uid);
}

// payouts collection
match /payouts/{payoutId} {
  allow read: if request.auth != null && (resource.data.partnerUid == request.auth.uid || isSuperAdmin(request.auth.uid));
  allow create, update, delete: if request.auth != null && isSuperAdmin(request.auth.uid);
}
```

---

## 8. Automated Testing Strategy

1. **`tests/referralAttribution.test.ts`**:
   * Validates query parameter capture (`?ref=CODE`), sanitization, and 30-day expiration in `localStorage`.
   * Tests phone matching from CSV import.
2. **`tests/partnerCommissions.test.ts`**:
   * Validates commission math:
     * ₹75 on Monthly plan (₹249)
     * ₹499 on Yearly plan (₹2,499)
3. **`tests/partnerLeadStatus.test.ts`**:
   * Tests transition across all 6 CRM statuses (`contacted` $\rightarrow$ `in_trial` $\rightarrow$ `plan_purchased` $\rightarrow$ `payout_in_progress` $\rightarrow$ `paid` / `not_interested`).
4. **`tests/partnerSettlement.test.ts`**:
   * Validates UTR recording, balance zeroing, and lead status update to `paid`.
5. **`tests/partnerCsvImport.test.ts`**:
   * Tests CSV parsing, header verification, phone normalization, and bulk lead generation.
