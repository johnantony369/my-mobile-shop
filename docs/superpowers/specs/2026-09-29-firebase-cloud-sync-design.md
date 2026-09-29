# Architecture Specification: Firebase Auth & Cloud Sync for My Mobile Shop

**Date:** 2026-09-29  
**Status:** Approved  
**Author:** Pair Programming Agent & Shop Owner  

---

## 1. Overview & Goals

"My Mobile Shop" is an offline-first Progressive Web App (PWA) managing daily ledger entries, mobile repair jobs, and shop settings using Dexie.js (IndexedDB).

### Goals
1. **Disaster Recovery**: Protect shop data against accidental browser data clears, device loss, or OS-level storage resets.
2. **Multi-Device Access**: Allow the shop owner and technicians to access the same ledger and repair tracking from multiple phones or computers.
3. **Preserve Offline Speed**: Keep the app 100% functional and responsive even with intermittent or zero internet connectivity.
4. **Authentication**: Provide Google Sign-In and Phone Number OTP login.

---

## 2. Architecture & Data Model

### 2.1 Firestore Structure
All shop records are isolated per authenticated user UID:

```
users/{uid}/
  ├── settings/
  │     └── appSettings (shopName, language, firstLaunchDate, activated, etc.)
  ├── entries/
  │     └── {cloudId} (type, amount, category, description, date, createdAt, updatedAt, deletedAt, paymentMethod, repairId)
  └── jobs/
        └── {cloudId} (status, customerName, phone, model, issue, cost, advance, receivedAt, readyAt, deliveredAt, bookEntryId, updatedAt, deletedAt)
```

### 2.2 Security Rules (Firestore)
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId}/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

### 2.3 Dexie Schema Upgrade (Version 3)
Extend existing Dexie tables to track synchronization metadata:
* `cloudId`: string (UUID v4), indexed.
* `updatedAt`: string (ISO 8601), indexed.
* `syncStatus`: `'synced' | 'pending' | 'deleted'`, indexed.
* `deletedAt`: string | null.

New Dexie store configuration:
```typescript
this.version(3).stores({
  entries: '++id, cloudId, type, amount, date, createdAt, updatedAt, syncStatus, paymentMethod, repairId',
  settings: '++id, cloudId, updatedAt, syncStatus',
  jobs: '++id, cloudId, status, phone, customerName, model, receivedAt, readyAt, deliveredAt, bookEntryId, updatedAt, syncStatus',
});
```

---

## 3. Synchronization Engine

### 3.1 Two-Way Hybrid Sync Cycle
1. **Local Writes (Optimistic)**:
   - Any create, update, or delete operation writes to Dexie immediately with `syncStatus = 'pending'` and fresh `updatedAt = new Date().toISOString()`.
   - UI re-renders instantly (0ms latency).
2. **Push (Local -> Cloud)**:
   - When network is online, find all records in Dexie with `syncStatus !== 'synced'`.
   - Batch write pending records to Firestore under `users/{uid}/...`.
   - Mark local records as `syncStatus = 'synced'`.
   - For items with `deletedAt`, delete the document in Firestore or set `{ deletedAt }`, then remove from local Dexie table.
3. **Pull / Listen (Cloud -> Local)**:
   - When online, listen to Firestore collections or fetch documents updated since `lastPulledAt`.
   - Compare `updatedAt` timestamps. If remote document is newer than local, update Dexie record.
   - If user is logging into a fresh device / cleared browser, download all documents and bulk-insert into Dexie.

### 3.2 Conflict Resolution
* **Rule**: Last-Write-Wins based on `updatedAt` ISO string comparison.
* **Deletions**: Soft-deletion via `deletedAt` ensures deletions take precedence over older edits.

---

## 4. Authentication & UI Experience

### 4.1 Authentication Methods
1. **Google Sign-In**:
   - Uses `signInWithPopup(auth, googleProvider)`.
2. **Phone Number OTP**:
   - Phone input with country code picker (defaulting to +91).
   - RecaptchaVerifier container (`recaptcha-container`).
   - SMS OTP confirmation modal.

### 4.2 UI Integration Points
1. **Settings Screen**:
   - Dedicated "Cloud Sync & Backup" card.
   - **Signed Out State**:
     - Explanatory copy highlighting automatic cloud backup and cross-device sync.
     - "Continue with Google" and "Sign in with Phone" buttons.
   - **Signed In State**:
     - User identifier (Phone / Google Name & Email).
     - Sync status badge (`🟢 Synced`, `🟡 Syncing...`, `⚪ Offline`, `🔴 Error`).
     - Last synced time display.
     - "Sync Now" button.
     - "Sign Out" button (keeps local data intact).
2. **Onboarding Screen**:
   - Optional sign-in option for existing users restoring their data on a new device.
3. **Top Navigation / Header**:
   - Compact sync status icon indicating connection state without disrupting the workflow.

---

## 5. Configuration & Environment

Environment variables (`.env` and `.env.example`):
```env
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
```

### Graceful Fallback
If Firebase environment variables are not set or invalid:
- App runs completely offline using existing Dexie capabilities.
- Settings screen indicates: *"Cloud Sync not configured. Add Firebase credentials to enable."*
- No errors or blank screens are thrown.

---

## 6. Testing & Verification

1. **Unit / Integration Tests**:
   - Dexie schema version 3 migration.
   - UUID generation and `cloudId` assignment for legacy records.
   - Timestamp conflict resolution logic (remote newer vs local newer).
2. **Manual Scenarios**:
   - Create entries offline -> reconnect -> verify they appear in Firestore.
   - Edit an entry in Firestore -> verify it updates in Dexie and UI.
   - Simulate browser cache clear -> sign in -> verify full restoration of entries, jobs, and settings.
   - Sign in with Google and Phone OTP flows.
