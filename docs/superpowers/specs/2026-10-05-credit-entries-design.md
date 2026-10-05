# Credit (Udhar) Entries Design Specification

**Date:** 2026-10-05  
**Status:** Approved  
**Topic:** Adding Credit/Udhar Entries to Daily Book and Reports without disrupting the current UI

---

## 1. Overview & Goals

Shop owners frequently deliver products or repair services on credit (*Udhar*), expecting payment later. The current Daily Book is strictly cash/inflow/outflow oriented with payment methods `cash`, `upi`, and `card`.

### Goals
1. Allow recording credit sales directly in the existing Daily Book flow with **zero extra steps** for standard cash/UPI entries.
2. Maintain the Daily Book's clean iOS aesthetics and speed: no extra screen tabs or cluttered forms.
3. Keep financial calculations clear: credit is counted in total daily sales, but distinguished in breakdown pills so physical cash drawers match actual money collected.
4. Provide a seamless 1-tap settlement action ("Mark as Paid") to resolve credit entries to Cash or UPI when repaid.
5. Track credit in the Reports screen and in share/export summaries.

---

## 2. Data Model & Calculations

### 2.1 Types (`src/types/index.ts`)
Update `PaymentMethod`:
```typescript
export type PaymentMethod = 'cash' | 'upi' | 'card' | 'credit';
```

Update `DaySummary`:
```typescript
export interface DaySummary {
  inTotal: number;
  outTotal: number;
  net: number;
  inCount: number;
  cashTotal: number;
  upiTotal: number;
  cardTotal: number;
  creditTotal: number;
}
```

### 2.2 Database & Summary Calculation (`src/db/db.ts`)
- In `computeSummary(entries: Entry[])`:
  - When `entry.type === 'in'`:
    - `inTotal += amt`
    - `inCount += 1`
    - If `entry.paymentMethod === 'credit'`: `creditTotal += amt`
    - Else if `entry.paymentMethod === 'upi'`: `upiTotal += amt`
    - Else if `entry.paymentMethod === 'card'`: `cardTotal += amt`
    - Else: `cashTotal += amt`
  - `net` is calculated as `inTotal - outTotal`.
- Firestore sync & IndexedDB: No schema migration required since `'credit'` is an additional valid string value in existing fields.

---

## 3. Daily Book UI Specifications

### 3.1 Add / Edit Sheet (`src/screens/AddEditSheet.tsx`)
1. **Payment Method Segmented Control**:
   - Add `credit` as the 4th option:
     - `Cash` | `UPI` | `Card` | `Credit`
2. **Customer Name Requirement**:
   - If `type === 'in'` and `paymentMethod === 'credit'`:
     - Highlight the Customer Name label: `Customer Name *`
     - Validated on submit: if empty, display inline error `"Customer name is required for credit entries"`.
3. **Defaults & Existing Flows**:
   - Default payment method remains `'cash'`.
   - Expenses (`type === 'out'`) remain unchanged.

### 3.2 Summary Card (`src/components/SummaryCard.tsx`)
1. **Top Metrics (IN / OUT / NET)**:
   - Untouched layout. `IN` includes credit sales, `OUT` reflects expenses, and `NET` shows overall balance.
2. **Breakdown Row**:
   - Shows `Cash: ₹...`, `UPI: ₹...`, `Card: ₹...`.
   - **Conditional Amber Pill**: If `summary.creditTotal > 0`, append:
     - Badge: `Credit: ₹{summary.creditTotal}` with `bg-amber-50 text-amber-800 border border-amber-200/60 font-semibold`.
     - On days with 0 credit, the pill is not rendered, leaving the card identical to its existing design.

### 3.3 Entry List & Quick Settlement (`src/components/EntryList.tsx`)
1. **Credit Row Styling**:
   - For entries with `paymentMethod === 'credit'`:
     - Badge: `<span className="text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider bg-amber-50 text-amber-800 border border-amber-200/80">CREDIT</span>`
     - Subtle "Udhar" indicator near amount or subtitle.
2. **Quick "Mark as Paid" Settlement**:
   - In the entry row or swipe actions, credit entries display a quick "Mark Paid" button/action.
   - Tapping it opens a compact modal/action menu:
     - "Mark as Paid via:"
     - [ Cash ] [ UPI ]
   - Selecting a method updates `db.entries.update(entry.id, { paymentMethod: selectedMethod, updatedAt: new Date().toISOString(), syncStatus: 'pending' })`.
   - The UI reactively updates via `useLiveQuery` without page reload.

---

## 4. Reports & Analytics Screen (`src/screens/ReportsScreen.tsx`)

1. **Payment Breakdown Card**:
   - Expand the breakdown grid from 3 columns to 4 columns (or responsive 2x2 grid):
     - `Cash` | `UPI` | `Card` | `Credit` (Amber styled box).
2. **Share Summary (`src/utils/share.ts`)**:
   - Include `creditTotal` in `buildShareSummaryText` when `creditTotal > 0`:
     - `Cash ₹X | UPI ₹Y | Card ₹Z | Credit ₹W`
3. **CSV Export (`src/utils/csv.ts`)**:
   - Automatically outputs `CREDIT` under the `Payment Method` column.

---

## 5. Testing & Verification Plan

1. **Unit / Calculation Tests**:
   - Test `computeSummary` with entries containing `credit` payment method.
   - Verify `creditTotal` accumulates accurately and does not bleed into `cashTotal`.
2. **Component Tests**:
   - Verify `AddEditSheet` validation blocks saving credit entry without a customer name.
   - Verify selecting `Credit` persists correctly into IndexedDB.
   - Verify `SummaryCard` displays the amber Credit pill only when `creditTotal > 0`.
   - Verify 1-tap settlement correctly transitions entry from `credit` to `cash` or `upi`.
3. **Reports & Exports**:
   - Verify monthly calculations in `ReportsScreen` display credit breakdown accurately.
   - Verify CSV export and WhatsApp share string generation include credit.
