# Architecture Specification: Superadmin & Admin Dashboard for My Mobile Shop

**Date:** 2026-09-30  
**Status:** In Review  
**Author:** Pair Programming Agent & Superadmin (`johnantony271@gmail.com`)  

---

## 1. Overview & Goals

This specification defines the Superadmin authorization model, account tracking infrastructure, and the Superadmin Dashboard for **My Mobile Shop**.

### Goals
1. **Superadmin Role**: Designate `johnantony271@gmail.com` as the Superadmin.
2. **Restrict Developer / Demo Testing Tools**: Make the developer tools section in Settings (Seed Sample Ledger, Seed Sample Repairs, Clear All Data) visible exclusively to `johnantony271@gmail.com`.
3. **Track All Accounts & Usage**: Automatically maintain a lightweight directory in Firestore (`accounts/{uid}`) capturing every shop's metadata, activity, and cloud data usage.
4. **Interactive Admin Dashboard**: Provide an admin dashboard in Settings (visible only to `johnantony271@gmail.com`) to inspect all shops, view data usage, and execute admin actions (toggle PRO activation, contact shop, view breakdown).

---

## 2. Architecture & Data Model

### 2.1 Superadmin Authorization
- A pure, testable utility function `isSuperAdmin(user?: { email?: string | null } | null): boolean`:
  ```typescript
  export const SUPERADMIN_EMAIL = 'johnantony271@gmail.com';

  export function isSuperAdmin(user?: { email?: string | null } | null): boolean {
    if (!user || !user.email) return false;
    return user.email.trim().toLowerCase() === SUPERADMIN_EMAIL;
  }
  ```

### 2.2 Firestore Account Directory (`accounts/{uid}`)
Whenever any shop syncs with Firebase (`pushPendingChanges`) or on successful login, the app upserts `accounts/{uid}` with:

```typescript
export interface ShopAccountSummary {
  uid: string;
  email: string | null;
  phoneNumber: string | null;
  shopName: string;
  activated: boolean;
  entryCount: number;
  jobCount: number;
  estimatedBytes: number;
  createdAt: string; // ISO string
  lastActiveAt: string; // ISO string
  updatedAt: string; // ISO string
}
```

### 2.3 Superadmin Actions
From the dashboard, `johnantony271@gmail.com` can:
1. **Toggle Pro Status**: Update `accounts/{uid}.activated` and `users/{uid}/settings/appSettings.activated`. When the shop owner syncs, their device automatically reconciles the activated license.
2. **Direct Contact**: Click to WhatsApp, call phone number, or send email to the shop owner.
3. **Data Usage Breakdown**: View breakdown of ledger entries, repair jobs, and estimated cloud storage in KB/MB.
4. **Search & Filter**: Search by shop name, email, or phone; filter by Pro vs Free trial.

---

## 3. Security Rules (Firestore)

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    function isSuperAdmin() {
      return request.auth != null && request.auth.token.email == 'johnantony271@gmail.com';
    }

    // Accounts directory
    match /accounts/{userId} {
      // Users can write/update their own account summary; Superadmin can read all and update
      allow read: if request.auth != null && (request.auth.uid == userId || isSuperAdmin());
      allow write: if request.auth != null && (request.auth.uid == userId || isSuperAdmin());
    }

    // User ledger, jobs, settings
    match /users/{userId}/{document=**} {
      allow read, write: if request.auth != null && (request.auth.uid == userId || isSuperAdmin());
    }
  }
}
```

---

## 4. UI / UX Design

### 4.1 Settings Screen Integration
- If `isSuperAdmin(user)` is true:
  - Top Superadmin Card with a Crown badge: "Superadmin Control Center", showing user count snippet and a button "Open Admin Dashboard".
  - Section 5 ("Developer / Testing tools") is rendered.
- If `isSuperAdmin(user)` is false:
  - Neither the Superadmin Control Center nor Section 5 ("Developer / Testing tools") is rendered.

### 4.2 Admin Dashboard Modal / View (`AdminDashboardModal.tsx`)
- Full iOS-style sheet or modal with:
  - **Metrics Bar**: Total Shops, Total Entries, Total Repairs, Total Estimated Storage (KB/MB), Pro vs Free ratio.
  - **Search & Filters**: Live filter input by shop name, email, or phone.
  - **Account List Cards**:
    - Shop Name & Owner Email/Phone
    - Pro status chip with inline toggle ("Activate Pro" / "Revoke Pro")
    - Usage chip: `{entryCount} entries • {jobCount} jobs • {dataSizeFormatted}`
    - Last active timestamp badge
    - Quick actions: WhatsApp button, Call button, Email button
  - **Refresh Button**: On-demand reload of account directory.
