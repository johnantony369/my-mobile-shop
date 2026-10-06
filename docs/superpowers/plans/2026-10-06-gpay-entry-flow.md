# GPay-Style Entry Flow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform the Day Book new entry flow in `AddEditSheet.tsx` into a Google Pay (GPay) progressive disclosure pattern where the user first enters the amount with a big number and forward arrow (`→`), then proceeds to the remaining balance form with a return chip (`←`).

**Architecture:** Add a `step` state (`'amount' | 'details'`) in `AddEditSheet.tsx`. Step 1 renders the In/Out toggle, giant amount input (`text-5xl font-extrabold`), and forward arrow button. Step 2 renders a back arrow and amount chip (`← ₹[amount] · In`) alongside the remaining fields (payment method, item/stock, note, date, customer name, save button). Editing existing transactions starts directly in `details`.

**Tech Stack:** React, TypeScript, Tailwind CSS, Lucide icons, Vitest.

**Spec:** `docs/superpowers/specs/2026-10-06-gpay-entry-flow-design.md`

## Global Constraints
- New entries start in `step: 'amount'`.
- Editing an existing entry (`entryToEdit !== null`) starts directly in `step: 'details'`.
- Forward arrow is disabled when amount is empty, 0, or invalid.
- Pressing `Enter` on the amount input in Step 1 advances to Step 2 if amount > 0.
- All existing features (Stock Picker, Bill Generation, Credit validation, double-submit protection) must remain 100% operational.

## Review Focus
1. Returning from Step 2 to Step 1 and then back to Step 2 must never clear previously filled note, item name, or payment method.
2. Editing existing entries must have amount clearly visible and editable without getting stuck in Step 1.
3. Mobile numeric keypad (`inputMode="decimal"`) must open cleanly on Step 1 mount.
4. Fast clicking of the forward arrow button must not cause React render loops or invalid state.
5. Saving directly from Step 2 with default Cash payment method must work in one tap.

---

### Task 1: Write Contract & Flow Tests in `tests/addEditSheetGPayFlow.test.ts`

**Files:**
- Create: `tests/addEditSheetGPayFlow.test.ts`

**Interfaces:**
- Consumes: `src/screens/AddEditSheet.tsx`
- Tests:
  - Step 1 UI elements: giant amount input, forward arrow button `(→)`, In/Out toggle.
  - Forward arrow enabled only when amount > 0.
  - Step 2 UI elements: back arrow button `(←)`, amount chip, balance form fields.
  - Edit mode initialization into details step.

- [ ] **Step 1: Write tests in `tests/addEditSheetGPayFlow.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('AddEditSheet GPay UX Flow Contract', () => {
  const sheetPath = path.resolve(__dirname, '../src/screens/AddEditSheet.tsx');
  const sheetContent = fs.readFileSync(sheetPath, 'utf-8');

  it('declares step state with amount and details steps', () => {
    expect(sheetContent).toMatch(/step.*['"]amount['"]|['"]details['"]/);
  });

  it('renders forward arrow button leading to balance form', () => {
    expect(sheetContent).toContain('ArrowRight');
  });

  it('renders back arrow and amount chip on Step 2', () => {
    expect(sheetContent).toContain('ArrowLeft');
  });

  it('initializes edit mode directly in details step', () => {
    expect(sheetContent).toMatch(/entryToEdit\s*\?\s*['"]details['"]\s*:\s*['"]amount['"]/);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/addEditSheetGPayFlow.test.ts`
Expected: FAIL (missing `ArrowRight`, `step` state)

- [ ] **Step 3: Commit test file**

Run: `git add tests/addEditSheetGPayFlow.test.ts ; git commit -m "test: add contract tests for GPay entry flow"`

---

### Task 2: Implement GPay Progressive Disclosure in `src/screens/AddEditSheet.tsx`

**Files:**
- Modify: `src/screens/AddEditSheet.tsx`
- Import: `ArrowRight`, `ArrowLeft` from `lucide-react`

**Interfaces:**
- State: `const [step, setStep] = useState<'amount' | 'details'>(entryToEdit ? 'details' : 'amount');`
- Transitions:
  - `handleNextStep()`: advances to `'details'` if parsed amount > 0.
  - `handlePrevStep()`: returns to `'amount'`.

- [ ] **Step 1: Update `src/screens/AddEditSheet.tsx` with GPay flow**
  - Add `step` state.
  - Reset `step` on open: `setStep(entryToEdit ? 'details' : 'amount')`.
  - In `Step 1` (`step === 'amount'`):
    - Render In/Out toggle at top.
    - Render giant amount display with `text-5xl font-black`.
    - Render bottom primary forward button with `ArrowRight` icon.
    - Allow pressing `Enter` on amount input to call `handleNextStep()`.
  - In `Step 2` (`step === 'details'`):
    - Render top chip bar: `[ ← ₹{amountStr} · {type === 'in' ? 'In (Sale)' : 'Out (Expense)'} ]` which calls `handlePrevStep()`.
    - Render the balance form: Payment Method, Item / Stock Picker, Customer Name, Note, Date.
    - Render bottom primary "Save Entry" button.

- [ ] **Step 2: Run contract tests to verify they pass**

Run: `npx vitest run tests/addEditSheetGPayFlow.test.ts`
Expected: PASS

- [ ] **Step 3: Run existing sheet tests to ensure backward compatibility**

Run: `npx vitest run tests/creditAddEditSheet.test.ts tests/generateBillInEditEntry.test.ts`
Expected: PASS

- [ ] **Step 4: Commit changes**

Run: `git add src/screens/AddEditSheet.tsx tests/addEditSheetGPayFlow.test.ts ; git commit -m "feat(daily-book): implement GPay-style entry flow with big amount and balance form"`

---

### Task 3: Full Test Suite Verification

**Files:**
- All touched files

- [ ] **Step 1: Run full test suite**

Run: `npm test`
Expected: PASS (all 200+ tests pass with zero regressions)

- [ ] **Step 2: Run production TypeScript and Vite build**

Run: `npm run build`
Expected: Exit code 0

---

### Task 4: Push to Git & Deploy to Vercel

- [ ] **Step 1: Push commits to GitHub origin main**

Run: `git push origin main`

- [ ] **Step 2: Deploy to Vercel production**

Run: `npx vercel --prod --yes`
