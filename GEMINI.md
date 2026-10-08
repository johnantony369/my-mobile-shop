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
