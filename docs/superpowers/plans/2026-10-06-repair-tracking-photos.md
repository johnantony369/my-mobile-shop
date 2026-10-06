# Repair Progress Tracking Photos & UI Refinements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:**
1. Update copy in the customer repair tracking screen:
   - "Balance Due on Pickup" -> "Amount To Pay"
   - Step 4 delivery message -> "Thank you for choosing us"
2. Enable photo evidence capturing and display:
   - Intake photo capture on `AddEditJobSheet` (stored locally in Dexie `jobPhotos` with `tag: 'intake'`).
   - "Mark as Ready" prompt modal in `JobDetailSheet`: "Mark as Ready: Take photo of repaired phone? [Skip / Mark Ready] [Take Photo]".
   - Direct "Take Photo" button above other status actions when a job is marked ready.
   - Sync sanitized photo thumbnails/URLs in `PublicRepairTrack` to `/public_repairs/{cloudId}`.
   - Display intake & ready photos in `TrackRepairScreen` (`/track/:trackingId`) with full-screen zoom inspection via `PhotoViewerModal`.

**Architecture:**
- IndexedDB table `jobPhotos` holds client photos (compressed JPEGs via `compressImageFile`).
- `JobPhoto` type extended with optional `tag?: 'intake' | 'ready'`.
- `PublicRepairTrack` extended with `photos?: Array<{ photoId: string; dataUrl?: string; downloadUrl?: string; label?: string; tag?: 'intake' | 'ready'; createdAt: number }>`.
- `JobDetailSheet` displays a confirmation modal on "Mark as Ready" offering "[Skip / Mark Ready]" or "[Take Photo]", and if already ready, a dedicated "Take Photo" button above other status buttons.
- `TrackRepairScreen` displays "Device Condition Photos" and "Repaired Photos" sections with tap-to-zoom preview modal.

**Tech Stack:** React 18, TypeScript 5, Dexie 4, Firebase Firestore, Lucide React, Vitest.

---

### Task 1: Tracking Text Refinements & Types Updates

**Files:**
- Modify: `src/types/index.ts`
- Modify: `src/screens/TrackRepairScreen.tsx`
- Modify: `tests/trackRepair.test.ts`

- [ ] **Step 1: Write/update tests for new tracking copy and photo types**
  - Verify "Amount To Pay" renders instead of "Balance Due on Pickup".
  - Verify "Thank you for choosing us" renders in Step 4 description.
  - Verify `PublicRepairTrack` accepts optional `photos` array.

- [ ] **Step 2: Run test to verify it fails on old assertions**
  - Run `npm test -- tests/trackRepair.test.ts`

- [ ] **Step 3: Update `src/types/index.ts` and `src/screens/TrackRepairScreen.tsx`**
  - Extend `JobPhoto` with `tag?: 'intake' | 'ready'`.
  - Extend `PublicRepairTrack` with `photos?: Array<{ photoId: string; dataUrl?: string; downloadUrl?: string; label?: string; tag?: 'intake' | 'ready'; createdAt: number }>`.
  - Update `TrackRepairScreen.tsx` line with "Amount To Pay".
  - Update Step 4 description: "Thank you for choosing us".

- [ ] **Step 4: Run test to verify it passes**
  - Run `npm test -- tests/trackRepair.test.ts`

---

### Task 2: Intake Photo Capture in `AddEditJobSheet`

**Files:**
- Modify: `src/screens/AddEditJobSheet.tsx`
- Test: `tests/addEditJobPhotos.test.tsx`

- [ ] **Step 1: Write tests for intake photo capturing and local Dexie persistence**
  - Verify selecting an image compresses and creates a thumbnail.
  - Verify saving job saves photos with `tag: 'intake'`.

- [ ] **Step 2: Run test to confirm it fails**
  - Run `npm test -- tests/addEditJobPhotos.test.tsx`

- [ ] **Step 3: Implement intake photos in `AddEditJobSheet.tsx`**
  - Add camera/file input for intake photos (up to 4).
  - Compress using `compressImageFile`.
  - On save, invoke `saveJobPhotos(savedJob.cloudId, photos)`.

- [ ] **Step 4: Run test to verify it passes**
  - Run `npm test -- tests/addEditJobPhotos.test.tsx`

---

### Task 3: Mark Ready Photo Prompt & Ready Photo Capture in `JobDetailSheet`

**Files:**
- Modify: `src/screens/JobDetailSheet.tsx`
- Test: `tests/jobDetailPhotos.test.tsx`

- [ ] **Step 1: Write test for Mark Ready prompt and Ready photo capture**
  - Verify clicking "Ready for Pickup" opens modal: "Mark as Ready: Take photo of repaired phone? [Skip / Mark Ready] [Take Photo]".
  - Verify clicking "[Skip / Mark Ready]" marks job ready without taking photo.
  - Verify clicking "[Take Photo]" triggers camera/file upload, compresses photo, saves with `tag: 'ready'`, and marks job ready.
  - Verify when job is in `ready` status, a dedicated "Take Photo" button is visible above the "Other Status" button.

- [ ] **Step 2: Run test to confirm failure**
  - Run `npm test -- tests/jobDetailPhotos.test.tsx`

- [ ] **Step 3: Implement Ready prompt modal and button in `JobDetailSheet.tsx`**
  - Modal with custom prompt and buttons.
  - Hidden file input ref for ready photo capture.
  - Dedicated "Take Photo" button when `job.status === 'ready'`.
  - Save to Dexie via `saveJobPhotos` with `tag: 'ready'`.

- [ ] **Step 4: Run test to verify it passes**
  - Run `npm test -- tests/jobDetailPhotos.test.tsx`

---

### Task 4: Public Tracking Sync & Photo Viewing on Tracking Screen

**Files:**
- Modify: `src/firebase/sync.ts`
- Modify: `src/screens/TrackRepairScreen.tsx`
- Test: `tests/trackRepairPhotos.test.tsx`

- [ ] **Step 1: Write test for sync and display of intake & ready photos on tracking screen**
  - Test `buildPublicRepairTrack` includes photos attached to the job.
  - Test `TrackRepairView` renders Intake photos and Ready photos sections.
  - Test clicking photo thumbnail in `TrackRepairView` opens `PhotoViewerModal`.

- [ ] **Step 2: Run test to verify failure**
  - Run `npm test -- tests/trackRepairPhotos.test.tsx`

- [ ] **Step 3: Implement public photos sync & rendering**
  - In `src/firebase/sync.ts`, include job photos when publishing to `/public_repairs/{cloudId}`.
  - In `TrackRepairScreen.tsx`, render "Device Photos" grid separating "Intake Condition" and "Repaired Device".
  - Integrate `PhotoViewerModal` for tap-to-zoom modal view.

- [ ] **Step 4: Run test to verify it passes**
  - Run `npm test -- tests/trackRepairPhotos.test.tsx`

---

### Task 5: Full Suite Verification & Build

- [ ] Run full test suite: `npm test`
- [ ] Run production build: `npm run build`
- [ ] Git commit changes
