# Project Guidelines

## Git & Deployment Constraints
- **CRITICAL**: Do **NOT** push to Git (`git push`) or deploy to Vercel (`vercel` / `vercel --prod`) unless explicitly instructed by the user in that prompt.
- Local commits and local testing/build verification are allowed when completing tasks, but remote push and external deployments must always wait for explicit user confirmation.

## Mobile UI & State Invariants
- **Modal Portaling & Bottom Navigation Clearance**:
  - Full-screen or bottom-anchored modal sheets must use `createPortal(..., document.body)` with `z-50` or higher so they are not constrained by parent stacking contexts.
  - Action/submit buttons in modal footers must include bottom safe-area padding: `pb-[calc(env(safe-area-inset-bottom)+20px)] sm:pb-5` to avoid occlusion by the fixed bottom `TabBar` (`z-40`) and mobile home bars.
- **Tab Navigation Shells**:
  - Main view screens should be conditioned directly on the active tab (e.g. `currentTab === 'stock'`) without fragile multi-condition gates that cause blank screen regressions.
- **Dexie.js Mutations & SyncMetadata**:
  - Collection modifications must use callback-style mutations `(record) => { ... }`.
  - For models with `SyncMetadata`, always supply ISO 8601 strings (`new Date().toISOString()`) for `updatedAt`.
- **Deduplication & Double-Submit Protection**:
  - All modal/sheet submission forms (including `AddItemBottomSheet`, `AddEditSheet`, `AddEditStockSheet`, `AddEditJobSheet`, `DeliverySheet`, `BillSheet`) must enforce a synchronous `isSubmittingRef = useRef(false)` mutex (`if (isSubmittingRef.current || loading) return; isSubmittingRef.current = true;`) to prevent dual entries caused by rapid double-taps or duplicate enter/click submissions.
  - In master spares & devices catalog (`masterSpares.ts`, `SparesScreen.tsx`), never blindly concatenate or unshift items into arrays without ID-based deduplication (`deduplicateById` / `filter((item) => item.id !== newId)`). All fetches combining private Firestore records with base catalog seeds must pass through `deduplicateById` so identical IDs can never visually or logically duplicate.
- **Single Plus Icon / Clean Button Labels**:
  - Action buttons that contain a plus icon (`<Plus ... />`) must NEVER include a literal `+` in their text label (e.g. use `<span>Add Item</span>`, `<span>Add Client</span>`, NEVER `<span>+ Add Item</span>` or `<span>+ Add Client</span>`). Buttons must never display duplicate pluses (`+ +`).

