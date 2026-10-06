# Digital Job Sheets: Pre-Intake Device Photo Evidence Design Specification

## 1. Problem Statement & Motivation
In mobile repair shops, customer disputes are common after repairs are completed:
- Customers may claim that technicians caused pre-existing scratches, dented housings, or broke cameras that were already damaged upon intake.
- Disputes can also arise regarding device condition before disassembly.

To protect shop owners and ensure full transparency, this feature introduces **digital intake photo attachments**:
- Shop owners can snap or upload up to 4 device photos (e.g. front screen, back camera, edges/frame, specific damage spots) during intake.
- Photos are stored locally first (offline-ready) and synced to Firebase Cloud Storage when network connectivity is available.
- Clean, uncluttered UI: No noisy sync status icons on photos.
- Photos are viewable in the job details view with a full-screen image inspector/lightbox for dispute resolution.

---

## 2. Core Architecture & Storage Strategy

### 2.1 Local-First Architecture (Dexie v7)
To ensure the app never lags or blocks the technician at the counter, photos are stored in IndexedDB via a dedicated Dexie table:

```typescript
export interface JobPhoto extends SyncMetadata {
  id?: number;
  photoId: string;       // Unique UUID string
  jobCloudId: string;    // Links photo to Job.cloudId
  dataUrl?: string;      // Base64 data URL compressed on client (~80-150KB)
  downloadUrl?: string;  // Firebase Storage cloud URL
  label?: string;        // Optional tag: 'front' | 'back' | 'camera' | 'damage' | 'general'
  createdAt: number;     // Timestamp in ms
  uploadedAt?: number;   // Timestamp in ms
  uploadStatus: 'pending' | 'uploading' | 'uploaded' | 'failed';
}
```

* **Dexie Database Version Upgrade**:
  * Bump to version `7`.
  * Store definition:
    ```typescript
    jobPhotos: '++id, photoId, jobCloudId, uploadStatus, createdAt, syncStatus'
    ```
* **Performance Isolation**:
  * The primary `jobs` table remains ultra-lightweight.
  * Image payloads are loaded on-demand when inspecting or editing a specific job sheet.

### 2.2 Cloud Storage (Firebase Storage)
When the device is online and Firebase authentication is active:
* **Storage Path**:
  `users/{ownerUid}/jobs/{jobCloudId}/{photoId}.jpg`
* **Metadata**:
  * Content type: `image/jpeg`
  * Cache-Control: `public, max-age=31536000`
* **Firestore Metadata Record**:
  * For multi-device synchronization (e.g. tablet and phone), a metadata reference is saved:
    `users/{ownerUid}/jobs/{jobCloudId}/photos/{photoId}` with `{ photoId, jobCloudId, downloadUrl, createdAt }`.
  * If a secondary synced device opens the job and local `dataUrl` is absent, it loads the image from `downloadUrl`.

---

## 3. Image Capture & Compression Pipeline

### 3.1 Compression Specifications (`src/utils/image.ts`)
* High-resolution camera photos (often 3MB–8MB) are resized and compressed on the client before being stored in IndexedDB:
  * **Max Dimension**: 1200px (width or height, maintaining original aspect ratio).
  * **Format**: JPEG.
  * **Quality**: 0.75.
  * **Target Size**: 80 KB – 150 KB.
* Provides functions:
  * `compressImageFile(file: File): Promise<{ dataUrl: string; blob: Blob }>`
  * `dataUrlToBlob(dataUrl: string): Blob`

---

## 4. User Interface & User Experience

### 4.1 Intake Form (`src/screens/AddEditJobSheet.tsx`)
* **Photo Intake Section**:
  * Displayed directly below the Device Model & Issue/Complaint fields.
  * **Add Photo Button**: Prompts native camera (`capture="environment"`) or gallery file picker.
  * **Capacity Limit**: Up to 4 photos per job sheet.
  * **Thumbnails Grid**:
    * Displays square rounded thumbnails of selected photos.
    * Each thumbnail has an overlay delete (`X`) button in the corner.
    * Clean appearance: No cloud sync status badges or clock icons.
  * When saving the job, all newly captured photos are saved to `db.jobPhotos` associated with the job's `cloudId`.

### 4.2 Job Detail & Dispute Inspector (`src/screens/JobDetailSheet.tsx`)
* **Photos Section**:
  * Shows horizontal scrollable thumbnails of all attached intake photos.
  * Clean presentation without sync icons.
* **Full-Screen Photo Inspector**:
  * Tapping any thumbnail opens a full-screen modal viewer (`src/components/PhotoViewerModal.tsx`).
  * Features:
    * High-resolution zoom & pan to inspect scratches, glass cracks, and camera lenses.
    * Close button and swipe-away / backdrop tap to dismiss.

### 4.3 WhatsApp Slip Integration (`src/utils/repairs.ts`)
* Updates `buildIntakeSlipMessage`:
  * If the job has intake photos attached, appends a line:
    `Photos: {N} intake condition photo(s) recorded.`
  * Gives the customer immediate written confirmation that the physical condition of the device was cataloged before intake.

---

## 5. Background Sync Engine (`src/firebase/photoSync.ts`)

### 5.1 Sync Lifecycle
1. Triggered:
   * Immediately after saving a job if online.
   * On app startup / login if online.
   * On browser `online` network event.
2. Steps:
   * Finds local photos in `db.jobPhotos` with `uploadStatus === 'pending'` or `'failed'`.
   * Checks if user is authenticated and `storageBucket` is available in Firebase config.
   * Uploads each photo Blob to Firebase Storage.
   * Saves the download URL into local `JobPhoto.downloadUrl`, sets `uploadStatus = 'uploaded'`.
   * Reconciles remote photo metadata for multi-device view.

### 5.2 Error Handling & Fallbacks
* If Firebase Storage is not enabled or credentials fail, logs a silent console warning and remains completely operational in local-only mode.
* Network timeouts during upload cleanly flag `uploadStatus = 'failed'` for automatic retry without blocking the UI.

---

## 6. Testing & Quality Assurance Plan

1. **Unit Tests (`tests/image.test.ts`)**:
   * Verify image compression preserves aspect ratios and handles portrait/landscape.
   * Verify blob conversion utility.
2. **Database Migration Tests (`tests/db_upgrade.test.ts`)**:
   * Verify Dexie v7 upgrade cleanly migrates existing databases without data loss in entries, settings, jobs, stock, or bills.
3. **Component Tests (`tests/AddEditJobSheet.test.tsx`)**:
   * Verify photo upload respects max limit of 4.
   * Verify deleting a photo removes it from pending list.
   * Verify saving job links photos to `jobCloudId`.
