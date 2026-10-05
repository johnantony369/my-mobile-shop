# Credit (Udhar) Entries Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enable recording, displaying, settling, and reporting credit (*Udhar*) entries in the Daily Book and Reports without altering the speed, layout, or clean iOS aesthetics of the app.

**Architecture:** Extend the `PaymentMethod` union to include `'credit'`. Update `computeSummary()` to calculate `creditTotal` and include credit in total daily sales while keeping physical cash/bank drawer metrics distinct. Add a 'Credit' option to the payment segmented control with mandatory customer name validation. Render an adaptive amber pill on `SummaryCard` when credit is present, style credit rows with a distinct amber badge and a 1-tap "Mark as Paid" settlement flow in `EntryList`, and update `ReportsScreen` to show a 4th payment breakdown box for Credit.

**Tech Stack:** React 18, TypeScript, Dexie.js (IndexedDB), Tailwind CSS, Vitest, Lucide React.

**Spec:** [`docs/superpowers/specs/2026-10-05-credit-entries-design.md`](file:///f:/My%20Mobile%20Shop/docs/superpowers/specs/2026-10-05-credit-entries-design.md)

## Global Constraints
- `PaymentMethod` type: `'cash' | 'upi' | 'card' | 'credit'`
- Credit sales count in `inTotal` (total sales revenue) and `net` (`inTotal - outTotal`)
- `creditTotal` is tracked separately from `cashTotal`, `upiTotal`, and `cardTotal`
- Customer name is strictly required when `paymentMethod === 'credit'`
- Summary Card amber credit pill is shown ONLY when `creditTotal > 0`
- Existing test suite (145 tests) must remain 100% green at every task boundary

## Review Focus
1. `entry.paymentMethod === 'credit'` does not leak into `cashTotal`, `upiTotal`, or `cardTotal` in `computeSummary()`.
2. Saving a credit entry without a customer name in `AddEditSheet` is blocked with an explicit error message.
3. Days with zero credit entries render the exact same 3-pill Summary Card layout without layout shifts or empty badges.
4. Tapping "Mark as Paid" on a credit entry updates its payment method to Cash or UPI, sets `updatedAt`, and marks `syncStatus: 'pending'`.
5. `ReportsScreen` correctly computes monthly credit totals and displays the amber Credit box alongside Cash, UPI, and Card.

---

### Task 1: Core Types, Summary Calculations & Utilities

**Files:**
- Modify: `src/types/index.ts:1-70`
- Modify: `src/db/db.ts:340-375`
- Modify: `src/utils/share.ts:1-49`
- Modify: `src/utils/csv.ts:1-30`
- Test: `tests/creditCalculations.test.ts`

**Interfaces:**
- Consumes: `Entry`, `DaySummary`
- Produces:
  ```typescript
  export type PaymentMethod = 'cash' | 'upi' | 'card' | 'credit';
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

- [ ] **Step 1: Write failing calculation test**

Create `tests/creditCalculations.test.ts`:
```typescript
import { describe, it, expect } from 'vitest';
import { computeSummary } from '../src/db/db';
import { Entry } from '../src/types';
import { buildShareSummaryText } from '../src/utils/share';

describe('Credit Entries Calculations', () => {
  it('computes summary with credit entries correctly', () => {
    const entries: Entry[] = [
      {
        id: 1,
        type: 'in',
        amount: 500,
        paymentMethod: 'cash',
        date: '2026-10-05',
        createdAt: Date.now(),
      },
      {
        id: 2,
        type: 'in',
        amount: 1000,
        paymentMethod: 'upi',
        date: '2026-10-05',
        createdAt: Date.now(),
      },
      {
        id: 3,
        type: 'in',
        amount: 1500,
        paymentMethod: 'credit',
        customerName: 'Rahul Kumar',
        date: '2026-10-05',
        createdAt: Date.now(),
      },
      {
        id: 4,
        type: 'out',
        amount: 200,
        date: '2026-10-05',
        createdAt: Date.now(),
      },
    ];

    const summary = computeSummary(entries);

    expect(summary.inTotal).toBe(3000);
    expect(summary.outTotal).toBe(200);
    expect(summary.net).toBe(2800);
    expect(summary.cashTotal).toBe(500);
    expect(summary.upiTotal).toBe(1000);
    expect(summary.cardTotal).toBe(0);
    expect(summary.creditTotal).toBe(1500);
  });

  it('includes credit in share text when creditTotal > 0', () => {
    const text = buildShareSummaryText({
      shopName: 'Test Shop',
      dateStr: '5 Oct 2026',
      inTotal: 3000,
      inCount: 3,
      outTotal: 200,
      net: 2800,
      cashTotal: 500,
      upiTotal: 1000,
      cardTotal: 0,
      creditTotal: 1500,
    });

    expect(text).toContain('Credit ₹1,500');
  });

  it('omits credit from share text when creditTotal is 0', () => {
    const text = buildShareSummaryText({
      shopName: 'Test Shop',
      dateStr: '5 Oct 2026',
      inTotal: 1500,
      inCount: 2,
      outTotal: 200,
      net: 1300,
      cashTotal: 500,
      upiTotal: 1000,
      cardTotal: 0,
      creditTotal: 0,
    });

    expect(text).not.toContain('Credit');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/creditCalculations.test.ts`
Expected: FAIL due to missing `creditTotal` on `DaySummary` or in `computeSummary`.

- [ ] **Step 3: Update types, db, share, and csv utilities**

Update `src/types/index.ts`:
```typescript
export type PaymentMethod = 'cash' | 'upi' | 'card' | 'credit';

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

Update `computeSummary` in `src/db/db.ts`:
```typescript
export function computeSummary(entries: Entry[]): DaySummary {
  let inTotal = 0;
  let outTotal = 0;
  let inCount = 0;
  let cashTotal = 0;
  let upiTotal = 0;
  let cardTotal = 0;
  let creditTotal = 0;

  for (const entry of entries) {
    const amt = Number(entry.amount) || 0;
    if (entry.type === 'in') {
      inTotal += amt;
      inCount += 1;
      if (entry.paymentMethod === 'cash') cashTotal += amt;
      else if (entry.paymentMethod === 'upi') upiTotal += amt;
      else if (entry.paymentMethod === 'card') cardTotal += amt;
      else if (entry.paymentMethod === 'credit') creditTotal += amt;
      else cashTotal += amt;
    } else {
      outTotal += amt;
    }
  }

  return {
    inTotal,
    outTotal,
    net: inTotal - outTotal,
    inCount,
    cashTotal,
    upiTotal,
    cardTotal,
    creditTotal,
  };
}
```

Update `src/utils/share.ts`:
```typescript
export interface ShareDataInput {
  shopName: string;
  dateStr: string;
  inTotal: number;
  inCount: number;
  outTotal: number;
  net: number;
  cashTotal: number;
  upiTotal: number;
  cardTotal: number;
  creditTotal?: number;
}

export function buildShareSummaryText(data: ShareDataInput): string {
  const shop = data.shopName.trim() || 'My Mobile Shop';
  const creditPart = data.creditTotal && data.creditTotal > 0 ? ` | Credit ${formatINR(data.creditTotal)}` : '';
  return (
    `Summary — ${shop}\n` +
    `${data.dateStr}\n` +
    `Sales: ${formatINR(data.inTotal)} (${data.inCount} items)\n` +
    `Expenses: ${formatINR(data.outTotal)}\n` +
    `Net: ${formatINR(data.net)}\n` +
    `Cash ${formatINR(data.cashTotal)} | UPI ${formatINR(data.upiTotal)} | Card ${formatINR(data.cardTotal)}${creditPart}`
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/creditCalculations.test.ts`
Expected: PASS

- [ ] **Step 5: Run full test suite to ensure zero regressions**

Run: `npm test`
Expected: All 28 test suites passing.

- [ ] **Step 6: Commit**

```bash
git add src/types/index.ts src/db/db.ts src/utils/share.ts tests/creditCalculations.test.ts
git commit -m "feat: add credit payment method, creditTotal calculation, and share formatting"
```

---

### Task 2: AddEditSheet with Credit Toggle & Customer Name Validation

**Files:**
- Modify: `src/screens/AddEditSheet.tsx:240-275, 120-170, 380-395`
- Test: `tests/creditAddEditSheet.test.ts`

**Interfaces:**
- Consumes: `PaymentMethod = 'cash' | 'upi' | 'card' | 'credit'`
- Produces: Form validation ensuring `customerName` is non-empty when `paymentMethod === 'credit'`.

- [ ] **Step 1: Write component validation test**

Create `tests/creditAddEditSheet.test.ts`:
```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import { db } from '../src/db/db';

describe('Credit Entry Validation and Persistence', () => {
  beforeEach(async () => {
    await db.entries.clear();
  });

  it('saves entry with credit payment method and customer name', async () => {
    const id = await db.entries.add({
      type: 'in',
      amount: 1200,
      paymentMethod: 'credit',
      customerName: 'Anil Sharma',
      item: 'Display combo',
      date: '2026-10-05',
      createdAt: Date.now(),
    });

    const saved = await db.entries.get(id);
    expect(saved).toBeDefined();
    expect(saved?.paymentMethod).toBe('credit');
    expect(saved?.customerName).toBe('Anil Sharma');
    expect(saved?.amount).toBe(1200);
  });
});
```

- [ ] **Step 2: Run test to verify initial persistence works**

Run: `npx vitest run tests/creditAddEditSheet.test.ts`
Expected: PASS

- [ ] **Step 3: Update `src/screens/AddEditSheet.tsx`**

1. In `AddEditSheet.tsx` payment method SegmentedControl options:
```tsx
<SegmentedControl<PaymentMethod>
  value={paymentMethod}
  onChange={(val) => setPaymentMethod(val)}
  size="sm"
  options={[
    { value: 'cash', label: t('cash', language) },
    { value: 'upi', label: t('upi', language) },
    { value: 'card', label: t('card', language) },
    { value: 'credit', label: 'Credit' },
  ]}
/>
```

2. In `handleSave` in `AddEditSheet.tsx`, add validation:
```tsx
if (type === 'in' && paymentMethod === 'credit' && !customerName.trim()) {
  setError('Customer name is required for credit entries');
  isSubmittingRef.current = false;
  setIsSubmitting(false);
  return;
}
```

3. Update the Customer Name label to display an asterisk when Credit is selected:
```tsx
<label className="text-xs font-medium text-[#8E8E93] ml-1">
  {t('customer_label', language)}
  {type === 'in' && paymentMethod === 'credit' && (
    <span className="text-amber-600 font-bold ml-1">* (Required for Credit)</span>
  )}
</label>
```

- [ ] **Step 4: Verify build and test suite**

Run: `npm run build && npm test`
Expected: TypeScript compilation successful and all tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/screens/AddEditSheet.tsx tests/creditAddEditSheet.test.ts
git commit -m "feat: add credit option to payment method toggle with required customer name validation"
```

---

### Task 3: SummaryCard Adaptive Amber Credit Pill

**Files:**
- Modify: `src/components/SummaryCard.tsx:85-115`
- Test: `tests/creditSummaryCard.test.ts`

**Interfaces:**
- Consumes: `summary.creditTotal`
- Produces: Adaptive amber pill rendered only when `creditTotal > 0`.

- [ ] **Step 1: Write test for SummaryCard pill presence**

Create `tests/creditSummaryCard.test.ts`:
```typescript
import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { SummaryCard } from '../src/components/SummaryCard';
import { DaySummary } from '../src/types';

describe('SummaryCard Credit Pill', () => {
  it('renders credit pill when creditTotal > 0', () => {
    const summary: DaySummary = {
      inTotal: 2500,
      outTotal: 500,
      net: 2000,
      inCount: 2,
      cashTotal: 1000,
      upiTotal: 500,
      cardTotal: 0,
      creditTotal: 1000,
    };

    const html = renderToString(
      React.createElement(SummaryCard, {
        summary,
        dateDisplay: '5 Oct 2026',
        shopName: 'Test Shop',
        language: 'en',
      })
    );

    expect(html).toContain('Credit:');
    expect(html).toContain('1,000');
  });

  it('does not render credit pill when creditTotal === 0', () => {
    const summary: DaySummary = {
      inTotal: 1500,
      outTotal: 500,
      net: 1000,
      inCount: 2,
      cashTotal: 1000,
      upiTotal: 500,
      cardTotal: 0,
      creditTotal: 0,
    };

    const html = renderToString(
      React.createElement(SummaryCard, {
        summary,
        dateDisplay: '5 Oct 2026',
        shopName: 'Test Shop',
        language: 'en',
      })
    );

    expect(html).not.toContain('Credit:');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/creditSummaryCard.test.ts`
Expected: FAIL because `Credit:` is not yet in `SummaryCard`.

- [ ] **Step 3: Update `src/components/SummaryCard.tsx`**

In `src/components/SummaryCard.tsx` lines 86-98:
```tsx
{/* Cash / UPI / Card / Credit breakdown row */}
<div className="mt-3 flex items-center justify-between text-xs">
  <div className="flex flex-wrap items-center gap-1.5 text-[12px] text-[#8E8E93]">
    <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-gray-100 font-medium">
      Cash: <strong className="ml-1 text-black font-bold">{formatINR(summary.cashTotal)}</strong>
    </span>
    <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-blue-50 text-iosBlue font-medium">
      UPI: <strong className="ml-1 font-bold">{formatINR(summary.upiTotal)}</strong>
    </span>
    <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-purple-50 text-purple-600 font-medium">
      Card: <strong className="ml-1 font-bold">{formatINR(summary.cardTotal)}</strong>
    </span>
    {summary.creditTotal > 0 && (
      <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200/80 font-medium">
        Credit: <strong className="ml-1 font-bold">{formatINR(summary.creditTotal)}</strong>
      </span>
    )}
  </div>
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/creditSummaryCard.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/SummaryCard.tsx tests/creditSummaryCard.test.ts
git commit -m "feat: render adaptive amber credit pill in SummaryCard when creditTotal > 0"
```

---

### Task 4: EntryList Credit Badge & 1-Tap "Mark as Paid" Settlement

**Files:**
- Modify: `src/components/EntryList.tsx:85-140`
- Test: `tests/creditEntryList.test.ts`

**Interfaces:**
- Consumes: `entry.paymentMethod === 'credit'`, Dexie `db.entries.update`
- Produces: Amber badge for credit entries, and a 1-tap "Mark Paid" modal/action allowing the user to select Cash or UPI to settle the debt.

- [ ] **Step 1: Write test for EntryList credit rendering & settlement**

Create `tests/creditEntryList.test.ts`:
```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { EntryList } from '../src/components/EntryList';
import { Entry } from '../src/types';
import { db } from '../src/db/db';

describe('EntryList Credit Badge and Settlement', () => {
  beforeEach(async () => {
    await db.entries.clear();
  });

  it('renders credit badge and customer name for credit entry', () => {
    const entries: Entry[] = [
      {
        id: 1,
        type: 'in',
        amount: 800,
        paymentMethod: 'credit',
        customerName: 'Priya Verma',
        item: 'Earphones',
        date: '2026-10-05',
        createdAt: Date.now(),
      },
    ];

    const html = renderToString(
      React.createElement(EntryList, {
        entries,
        isToday: true,
        language: 'en',
        onEdit: () => {},
        onDelete: () => {},
        onAddClick: () => {},
      })
    );

    expect(html).toContain('CREDIT');
    expect(html).toContain('Priya Verma');
  });

  it('updates entry from credit to cash or upi when settled', async () => {
    const id = await db.entries.add({
      type: 'in',
      amount: 1500,
      paymentMethod: 'credit',
      customerName: 'Karan',
      date: '2026-10-05',
      createdAt: Date.now(),
    });

    const now = new Date().toISOString();
    await db.entries.update(id, {
      paymentMethod: 'cash',
      updatedAt: now,
      syncStatus: 'pending',
    });

    const updated = await db.entries.get(id);
    expect(updated?.paymentMethod).toBe('cash');
    expect(updated?.updatedAt).toBe(now);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/creditEntryList.test.ts`
Expected: FAIL because `CREDIT` badge is not yet in `EntryList`.

- [ ] **Step 3: Update `src/components/EntryList.tsx`**

1. In badge rendering (around lines 94-105):
```tsx
<span
  className={`text-[10px] font-semibold px-1.5 py-0.5 rounded uppercase tracking-wider ${
    entry.paymentMethod === 'credit'
      ? 'bg-amber-50 text-amber-800 border border-amber-200/80 font-bold'
      : entry.paymentMethod === 'upi'
      ? 'bg-blue-50 text-iosBlue'
      : entry.paymentMethod === 'card'
      ? 'bg-purple-50 text-purple-600'
      : 'bg-gray-100 text-[#8E8E93]'
  }`}
>
  {entry.paymentMethod || 'cash'}
</span>
```

2. Add a quick settlement action for credit entries in `EntryList.tsx`:
Add state `const [settleEntry, setSettleEntry] = useState<Entry | null>(null);`
In the entry row, if `entry.paymentMethod === 'credit'`, show a small pill button:
```tsx
<button
  type="button"
  onClick={(e) => {
    e.stopPropagation();
    setSettleEntry(entry);
  }}
  className="ml-1.5 px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-100/80 text-amber-900 border border-amber-300 hover:bg-amber-200 active:scale-95 transition-all"
>
  Mark Paid
</button>
```

3. Render a settlement dialog/modal when `settleEntry` is not null:
Options to select `Cash` or `UPI`:
```tsx
const handleSettle = async (method: 'cash' | 'upi') => {
  if (settleEntry && settleEntry.id) {
    const now = new Date().toISOString();
    await db.entries.update(settleEntry.id, {
      paymentMethod: method,
      updatedAt: now,
      syncStatus: 'pending',
    });
    setSettleEntry(null);
  }
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/creditEntryList.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/EntryList.tsx tests/creditEntryList.test.ts
git commit -m "feat: add credit badge and 1-tap mark as paid settlement to EntryList"
```

---

### Task 5: Reports Screen Credit Breakdown & Exports

**Files:**
- Modify: `src/screens/ReportsScreen.tsx:280-305`
- Test: `tests/creditReports.test.ts`

**Interfaces:**
- Consumes: `summary.creditTotal`
- Produces: 4-box payment breakdown grid in `ReportsScreen` showing `Credit: ₹X`.

- [ ] **Step 1: Write test for ReportsScreen payment breakdown**

Create `tests/creditReports.test.ts`:
```typescript
import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { ReportsScreen } from '../src/screens/ReportsScreen';

describe('ReportsScreen Credit Tracking', () => {
  it('renders payment breakdown containing Credit', () => {
    const html = renderToString(
      React.createElement(ReportsScreen, {
        language: 'en',
        shopName: 'Test Shop',
      })
    );

    expect(html).toContain('Credit');
    expect(html).toContain('Cash');
    expect(html).toContain('UPI');
    expect(html).toContain('Card');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/creditReports.test.ts`
Expected: FAIL because `ReportsScreen` does not yet render a Credit box in payment breakdown.

- [ ] **Step 3: Update `src/screens/ReportsScreen.tsx`**

In `src/screens/ReportsScreen.tsx` lines 280-304:
Update grid from `grid grid-cols-3 gap-2` to `grid grid-cols-2 sm:grid-cols-4 gap-2`:
```tsx
<div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
  <div className="bg-gray-50 rounded-[10px] p-2.5 text-center">
    <span className="text-xs font-medium text-[#8E8E93] block">Cash</span>
    <span className="text-[15px] font-bold text-black mt-0.5 block">
      {formatINR(summary.cashTotal)}
    </span>
  </div>
  <div className="bg-blue-50/70 rounded-[10px] p-2.5 text-center">
    <span className="text-xs font-medium text-iosBlue block">UPI</span>
    <span className="text-[15px] font-bold text-iosBlue mt-0.5 block">
      {formatINR(summary.upiTotal)}
    </span>
  </div>
  <div className="bg-purple-50/70 rounded-[10px] p-2.5 text-center">
    <span className="text-xs font-medium text-purple-600 block">Card</span>
    <span className="text-[15px] font-bold text-purple-700 mt-0.5 block">
      {formatINR(summary.cardTotal)}
    </span>
  </div>
  <div className="bg-amber-50/70 rounded-[10px] p-2.5 text-center border border-amber-200/50">
    <span className="text-xs font-medium text-amber-800 block">Credit</span>
    <span className="text-[15px] font-bold text-amber-900 mt-0.5 block">
      {formatINR(summary.creditTotal)}
    </span>
  </div>
</div>
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/creditReports.test.ts`
Expected: PASS

- [ ] **Step 5: Run full project verification**

Run: `npm test && npm run build`
Expected: All tests pass, build succeeds with zero errors.

- [ ] **Step 6: Commit**

```bash
git add src/screens/ReportsScreen.tsx tests/creditReports.test.ts
git commit -m "feat: add credit breakdown box to ReportsScreen"
```
