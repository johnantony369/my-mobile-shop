# GPay-Style Daily Book Entry Flow Design

## 1. Overview
Redesign the UX flow for adding new Day Book entries in `AddEditSheet.tsx` to follow a Google Pay (GPay) progressive disclosure pattern:
1. **Step 1 (Amount Focus)**: Start with a focused, uncluttered screen with a giant amount input, In/Out toggle, and a forward arrow button (`→`).
2. **Step 2 (Balance Form)**: Clicking the arrow transitions to the remaining form (payment method, item/stock, note, date, customer name) with a top chip displaying the amount and a back arrow (`←`) to return.
3. **Edit Mode**: Editing an existing transaction (`entryToEdit !== null`) opens directly into Step 2 with all pre-filled fields editable in place.

---

## 2. Requirements & Scope

### 2.1 Functional Requirements
1. **Step 1 (Amount Screen)**:
   - Header: "New Entry" title + close `(X)` button.
   - Type Toggle: In (Sale) vs Out (Expense) segmented selector at the top.
   - Giant Amount Field: Large `₹` symbol + `text-5xl font-extrabold` input, centered, auto-focused with `inputMode="decimal"`.
   - Forward Arrow Button: Prominent button with forward arrow (`→`). Disabled if amount is empty or `0`. When clicked or `Enter` pressed, transitions to Step 2.
2. **Step 2 (Balance Form)**:
   - Header Navigation: `← Back` button and an editable amount chip (e.g. `₹500 · In`) that lets the user tap to bounce back to Step 1 and change the amount.
   - Remaining Fields:
     - Payment Method (`Cash`, `UPI`, `Card`, `Credit` for In; `Cash`, `UPI` for Out).
     - Item/Service with Stock Picker and quick stock chips.
     - Customer Name (required if payment method is Credit).
     - Note (optional).
     - Date (defaults to selected book date).
     - Bill preview / generation (if applicable).
   - Bottom Action: "Save Entry" / "Update Entry" button.
3. **Editing Existing Transactions**:
   - When `entryToEdit !== null`, the sheet opens directly in Step 2 so all fields are immediately visible.
   - An amount input is still available in Step 2 when editing, or user can tap the amount chip.

### 2.2 Non-Functional Requirements
- **Fluid iOS/Android feel**: Transitions smoothly with subtle animation (`animate-fade-in` / `animate-fade-slide-in`).
- **Data Integrity**: Preserves all existing business logic: stock deduction (`adjustStockQuantity`), billing (`createBillForEntry`), credit validation (`validateCreditEntry`), and double-submit prevention (`isSubmittingRef`).

---

## 3. UI State & Navigation Flow

```
[Day Book Screen]
       |
       | Click "+ Add"
       v
+-------------------------------------------------------+
|  AddEditSheet (Step: 'amount')                        |
|                                                       |
|   [ In (Sale)  |  Out (Expense) ]                     |
|                                                       |
|                ₹ [  500  ]                            |
|                                                       |
|                     [ → ]  (Forward Arrow)            |
+---------------------------+---------------------------+
                            | Click [ → ]
                            v
+-------------------------------------------------------+
|  AddEditSheet (Step: 'details')                       |
|                                                       |
|   [ ← ₹500 · In ]  (Click to change amount)           |
|                                                       |
|   Payment Method: [ Cash | UPI | Card | Credit ]      |
|   Item: [ Pick from Stock ]                           |
|   Customer Name: [ John ]                             |
|   Note: [ Screen protector ]                          |
|   Date: [ 2026-10-06 ]                                |
|                                                       |
|   [ Save Entry ]                                      |
+-------------------------------------------------------+
```

---

## 4. Error Handling & Edge Cases
1. **Invalid Amount**: Forward arrow is disabled when amount is empty, 0, or not a valid number.
2. **Credit Without Customer**: Prevent saving if payment method is `Credit` and customer name is empty.
3. **Back Navigation**: Returning to Step 1 from Step 2 preserves all entered notes, item names, and payment method selections.

---

## 5. Testing Strategy
- Unit and component contract tests in `tests/addEditSheetGPayFlow.test.ts`:
  1. Default step for new entry is `'amount'`.
  2. Forward button disabled when amount is `0` or empty.
  3. Clicking forward button with valid amount advances to `'details'`.
  4. Step 2 shows back button / editable amount chip.
  5. Clicking back button returns to Step 1 with amount intact.
  6. Opening with `entryToEdit` opens directly into `'details'`.
  7. Form submission saves entry correctly to IndexedDB.
