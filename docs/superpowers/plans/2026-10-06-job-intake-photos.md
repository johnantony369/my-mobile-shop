# Job Intake Photo Evidence Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Provide mobile repair shop owners with an intake photo evidence workflow that captures up to 4 device condition photos before repair, storing them offline-first in Dexie and syncing quietly to Firebase Cloud Storage when connected, resolving pre-existing damage disputes.

**Architecture:** Client-side canvas compression down to ~80–150 KB JPEG; dedicated Dexie IndexedDB `jobPhotos` table (v7) linked by `jobCloudId`; silent background upload worker to Firebase Storage (`users/{uid}/jobs/{jobCloudId}/{photoId}.jpg`); clean photo thumbnails with zero sync icons; full-screen photo viewer modal for dispute inspection; updated WhatsApp intake slip.

**Tech Stack:** React 18, TypeScript 5, Dexie 4 (IndexedDB), Firebase 12 (Storage & Firestore), Lucide React, Tailwind CSS, Vitest.

**Spec:** [`docs/superpowers/specs/2026-10-06-job-intake-photos-design.md`](file:///f:/My%20Mobile%20Shop/docs/superpowers/specs/2026-10-06-job-intake-photos-design.md)

## Global Constraints

- Storage capacity: Maximum 4 photos per job sheet.
- Client compression: Max dimension 1200px, JPEG quality 0.75, target file size ~80–150 KB.
- UI Cleanliness: No cloud/sync status badges or clock icons on photo thumbnails.
- Offline guarantee: Counter intake and photo saving must succeed 100% offline without blocking or waiting for network.
- Firebase Storage fallback: If Firebase Storage is not configured or offline, continue seamlessly in local IndexedDB mode.

## Review Focus

- File input edge cases: User uploads a corrupt or non-image file; should display a clear warning without crashing the form.
- Photo deletion before save: Adding 4 photos and removing 2 should correctly save only the remaining 2 photos.
- Exceeding limit: Attempting to upload more than 4 photos in total should cap at 4 and notify the user.
- Offline viewer: Opening a job detail sheet while offline displays local `dataUrl` instantly.
- Cloud fallback: Opening a job on a synced secondary device without local `dataUrl` streams from `downloadUrl`.

---

### Task 1: Image Compression & Blob Utilities

**Files:**
- Create: `src/utils/image.ts`
- Test: `tests/image.test.ts`

**Interfaces:**
- Produces:
  - `compressImageFile(file: File, maxDimension?: number, quality?: number): Promise<{ dataUrl: string; blob: Blob }>`
  - `dataUrlToBlob(dataUrl: string): Blob`

- [ ] **Step 1: Write the failing tests for image utilities**

```typescript
// tests/image.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { dataUrlToBlob, compressImageFile } from '../src/utils/image';

describe('Image utilities', () => {
  it('converts dataUrl to Blob correctly', () => {
    const dataUrl = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=';
    const blob = dataUrlToBlob(dataUrl);
    expect(blob).toBeInstanceOf(Blob);
    expect(blob.type).toBe('image/jpeg');
    expect(blob.size).toBeGreaterThan(0);
  });

  it('rejects invalid dataUrl strings gracefully', () => {
    expect(() => dataUrlToBlob('invalid-data-url')).toThrow();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/image.test.ts`
Expected: FAIL with "Cannot find module '../src/utils/image'"

- [ ] **Step 3: Write minimal implementation for `src/utils/image.ts`**

```typescript
// src/utils/image.ts

export function dataUrlToBlob(dataUrl: string): Blob {
  const parts = dataUrl.split(',');
  if (parts.length < 2) {
    throw new Error('Invalid data URL');
  }
  const mimeMatch = parts[0].match(/:(.*?);/);
  const mime = mimeMatch ? mimeMatch[1] : 'image/jpeg';
  const bstr = atob(parts[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new Blob([u8arr], { type: mime });
}

export function compressImageFile(
  file: File,
  maxDimension = 1200,
  quality = 0.75
): Promise<{ dataUrl: string; blob: Blob }> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      reject(new Error('Selected file is not an image'));
      return;
    }

    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Failed to load image'));
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Could not get canvas context'));
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        const blob = dataUrlToBlob(dataUrl);
        resolve({ dataUrl, blob });
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/image.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/utils/image.ts tests/image.test.ts
git commit -m "feat: add client-side image compression and blob utilities"
```

---

### Task 2: Database Schema & Types Upgrade (Dexie v7 with `jobPhotos` Table)

**Files:**
- Modify: `src/types/index.ts`
- Modify: `src/db/db.ts`
- Test: `tests/dbJobPhotos.test.ts`

**Interfaces:**
- Produces:
  - `JobPhoto` in `src/types/index.ts`
  - `db.jobPhotos` Dexie table with schema v7
  - `saveJobPhotos(jobCloudId: string, photos: Array<Partial<JobPhoto>>): Promise<void>`
  - `getJobPhotos(jobCloudId: string): Promise<JobPhoto[]>`
  - `deleteJobPhoto(photoId: string): Promise<void>`

- [ ] **Step 1: Write the failing tests for `jobPhotos` schema and CRUD**

```typescript
// tests/dbJobPhotos.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import { db, saveJobPhotos, getJobPhotos, deleteJobPhoto } from '../src/db/db';

describe('Dexie v7 jobPhotos Table and CRUD', () => {
  beforeEach(async () => {
    if (db.jobPhotos) await db.jobPhotos.clear();
  });

  it('saves and retrieves job photos by jobCloudId', async () => {
    const jobCloudId = 'job_test_123';
    await saveJobPhotos(jobCloudId, [
      {
        photoId: 'p_1',
        dataUrl: 'data:image/jpeg;base64,1234',
        label: 'Front screen',
      },
      {
        photoId: 'p_2',
        dataUrl: 'data:image/jpeg;base64,5678',
        label: 'Back camera',
      },
    ]);

    const photos = await getJobPhotos(jobCloudId);
    expect(photos).toHaveLength(2);
    expect(photos[0].photoId).toBe('p_1');
    expect(photos[0].uploadStatus).toBe('pending');
    expect(photos[0].jobCloudId).toBe(jobCloudId);
    expect(photos[1].photoId).toBe('p_2');
  });

  it('deletes a single job photo by photoId', async () => {
    const jobCloudId = 'job_test_456';
    await saveJobPhotos(jobCloudId, [
      { photoId: 'p_del_1', dataUrl: 'data:image/jpeg;base64,111' },
      { photoId: 'p_del_2', dataUrl: 'data:image/jpeg;base64,222' },
    ]);

    await deleteJobPhoto('p_del_1');
    const remaining = await getJobPhotos(jobCloudId);
    expect(remaining).toHaveLength(1);
    expect(remaining[0].photoId).toBe('p_del_2');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/dbJobPhotos.test.ts`
Expected: FAIL (functions not defined, `jobPhotos` table not defined)

- [ ] **Step 3: Add `JobPhoto` type and Dexie v7 upgrade in `src/types/index.ts` and `src/db/db.ts`**

Update `src/types/index.ts`:
```typescript
export interface JobPhoto extends SyncMetadata {
  id?: number;
  photoId: string;
  jobCloudId: string;
  dataUrl?: string;
  downloadUrl?: string;
  label?: string;
  createdAt: number;
  uploadedAt?: number;
  uploadStatus: 'pending' | 'uploading' | 'uploaded' | 'failed';
}
```

Update `src/db/db.ts`:
- Add `jobPhotos!: Table<JobPhoto, number>;` to `ShopDatabase`
- Add version 7 store:
```typescript
this.version(7).stores({
  entries: '++id, cloudId, type, amount, date, createdAt, updatedAt, syncStatus, paymentMethod, repairId',
  settings: '++id, cloudId, updatedAt, syncStatus',
  jobs: '++id, cloudId, status, phone, customerName, model, receivedAt, readyAt, deliveredAt, bookEntryId, updatedAt, syncStatus',
  stock: '++id, cloudId, name, category, sellingPrice, quantity, sku, createdAt, updatedAt, syncStatus',
  bills: '++id, cloudId, invoiceNo, date, createdAt, updatedAt, syncStatus',
  purchases: '++id, cloudId, name, isPurchased, createdAt, updatedAt, syncStatus',
  jobPhotos: '++id, photoId, jobCloudId, uploadStatus, createdAt, syncStatus',
});
```
- Add hook on `jobPhotos` creating:
```typescript
this.jobPhotos.hook('creating', (_primKey, obj) => {
  if (!obj.cloudId) obj.cloudId = generateCloudId();
  if (!obj.createdAt) obj.createdAt = Date.now();
  if (!obj.updatedAt) obj.updatedAt = new Date().toISOString();
  if (!obj.syncStatus) obj.syncStatus = 'pending';
  if (!obj.uploadStatus) obj.uploadStatus = 'pending';
});
```
- Implement CRUD helper functions:
```typescript
export async function saveJobPhotos(jobCloudId: string, photos: Array<Partial<JobPhoto>>): Promise<void> {
  const now = Date.now();
  for (const p of photos) {
    if (!p.photoId) continue;
    const existing = await db.jobPhotos.where('photoId').equals(p.photoId).first();
    if (!existing) {
      await db.jobPhotos.add({
        photoId: p.photoId,
        jobCloudId,
        dataUrl: p.dataUrl,
        downloadUrl: p.downloadUrl,
        label: p.label,
        createdAt: p.createdAt || now,
        uploadStatus: p.uploadStatus || 'pending',
      } as JobPhoto);
    }
  }
}

export async function getJobPhotos(jobCloudId: string): Promise<JobPhoto[]> {
  if (!db.jobPhotos) return [];
  const photos = await db.jobPhotos.where('jobCloudId').equals(jobCloudId).toArray();
  return photos.filter((p) => !p.deletedAt && p.syncStatus !== 'deleted');
}

export async function deleteJobPhoto(photoId: string): Promise<void> {
  if (!db.jobPhotos) return;
  const item = await db.jobPhotos.where('photoId').equals(photoId).first();
  if (item && item.id) {
    await db.jobPhotos.delete(item.id);
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/dbJobPhotos.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/types/index.ts src/db/db.ts tests/dbJobPhotos.test.ts
git commit -m "feat: add JobPhoto type and Dexie v7 jobPhotos schema with CRUD helpers"
```

---

### Task 3: WhatsApp Intake Slip Notification Update

**Files:**
- Modify: `src/utils/repairs.ts`
- Modify: `tests/repairsWorkflow.test.ts`

**Interfaces:**
- Updates: `buildIntakeSlipMessage(job: Job, shopName: string, photoCount?: number): string`

- [ ] **Step 1: Write test for photo count on intake slip**

```typescript
// in tests/repairsWorkflow.test.ts
it('includes intake photos count in intake slip when photos are recorded', () => {
  const slipWithPhotos = buildIntakeSlipMessage(sampleJob, 'Kerala Mobile Care', 3);
  expect(slipWithPhotos).toContain('Photos: 3 intake condition photo(s) recorded');

  const slipWithoutPhotos = buildIntakeSlipMessage(sampleJob, 'Kerala Mobile Care', 0);
  expect(slipWithoutPhotos).not.toContain('intake condition photo(s)');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/repairsWorkflow.test.ts`
Expected: FAIL

- [ ] **Step 3: Update `buildIntakeSlipMessage` in `src/utils/repairs.ts`**

Update `buildIntakeSlipMessage`:
```typescript
export function buildIntakeSlipMessage(job: Job, shopName: string, photoCount?: number): string {
  const shop = shopName.trim() || 'My Mobile Shop';
  const est = job.estimate !== undefined && job.estimate > 0 ? formatINR(job.estimate) : 'To be estimated';
  const adv = job.advance ? formatINR(job.advance) : formatINR(0);
  const balance = job.estimate !== undefined && job.estimate > 0
    ? formatINR(Math.max(0, job.estimate - (job.advance || 0)))
    : 'TBD';

  let msg = `*${shop}* — Repair Job Card\n`;
  if (job.id) msg += `Job ID: #${job.id}\n`;
  msg += `Customer: ${job.customerName}\n`;
  msg += `Device: ${job.model}\n`;
  msg += `Issue: ${job.complaint}\n`;
  msg += `Estimate: ${est} | Advance: ${adv}\n`;
  msg += `Balance Due: ${balance}\n`;
  if (job.expectedDate) msg += `Est. Date: ${job.expectedDate}\n`;
  if (photoCount && photoCount > 0) {
    msg += `Photos: ${photoCount} intake condition photo(s) recorded\n`;
  }
  msg += `Status: Received for Repair\n\n`;
  msg += `We will notify you once ready. Thank you for choosing ${shop}!`;
  return msg;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/repairsWorkflow.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/utils/repairs.ts tests/repairsWorkflow.test.ts
git commit -m "feat: include intake photos note in WhatsApp intake slip"
```

---

### Task 4: Full-Screen Photo Viewer Modal Component

**Files:**
- Create: `src/components/PhotoViewerModal.tsx`
- Test: `tests/photoViewerModal.test.tsx`

**Interfaces:**
- Produces: `PhotoViewerModal({ isOpen, photo, onClose }: PhotoViewerModalProps)`

- [ ] **Step 1: Write test for `PhotoViewerModal`**

```tsx
// tests/photoViewerModal.test.tsx
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PhotoViewerModal } from '../src/components/PhotoViewerModal';

describe('PhotoViewerModal', () => {
  const mockPhoto = {
    photoId: 'p_1',
    dataUrl: 'data:image/jpeg;base64,abc',
    label: 'Front screen scratch',
  };

  it('renders photo and label when open', () => {
    const handleClose = vi.fn();
    render(
      <PhotoViewerModal
        isOpen={true}
        photo={mockPhoto}
        onClose={handleClose}
      />
    );

    const img = screen.getByRole('img');
    expect(img).toHaveAttribute('src', 'data:image/jpeg;base64,abc');
    expect(screen.getByText('Front screen scratch')).toBeInTheDocument();
  });

  it('calls onClose when close button clicked', () => {
    const handleClose = vi.fn();
    render(
      <PhotoViewerModal
        isOpen={true}
        photo={mockPhoto}
        onClose={handleClose}
      />
    );

    const closeBtn = screen.getByLabelText('Close viewer');
    fireEvent.click(closeBtn);
    expect(handleClose).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/photoViewerModal.test.tsx`
Expected: FAIL

- [ ] **Step 3: Implement `src/components/PhotoViewerModal.tsx`**

```tsx
import React, { useState } from 'react';
import { X, ZoomIn, ZoomOut } from 'lucide-react';

interface PhotoItem {
  photoId: string;
  dataUrl?: string;
  downloadUrl?: string;
  label?: string;
}

interface PhotoViewerModalProps {
  isOpen: boolean;
  photo: PhotoItem | null;
  onClose: () => void;
}

export const PhotoViewerModal: React.FC<PhotoViewerModalProps> = ({
  isOpen,
  photo,
  onClose,
}) => {
  const [isZoomed, setIsZoomed] = useState(false);

  if (!isOpen || !photo) return null;

  const imgSrc = photo.dataUrl || photo.downloadUrl || '';

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-black/95 text-white animate-fade-in"
      role="dialog"
      aria-modal="true"
    >
      {/* Top action bar */}
      <div className="flex items-center justify-between px-4 py-3 bg-black/50 backdrop-blur-md">
        <div className="text-sm font-medium text-gray-200 truncate pr-2">
          {photo.label || 'Intake Photo'}
        </div>
        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={() => setIsZoomed(!isZoomed)}
            aria-label="Toggle zoom"
            className="p-2 rounded-full bg-white/10 hover:bg-white/20 active:scale-95 transition-all"
          >
            {isZoomed ? <ZoomOut className="w-5 h-5 text-white" /> : <ZoomIn className="w-5 h-5 text-white" />}
          </button>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close viewer"
            className="p-2 rounded-full bg-white/10 hover:bg-white/20 active:scale-95 transition-all"
          >
            <X className="w-5 h-5 text-white" />
          </button>
        </div>
      </div>

      {/* Main Image Container */}
      <div
        className="flex-1 flex items-center justify-center p-2 overflow-auto"
        onClick={() => setIsZoomed(!isZoomed)}
      >
        <img
          src={imgSrc}
          alt={photo.label || 'Intake Condition Photo'}
          className={`max-w-full max-h-full object-contain transition-transform duration-200 select-none ${
            isZoomed ? 'scale-150 cursor-zoom-out' : 'scale-100 cursor-zoom-in'
          }`}
        />
      </div>

      {/* Bottom Hint */}
      <div className="text-center py-2 text-xs text-gray-400 bg-black/50">
        Tap image or zoom icon to inspect damage
      </div>
    </div>
  );
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/photoViewerModal.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/PhotoViewerModal.tsx tests/photoViewerModal.test.tsx
git commit -m "feat: add full-screen photo viewer modal for dispute inspection"
```

---

### Task 5: Intake Photo Capture in `AddEditJobSheet`

**Files:**
- Modify: `src/screens/AddEditJobSheet.tsx`
- Test: `tests/addEditJobPhotos.test.tsx`

**Interfaces:**
- Consumes: `compressImageFile` from `src/utils/image.ts`, `saveJobPhotos` from `src/db/db.ts`
- Limit: Up to 4 photos per job sheet.
- Clean UI: Clean thumbnails without sync status badges.

- [ ] **Step 1: Write test for photo addition and deletion in `AddEditJobSheet`**

```tsx
// tests/addEditJobPhotos.test.tsx
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AddEditJobSheet } from '../src/screens/AddEditJobSheet';
import { db } from '../src/db/db';

vi.mock('../src/utils/image', () => ({
  compressImageFile: vi.fn().mockResolvedValue({
    dataUrl: 'data:image/jpeg;base64,mockphoto',
    blob: new Blob(['mock'], { type: 'image/jpeg' }),
  }),
}));

describe('Intake Photos in AddEditJobSheet', () => {
  beforeEach(async () => {
    if (db.jobs) await db.jobs.clear();
    if (db.jobPhotos) await db.jobPhotos.clear();
  });

  it('renders intake photo section with add photo button', () => {
    render(
      <AddEditJobSheet
        isOpen={true}
        onClose={vi.fn()}
        onSaved={vi.fn()}
        jobToEdit={null}
        language="en"
      />
    );

    expect(screen.getByText(/Condition Photos/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Add intake photo/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/addEditJobPhotos.test.tsx`
Expected: FAIL

- [ ] **Step 3: Update `src/screens/AddEditJobSheet.tsx`**

- Add state:
  ```typescript
  interface PendingPhoto {
    photoId: string;
    dataUrl: string;
    label?: string;
  }
  const [photos, setPhotos] = useState<PendingPhoto[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  ```
- Add handler for file uploads with compression:
  - Check max 4 photos: `if (photos.length >= 4) { alert('Maximum 4 photos allowed'); return; }`
  - Compress using `compressImageFile(file)`
  - Append to `photos` state.
- Add UI section below complaint field:
  - Heading: "Condition Photos (Max 4)"
  - Thumbnail row: Each thumbnail has an `X` delete button. No sync icons.
  - "Add Photo" button triggers hidden `<input type="file" accept="image/*" />`.
- On `handleSave`:
  - After saving the job, call:
    `await saveJobPhotos(savedJob.cloudId, photos);`
  - If WhatsApp slip is enabled, pass `photos.length` to `buildIntakeSlipMessage`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/addEditJobPhotos.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/screens/AddEditJobSheet.tsx tests/addEditJobPhotos.test.tsx
git commit -m "feat: add intake photo upload and preview to AddEditJobSheet"
```

---

### Task 6: Condition Photos Viewing & Inspection in `JobDetailSheet`

**Files:**
- Modify: `src/screens/JobDetailSheet.tsx`
- Test: `tests/jobDetailPhotos.test.tsx`

**Interfaces:**
- Consumes: `getJobPhotos` from `src/db/db.ts`, `PhotoViewerModal` from `src/components/PhotoViewerModal.tsx`
- Clean UI: Clean thumbnails without sync status badges.

- [ ] **Step 1: Write test for condition photos in `JobDetailSheet`**

```tsx
// tests/jobDetailPhotos.test.tsx
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { JobDetailSheet } from '../src/screens/JobDetailSheet';
import { db, saveJobPhotos } from '../src/db/db';
import { Job } from '../src/types';

describe('Condition photos in JobDetailSheet', () => {
  beforeEach(async () => {
    if (db.jobPhotos) await db.jobPhotos.clear();
  });

  const sampleJob: Job = {
    id: 1,
    cloudId: 'job_detail_test',
    customerName: 'Anil Kumar',
    phone: '9876543210',
    model: 'iPhone 13',
    complaint: 'Cracked back glass',
    status: 'received',
    advance: 0,
    receivedAt: Date.now(),
  };

  it('loads and displays attached photos for the job', async () => {
    await saveJobPhotos('job_detail_test', [
      { photoId: 'p_test_1', dataUrl: 'data:image/jpeg;base64,photo1', label: 'Back glass' },
    ]);

    render(
      <JobDetailSheet
        isOpen={true}
        onClose={vi.fn()}
        job={sampleJob}
        shopName="Test Shop"
        language="en"
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onOpenDelivery={vi.fn()}
        onJobUpdated={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByText(/Condition Photos/i)).toBeInTheDocument();
      expect(screen.getByRole('img')).toBeInTheDocument();
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/jobDetailPhotos.test.tsx`
Expected: FAIL

- [ ] **Step 3: Modify `src/screens/JobDetailSheet.tsx`**

- Fetch photos for the job:
  ```typescript
  const [photos, setPhotos] = useState<JobPhoto[]>([]);
  const [selectedPhoto, setSelectedPhoto] = useState<JobPhoto | null>(null);

  useEffect(() => {
    if (isOpen && job?.cloudId) {
      getJobPhotos(job.cloudId).then(setPhotos);
    } else {
      setPhotos([]);
    }
  }, [isOpen, job?.cloudId]);
  ```
- Render Condition Photos section:
  - If `photos.length > 0`:
    - Section title: "Condition Photos ({photos.length})"
    - Horizontal scroll container of square thumbnails.
    - Clean look: Just the photo image and optional label pill. No sync badges.
    - Click thumbnail: `setSelectedPhoto(photo)`.
- Render `PhotoViewerModal`:
  - `isOpen={Boolean(selectedPhoto)}`, `photo={selectedPhoto}`, `onClose={() => setSelectedPhoto(null)}`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/jobDetailPhotos.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/screens/JobDetailSheet.tsx tests/jobDetailPhotos.test.tsx
git commit -m "feat: display intake condition photos with inspection modal in JobDetailSheet"
```

---

### Task 7: Background Cloud Sync Pipeline for Firebase Storage

**Files:**
- Modify: `src/firebase/config.ts` (export `storage` if configured)
- Create: `src/firebase/photoSync.ts`
- Test: `tests/photoSync.test.ts`

**Interfaces:**
- Produces: `syncPendingJobPhotos(): Promise<{ uploaded: number; failed: number }>`
- Storage Path: `users/{ownerUid}/jobs/{jobCloudId}/{photoId}.jpg`

- [ ] **Step 1: Write test for photo cloud sync worker**

```typescript
// tests/photoSync.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { syncPendingJobPhotos } from '../src/firebase/photoSync';
import { db, saveJobPhotos, getJobPhotos } from '../src/db/db';

vi.mock('../src/firebase/config', () => ({
  auth: { currentUser: { uid: 'user_test_123' } },
  isFirebaseConfigured: () => true,
  storage: {},
}));

vi.mock('firebase/storage', () => ({
  ref: vi.fn(),
  uploadBytes: vi.fn().mockResolvedValue({}),
  getDownloadURL: vi.fn().mockResolvedValue('https://firebasestorage.googleapis.com/test.jpg'),
}));

describe('Photo cloud sync worker', () => {
  beforeEach(async () => {
    if (db.jobPhotos) await db.jobPhotos.clear();
  });

  it('uploads pending photos and updates downloadUrl and status', async () => {
    await saveJobPhotos('job_sync_1', [
      { photoId: 'p_sync_1', dataUrl: 'data:image/jpeg;base64,123' },
    ]);

    const result = await syncPendingJobPhotos();
    expect(result.uploaded).toBe(1);

    const updated = await getJobPhotos('job_sync_1');
    expect(updated[0].uploadStatus).toBe('uploaded');
    expect(updated[0].downloadUrl).toContain('firebasestorage');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/photoSync.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement `src/firebase/config.ts` and `src/firebase/photoSync.ts`**

In `src/firebase/config.ts`:
- Import `getStorage, FirebaseStorage` from `firebase/storage`
- Initialize `storage = getStorage(app);` and export `storage`.

In `src/firebase/photoSync.ts`:
```typescript
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, dataUrlToBlob } from '../db/db';
import { dataUrlToBlob as convertDataUrl } from '../utils/image';
import { storage, auth, isFirebaseConfigured } from './config';
import { JobPhoto } from '../types';

export async function syncPendingJobPhotos(): Promise<{ uploaded: number; failed: number }> {
  if (!isFirebaseConfigured() || !storage || !auth?.currentUser) {
    return { uploaded: 0, failed: 0 };
  }

  const uid = auth.currentUser.uid;
  if (!db.jobPhotos) return { uploaded: 0, failed: 0 };

  const pendingPhotos = await db.jobPhotos
    .filter((p) => p.uploadStatus === 'pending' || p.uploadStatus === 'failed')
    .toArray();

  let uploaded = 0;
  let failed = 0;

  for (const photo of pendingPhotos) {
    if (!photo.dataUrl || !photo.photoId || !photo.jobCloudId) continue;
    try {
      const blob = convertDataUrl(photo.dataUrl);
      const storageRef = ref(storage, `users/${uid}/jobs/${photo.jobCloudId}/${photo.photoId}.jpg`);
      await uploadBytes(storageRef, blob, { contentType: 'image/jpeg' });
      const downloadUrl = await getDownloadURL(storageRef);

      if (photo.id) {
        await db.jobPhotos.update(photo.id, {
          downloadUrl,
          uploadStatus: 'uploaded',
          uploadedAt: Date.now(),
        });
      }
      uploaded++;
    } catch (err) {
      console.warn(`Failed to upload photo ${photo.photoId}:`, err);
      if (photo.id) {
        await db.jobPhotos.update(photo.id, { uploadStatus: 'failed' });
      }
      failed++;
    }
  }

  return { uploaded, failed };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/photoSync.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/firebase/config.ts src/firebase/photoSync.ts tests/photoSync.test.ts
git commit -m "feat: add background cloud sync pipeline for intake photos"
```

---

### Task 8: End-to-End Verification & Full Build Check

**Files:**
- All modified and newly created files.

- [ ] **Step 1: Run complete test suite**

Run: `npm test`
Expected: All existing tests and new photo tests PASS with 0 failures.

- [ ] **Step 2: Run production TypeScript compilation & build**

Run: `npm run build`
Expected: `tsc && vite build` completes with exit code 0.

- [ ] **Step 3: Commit any final polishing**

```bash
git commit --allow-empty -m "chore: verify build and all unit tests for intake photo evidence"
```
