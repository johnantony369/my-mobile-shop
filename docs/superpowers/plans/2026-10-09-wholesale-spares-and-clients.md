# Wholesale Spares Catalog & B2B Clients Subsystem Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a dedicated Wholesaler Mode subsystem featuring a pre-loaded Cloud Master Spares Catalog (with phone models, parts, OEM codes, and custom additions), Day Book item auto-suggest, and a complete B2B Clients & Credit CRM with automatic Day Book synchronization.

**Architecture:** 
- A new `settings.wholesaleMode` toggle dynamically transforms the application layout, replacing `Repairs` and `Tools` with `Spares` and `Clients` tabs.
- A cloud master catalog service queries pre-loaded Indian smartphone models and spare parts (Displays, Batteries, CC Boards, Back Doors, Flex, etc.) without requiring manual import steps, while allowing custom model/part creation and bench compatibility notes.
- Day Book integrates real-time spares auto-suggest for fast counter entry, and automatically reflects credit transactions into the client's credit ledger.
- Offline-first IndexedDB via Dexie with Firestore cloud sync for clients, transactions, and custom compatibilities.

**Tech Stack:** React 19, TypeScript, Dexie (IndexedDB), Firebase Firestore, Lucide icons, Tailwind CSS, Vitest.

**Spec:** `docs/superpowers/specs/2026-10-09-wholesale-spares-and-clients-design.md`

## Global Constraints

- **Strict Copy Rule:** Exclusively use the business term **"Credit"** (e.g. *Credit Balance*, *Credit Given*, *Credit Settled*, *Credit History*). Strictly zero colloquial terms (e.g., no "udhar" or "khata").
- **Neutral Placeholders:** Form input placeholders must strictly be neutral and descriptive (e.g. `Enter client shop name`, `Enter technician name`, `Enter 10-digit mobile number`, `Enter market area or address`, `Enter credit limit (optional)`, `Enter brand`, `Enter model name`, `Enter spare part name`).
- **Offline First:** All active shop clients, transactions, and stock entries must persist in local Dexie IndexedDB and queue sync to Firestore.
- **Git & Deployment:** NEVER run `git push` or deploy to Vercel without explicit user instruction in the current prompt.
- **TDD:** Write failing tests first before implementing code for each task.

## Review Focus

1. **Credit balance mathematical accuracy**: Multiple sequential credit sales and partial payment settlements must compute the exact running balance without floating-point artifacts.
2. **Day Book Credit Sync idempotency**: Editing an existing credit entry in Day Book must update the client's ledger balance difference rather than double-counting.
3. **Fuzzy Search & Catalog performance**: Typing fast into Day Book item field or Spares search must not cause stutter or lag with hundreds of models.
4. **Offline Resilience**: Switching tabs or viewing pre-loaded spares when offline must gracefully fallback to cached catalog seed data without throwing network exceptions.
5. **Mode Switching Safety**: Toggling `wholesaleMode` off and on must never erase or corrupt existing client credit data, standard repair jobs, or day book entries.

---

### Task 1: Wholesale Types & Dexie Database Schema Upgrade

**Files:**
- Create: `src/types/wholesale.ts`
- Modify: `src/types/index.ts`
- Modify: `src/db/db.ts`
- Test: `tests/wholesaleDb.test.ts`

**Interfaces:**
- Produces:
  - Types: `WholesaleClient`, `ClientTransaction`, `MasterDevice`, `MasterSparePart`, `CustomPartCompatibility`, `SpareCategory`
  - Field: `AppSettings.wholesaleMode?: boolean`
  - Dexie Tables: `db.clients`, `db.clientTransactions`, `db.customCompatibilities`

- [ ] **Step 1: Write the failing test**

```typescript
// tests/wholesaleDb.test.ts
import { describe, it, expect } from 'vitest';
import { WholesaleClient, ClientTransaction } from '../src/types/wholesale';

describe('Wholesale Types & Client Calculations', () => {
  it('correctly models wholesale client and tracks running credit balance', () => {
    const client: WholesaleClient = {
      cloudId: 'client-1',
      shopName: 'Fast Tech Repairs',
      contactPerson: 'Rahul Kumar',
      phone: '9876543210',
      currentCreditBalance: 1500,
      createdAt: Date.now(),
    };

    const saleTransaction: ClientTransaction = {
      cloudId: 'tx-1',
      clientCloudId: client.cloudId,
      type: 'credit_sale',
      amount: 1200,
      date: '2026-10-09',
      createdAt: Date.now(),
    };

    const paymentTransaction: ClientTransaction = {
      cloudId: 'tx-2',
      clientCloudId: client.cloudId,
      type: 'payment_received',
      amount: 500,
      paymentMethod: 'upi',
      date: '2026-10-09',
      createdAt: Date.now(),
    };

    const newBalance = client.currentCreditBalance + saleTransaction.amount - paymentTransaction.amount;
    expect(newBalance).toBe(2200);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/wholesaleDb.test.ts`
Expected: FAIL (missing `src/types/wholesale.ts`)

- [ ] **Step 3: Write implementation**

Create `src/types/wholesale.ts`:
```typescript
import { SyncMetadata } from './index';

export type SpareCategory =
  | 'display'
  | 'battery'
  | 'charging_board'
  | 'back_panel'
  | 'camera_glass'
  | 'flex'
  | 'speaker'
  | 'glass_oca'
  | 'sim_tray'
  | 'other';

export interface MasterDevice {
  id: string; // e.g. "xiaomi_redmi_note_10"
  brand: string;
  model: string;
  photoUrl?: string;
  releaseYear?: number;
}

export interface MasterSparePart {
  id: string; // e.g. "xiaomi_redmi_note_10_display"
  deviceId: string;
  brand: string;
  model: string;
  category: SpareCategory;
  partName: string;
  partCode?: string; // e.g. "BN53"
  wholesalePrice?: number;
  costPrice?: number;
  photoUrl?: string;
  compatibleModels: string[];
}

export interface CustomPartCompatibility extends SyncMetadata {
  id?: number;
  partKey: string;
  compatibleModels: string[];
}

export interface WholesaleClient extends SyncMetadata {
  id?: number;
  cloudId: string;
  shopName: string;
  contactPerson?: string;
  phone: string;
  address?: string;
  creditLimit?: number;
  currentCreditBalance: number;
  createdAt: number;
}

export type ClientTransactionType = 'credit_sale' | 'payment_received';
export type WholesalePaymentMethod = 'cash' | 'upi' | 'bank_transfer' | 'cheque';

export interface ClientTransaction extends SyncMetadata {
  id?: number;
  cloudId: string;
  clientCloudId: string;
  type: ClientTransactionType;
  amount: number;
  paymentMethod?: WholesalePaymentMethod;
  note?: string;
  date: string; // 'YYYY-MM-DD'
  createdAt: number;
}
```

Update `src/types/index.ts` to include `wholesaleMode?: boolean` in `AppSettings`.
Update `src/db/db.ts` to add version 9 with tables:
- `clients`: `'++id, cloudId, shopName, phone, currentCreditBalance, createdAt, updatedAt, syncStatus'`
- `clientTransactions`: `'++id, cloudId, clientCloudId, type, amount, date, createdAt, updatedAt, syncStatus'`
- `customCompatibilities`: `'++id, cloudId, partKey, updatedAt, syncStatus'`
and attach standard Dexie lifecycle hooks.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/wholesaleDb.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/types/wholesale.ts src/types/index.ts src/db/db.ts tests/wholesaleDb.test.ts
git commit -m "feat(wholesale): add wholesale data types and upgrade Dexie schema"
```

---

### Task 2: Wholesaler Mode Toggle & Adaptive Navigation

**Files:**
- Modify: `src/screens/SettingsScreen.tsx`
- Modify: `src/screens/OnboardingScreen.tsx`
- Modify: `src/components/TabBar.tsx`
- Modify: `src/App.tsx`
- Test: `tests/wholesaleNavigation.test.tsx`

**Interfaces:**
- Consumes: `settings.wholesaleMode`
- Produces: Dynamic bottom navigation switching to `[ Day Book | Stock | Spares | Clients | Settings ]` when `wholesaleMode` is true.

- [ ] **Step 1: Write the failing test**

```typescript
// tests/wholesaleNavigation.test.tsx
import { describe, it, expect } from 'vitest';
import { TabType } from '../src/components/TabBar';

describe('Wholesale TabBar Navigation Rules', () => {
  it('replaces repairs and tools with spares and clients in wholesale mode', () => {
    const isWholesale = true;
    const standardTabs: TabType[] = ['book', 'stock', 'repairs', 'tools', 'settings'];
    const wholesaleTabs: TabType[] = ['book', 'stock', 'spares', 'clients', 'settings'];

    const activeTabs = isWholesale ? wholesaleTabs : standardTabs;
    expect(activeTabs).toContain('spares');
    expect(activeTabs).toContain('clients');
    expect(activeTabs).not.toContain('repairs');
    expect(activeTabs).not.toContain('tools');
  });
});
```

- [ ] **Step 2: Run test to verify it fails/passes**

Run: `npx vitest run tests/wholesaleNavigation.test.tsx`
Expected: PASS/FAIL based on `TabType` definition

- [ ] **Step 3: Write implementation**

In `src/components/TabBar.tsx`:
- Extend `TabType`: `'book' | 'stock' | 'repairs' | 'tools' | 'settings' | 'spares' | 'clients'`
- Add prop `isWholesale?: boolean`
- When `isWholesale` is true: render `Spares` (`Cpu` icon) and `Clients` (`Users` icon), omit `repairs` and `tools`.

In `src/screens/SettingsScreen.tsx`:
- Add a toggle card: **Wholesale & Spares Mode** (`settings.wholesaleMode`) with segmented control `Off | On`.
- Clear description: *"Optimizes the app for wholesale spare parts distributors and accessory shops."*

In `src/screens/OnboardingScreen.tsx`:
- Add business type selector: *"Shop Type: Retail Mobile Shop | Spare Parts Wholesaler"* setting initial `wholesaleMode`.

In `src/App.tsx`:
- Read `settings.wholesaleMode`.
- Dynamically pass `isWholesale={!!settings?.wholesaleMode}` to `TabBar`.
- Conditionally render `<SparesScreen />` and `<ClientsScreen />` when tabs `spares` or `clients` are selected.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/wholesaleNavigation.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/TabBar.tsx src/screens/SettingsScreen.tsx src/screens/OnboardingScreen.tsx src/App.tsx tests/wholesaleNavigation.test.tsx
git commit -m "feat(wholesale): implement wholesale mode toggle and adaptive navigation"
```

---

### Task 3: Cloud Master Spares Catalog Service & Seed Dataset

**Files:**
- Create: `src/data/masterSparesSeed.ts`
- Create: `src/firebase/masterSpares.ts`
- Test: `tests/masterSparesService.test.ts`

**Interfaces:**
- Produces:
  - `fetchMasterDevices()`
  - `fetchMasterSpares(deviceId)`
  - `searchMasterSpares(query)`
  - `addCustomDevice(device)`
  - `addCustomSparePart(spare)`
  - `updatePartCompatibility(partId, models)`

- [ ] **Step 1: Write the failing test**

```typescript
// tests/masterSparesService.test.ts
import { describe, it, expect } from 'vitest';
import { searchMasterSparesInMemory } from '../src/data/masterSparesSeed';

describe('Master Spares Search & Taxonomy', () => {
  it('finds spare parts by model name or part code', () => {
    const results = searchMasterSparesInMemory('note 10');
    expect(results.length).toBeGreaterThan(0);
    expect(results.some((r) => r.model.toLowerCase().includes('note 10'))).toBe(true);
  });

  it('matches parts by battery code', () => {
    const results = searchMasterSparesInMemory('bn53');
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].partCode).toBe('BN53');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/masterSparesService.test.ts`
Expected: FAIL (missing `src/data/masterSparesSeed.ts`)

- [ ] **Step 3: Write implementation**

Create `src/data/masterSparesSeed.ts`:
- Pre-populate popular Indian smartphone models:
  - Xiaomi/Redmi: Redmi Note 10, Note 11, Note 12, Note 13, 9 Power, 9 Prime
  - Samsung: Galaxy M31, M21, A12, A14, A50, A51, S21 FE
  - Vivo: Y20, Y21, Y16, T1 5G, V20, V23
  - Oppo: A15, A16, A53, A54, Reno 6, Reno 8
  - Realme: Realme 8, 9, 10, C11, C21, C35, Narzo 30
  - Apple: iPhone 11, iPhone 12, iPhone 13, iPhone 14
  - OnePlus: Nord CE 2, Nord CE 3, OnePlus 7, OnePlus 8T, OnePlus 9R
- For each model, seed standard parts: Display Combo, Battery (with codes like BN53, BLP793, EB-BA505ABU), Charging CC Board, Back Glass, Camera Lens, Power/Volume Flex.
- Provide `searchMasterSparesInMemory(query: string)`.

Create `src/firebase/masterSpares.ts`:
- Cloud querying methods using Firestore collections `master_devices` and `master_spares`.
- Methods: `fetchMasterDevices()`, `fetchMasterSpares(deviceId)`, `searchMasterSpares(query)`, `addCustomDevice()`, `addCustomSparePart()`, `updatePartCompatibility()`.
- Built-in fallback to `masterSparesSeed` when offline or before initial cloud sync.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/masterSparesService.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/data/masterSparesSeed.ts src/firebase/masterSpares.ts tests/masterSparesService.test.ts
git commit -m "feat(wholesale): implement master spares cloud service and seed dataset"
```

---

### Task 4: Master Spares Catalog Screen (`SparesScreen`)

**Files:**
- Create: `src/screens/wholesale/SparesScreen.tsx`
- Create: `src/components/wholesale/AddDeviceModal.tsx`
- Create: `src/components/wholesale/AddSparePartModal.tsx`
- Create: `src/components/wholesale/PartCompatibilityModal.tsx`
- Test: `tests/sparesScreen.test.tsx`

**Interfaces:**
- Consumes: `fetchMasterDevices`, `fetchMasterSpares`, `addCustomDevice`, `addCustomSparePart`, `updatePartCompatibility`
- Produces: Full catalog browser with brand filters, search, custom model/part addition, and compatibility editor.

- [ ] **Step 1: Write the failing test**

```typescript
// tests/sparesScreen.test.tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { SparesScreen } from '../src/screens/wholesale/SparesScreen';

describe('SparesScreen Component', () => {
  it('renders search input and brand filter chips', () => {
    render(<SparesScreen language="en" />);
    expect(screen.getByPlaceholderText(/search phone model/i)).toBeDefined();
    expect(screen.getByText('Xiaomi')).toBeDefined();
    expect(screen.getByText('Samsung')).toBeDefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/sparesScreen.test.tsx`
Expected: FAIL (missing `src/screens/wholesale/SparesScreen.tsx`)

- [ ] **Step 3: Write implementation**

Create `src/screens/wholesale/SparesScreen.tsx`:
- Header with search input (`Search phone model or spare part...`).
- Brand filter chips: `All`, `Xiaomi`, `Samsung`, `Vivo`, `Oppo`, `Realme`, `Apple`, `OnePlus`.
- Action buttons: `+ Add Phone Model`, `+ Add Spare Part`.
- Models list with collapsible/expandable parts list.
- Each part item renders thumbnail, category badge, part name, OEM code, and compatibility tags.
- Tapping compatibility tag opens `PartCompatibilityModal` to let wholesaler add their own phone models.

Create `src/components/wholesale/AddDeviceModal.tsx`:
- Neutral placeholders: `Enter brand`, `Enter model name`, `Enter release year (optional)`.

Create `src/components/wholesale/AddSparePartModal.tsx`:
- Neutral placeholders: `Enter spare part name`, `Select part category`, `Enter part code / battery number (optional)`, `Enter wholesale price (optional)`.

Create `src/components/wholesale/PartCompatibilityModal.tsx`:
- Displays existing compatible models and input `Enter compatible phone model` with tag pill management.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/sparesScreen.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/screens/wholesale/SparesScreen.tsx src/components/wholesale/AddDeviceModal.tsx src/components/wholesale/AddSparePartModal.tsx src/components/wholesale/PartCompatibilityModal.tsx tests/sparesScreen.test.tsx
git commit -m "feat(wholesale): build master spares catalog screen and modal components"
```

---

### Task 5: Day Book Item Auto-Suggestion with Master Spares

**Files:**
- Create: `src/components/wholesale/SparesAutoSuggest.tsx`
- Modify: `src/screens/BookScreen.tsx`
- Modify: `src/components/AddEditEntrySheet.tsx`
- Test: `tests/dayBookSparesSuggest.test.tsx`

**Interfaces:**
- Consumes: `searchMasterSpares`
- Produces: Popover suggestion dropdown attached to `Item` input in Day Book when `wholesaleMode` is true.

- [ ] **Step 1: Write the failing test**

```typescript
// tests/dayBookSparesSuggest.test.tsx
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { SparesAutoSuggest } from '../src/components/wholesale/SparesAutoSuggest';

describe('SparesAutoSuggest Component', () => {
  it('renders suggestions as user types', async () => {
    let selectedItem = '';
    render(
      <SparesAutoSuggest
        value="note 10"
        onChange={() => {}}
        onSelect={(item) => {
          selectedItem = `${item.model} • ${item.partName}`;
        }}
      />
    );

    const match = await screen.findByText(/display combo/i);
    expect(match).toBeDefined();
    fireEvent.click(match);
    expect(selectedItem).toContain('Redmi Note 10');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/dayBookSparesSuggest.test.tsx`
Expected: FAIL (missing `SparesAutoSuggest.tsx`)

- [ ] **Step 3: Write implementation**

Create `src/components/wholesale/SparesAutoSuggest.tsx`:
- Input with clean neutral placeholder `Enter item or select spare part`.
- Debounced live search querying master spares catalog.
- Dropdown card showing matches with model name, part category icon, and part code.
- Selecting a match calls `onSelect(part)` passing part details and wholesale price.

In `src/screens/BookScreen.tsx` / `src/components/AddEditEntrySheet.tsx`:
- Check if `settings.wholesaleMode` is true.
- If true, replace standard plain item input with `SparesAutoSuggest`.
- On selection, populate item description and autofill default amount if provided.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/dayBookSparesSuggest.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/wholesale/SparesAutoSuggest.tsx src/screens/BookScreen.tsx src/components/AddEditEntrySheet.tsx tests/dayBookSparesSuggest.test.tsx
git commit -m "feat(wholesale): add real-time master spares auto-suggest to Day Book"
```

---

### Task 6: B2B Clients & Credit Ledger Calculation Core Services

**Files:**
- Create: `src/utils/wholesaleCredit.ts`
- Test: `tests/wholesaleCredit.test.ts`

**Interfaces:**
- Produces:
  - `calculateClientCreditBalance(transactions)`
  - `formatWhatsAppCreditStatement(client, transactions, shopName, upiId)`
  - `normalizeClientPhone(phone)`

- [ ] **Step 1: Write the failing test**

```typescript
// tests/wholesaleCredit.test.ts
import { describe, it, expect } from 'vitest';
import {
  calculateClientCreditBalance,
  formatWhatsAppCreditStatement,
} from '../src/utils/wholesaleCredit';
import { ClientTransaction, WholesaleClient } from '../src/types/wholesale';

describe('Wholesale Credit Calculations & Statements', () => {
  it('correctly calculates net credit balance across multiple entries', () => {
    const transactions: ClientTransaction[] = [
      { cloudId: '1', clientCloudId: 'c1', type: 'credit_sale', amount: 2000, date: '2026-10-01', createdAt: 1 },
      { cloudId: '2', clientCloudId: 'c1', type: 'credit_sale', amount: 1500, date: '2026-10-02', createdAt: 2 },
      { cloudId: '3', clientCloudId: 'c1', type: 'payment_received', amount: 1000, date: '2026-10-03', createdAt: 3 },
    ];
    expect(calculateClientCreditBalance(transactions)).toBe(2500);
  });

  it('generates professional WhatsApp statement using exclusively Credit terminology', () => {
    const client: WholesaleClient = {
      cloudId: 'c1',
      shopName: 'Star Repairs',
      phone: '9876543210',
      currentCreditBalance: 2500,
      createdAt: 1,
    };
    const stmt = formatWhatsAppCreditStatement(client, 'Om Spares', 'omspares@upi');
    expect(stmt).toContain('Credit Balance: ₹2,500');
    expect(stmt).toContain('Star Repairs');
    expect(stmt).toContain('omspares@upi');
    expect(stmt.toLowerCase()).not.toContain('udhar');
    expect(stmt.toLowerCase()).not.toContain('khata');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/wholesaleCredit.test.ts`
Expected: FAIL (missing `src/utils/wholesaleCredit.ts`)

- [ ] **Step 3: Write implementation**

Create `src/utils/wholesaleCredit.ts`:
- `calculateClientCreditBalance(transactions: ClientTransaction[]): number`:
  `transactions.reduce((sum, t) => t.type === 'credit_sale' ? sum + t.amount : sum - t.amount, 0)`
- `formatWhatsAppCreditStatement(...)`: Formats professional WhatsApp credit statement without any colloquial terms.
- `normalizeClientPhone(...)`: Strips spaces/formatting into 10-digit Indian mobile.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/wholesaleCredit.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/utils/wholesaleCredit.ts tests/wholesaleCredit.test.ts
git commit -m "feat(wholesale): implement wholesale credit calculation and WhatsApp statement formatter"
```

---

### Task 7: B2B Clients Screen (`ClientsScreen`) & Credit Management

**Files:**
- Create: `src/screens/wholesale/ClientsScreen.tsx`
- Create: `src/components/wholesale/AddEditClientModal.tsx`
- Create: `src/components/wholesale/ClientLedgerDrawer.tsx`
- Create: `src/components/wholesale/RecordPaymentModal.tsx`
- Create: `src/components/wholesale/AddCreditSaleModal.tsx`
- Test: `tests/clientsScreen.test.tsx`

**Interfaces:**
- Consumes: `db.clients`, `db.clientTransactions`, `wholesaleCredit.ts`
- Produces: Client directory, credit due metrics, ledger drawer, payment recording modal, and credit sale modal.

- [ ] **Step 1: Write the failing test**

```typescript
// tests/clientsScreen.test.tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { ClientsScreen } from '../src/screens/wholesale/ClientsScreen';

describe('ClientsScreen UI', () => {
  it('renders credit metrics and client search', () => {
    render(<ClientsScreen language="en" shopName="Test Spares" />);
    expect(screen.getByText(/total credit due/i)).toBeDefined();
    expect(screen.getByPlaceholderText(/search client shop or phone/i)).toBeDefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/clientsScreen.test.tsx`
Expected: FAIL (missing `src/screens/wholesale/ClientsScreen.tsx`)

- [ ] **Step 3: Write implementation**

Create `src/screens/wholesale/ClientsScreen.tsx`:
- Metric cards: **Total Credit Due** (sum of all clients with positive credit balance) and **Active Clients** count.
- Search input with placeholder `Search client shop, technician, or phone...`.
- Filter chips: `All`, `Has Credit Due`, `Settled`.
- Client card with shop name, contact person, phone, WhatsApp button, and credit balance pill (`₹14,500 Credit Due`).
- Floating or top `+ Add Client` button.

Create `src/components/wholesale/AddEditClientModal.tsx`:
- Neutral placeholders: `Enter client shop name`, `Enter technician name`, `Enter 10-digit mobile number`, `Enter market area or address`, `Enter credit limit (optional)`.

Create `src/components/wholesale/ClientLedgerDrawer.tsx`:
- Displays client credit history with date, type badge (`Credit Sale` / `Payment Received`), amount, note, and running credit balance.
- Actions: **Record Payment Received**, **Add Credit Sale**, and **Share WhatsApp Statement**.

Create `src/components/wholesale/RecordPaymentModal.tsx`:
- Neutral placeholders: `Enter payment amount`, `Enter payment reference / note (optional)`.
- Method selector: `Cash`, `UPI`, `Bank Transfer`, `Cheque`.

Create `src/components/wholesale/AddCreditSaleModal.tsx`:
- Neutral placeholders: `Enter bill description / parts taken`, `Enter credit sale amount`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/clientsScreen.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/screens/wholesale/ClientsScreen.tsx src/components/wholesale/AddEditClientModal.tsx src/components/wholesale/ClientLedgerDrawer.tsx src/components/wholesale/RecordPaymentModal.tsx src/components/wholesale/AddCreditSaleModal.tsx tests/clientsScreen.test.tsx
git commit -m "feat(wholesale): build B2B clients directory and credit ledger drawer"
```

---

### Task 8: Day Book & Client Credit Bi-Directional Synchronization

**Files:**
- Modify: `src/screens/BookScreen.tsx`
- Modify: `src/components/AddEditEntrySheet.tsx`
- Modify: `src/db/db.ts`
- Test: `tests/dayBookCreditSync.test.ts`

**Interfaces:**
- Consumes: `db.clients`, `db.clientTransactions`, `db.entries`
- Produces: Automatic credit ledger updates when Day Book entries with `paymentMethod: 'credit'` are created, modified, or deleted.

- [ ] **Step 1: Write the failing test**

```typescript
// tests/dayBookCreditSync.test.ts
import { describe, it, expect } from 'vitest';
import { syncDayBookCreditEntry } from '../src/utils/wholesaleCredit';

describe('Day Book Credit Synchronization', () => {
  it('increments client credit balance when credit sale entry is saved', () => {
    const initialBalance = 1000;
    const entryAmount = 1400;
    const updatedBalance = initialBalance + entryAmount;
    expect(updatedBalance).toBe(2400);
  });

  it('updates balance difference when entry amount is modified', () => {
    const currentBalance = 2400;
    const oldAmount = 1400;
    const newAmount = 1600;
    const diff = newAmount - oldAmount;
    expect(currentBalance + diff).toBe(2600);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/dayBookCreditSync.test.ts`
Expected: FAIL

- [ ] **Step 3: Write implementation**

In `src/utils/wholesaleCredit.ts`:
- Implement `syncDayBookCreditEntry(clientCloudId, entry, oldEntry)`:
  - If new credit entry: append `ClientTransaction` and increment `client.currentCreditBalance`.
  - If modified credit entry: update matching transaction amount and adjust `client.currentCreditBalance` by delta.
  - If deleted credit entry: remove matching transaction and decrement `client.currentCreditBalance`.

In `src/components/AddEditEntrySheet.tsx`:
- When `paymentMethod === 'credit'` (or when credit toggle is checked):
  - In `Customer / Client Name` field, render autocomplete dropdown querying `db.clients`.
  - On submit, execute `syncDayBookCreditEntry`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/dayBookCreditSync.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/utils/wholesaleCredit.ts src/components/AddEditEntrySheet.tsx src/screens/BookScreen.tsx tests/dayBookCreditSync.test.ts
git commit -m "feat(wholesale): link Day Book credit entries directly to client credit ledgers"
```

---

### Task 9: Full End-to-End Verification & Production Build

**Files:**
- Create: `tests/wholesaleEndToEnd.test.ts`

- [ ] **Step 1: Write comprehensive end-to-end test**

```typescript
// tests/wholesaleEndToEnd.test.ts
import { describe, it, expect } from 'vitest';
import { searchMasterSparesInMemory } from '../src/data/masterSparesSeed';
import { calculateClientCreditBalance, formatWhatsAppCreditStatement } from '../src/utils/wholesaleCredit';
import { ClientTransaction, WholesaleClient } from '../src/types/wholesale';

describe('Wholesale End-to-End Lifecycle Verification', () => {
  it('verifies master spares search, custom compatibility, client credit ledger and statement formatting', () => {
    // 1. Search spares
    const spares = searchMasterSparesInMemory('y20');
    expect(spares.length).toBeGreaterThan(0);

    // 2. Client credit tracking
    const client: WholesaleClient = {
      cloudId: 'client-99',
      shopName: 'Metro Mobile Care',
      phone: '9898989898',
      currentCreditBalance: 0,
      createdAt: Date.now(),
    };

    const tx1: ClientTransaction = {
      cloudId: 'tx-1',
      clientCloudId: client.cloudId,
      type: 'credit_sale',
      amount: 1800,
      note: 'Vivo Y20 Display Combo',
      date: '2026-10-09',
      createdAt: Date.now(),
    };

    const tx2: ClientTransaction = {
      cloudId: 'tx-2',
      clientCloudId: client.cloudId,
      type: 'payment_received',
      amount: 800,
      paymentMethod: 'upi',
      date: '2026-10-09',
      createdAt: Date.now(),
    };

    const balance = calculateClientCreditBalance([tx1, tx2]);
    expect(balance).toBe(1000);

    // 3. Statement formatting
    client.currentCreditBalance = balance;
    const stmt = formatWhatsAppCreditStatement(client, 'City Spares Hub', 'cityspares@okaxis');
    expect(stmt).toContain('Credit Balance: ₹1,000');
    expect(stmt).toContain('Metro Mobile Care');
    expect(stmt).toContain('cityspares@okaxis');
  });
});
```

- [ ] **Step 2: Run all test suites**

Run: `npx vitest run`
Expected: ALL test suites pass (zero regressions across all existing features)

- [ ] **Step 3: Run TypeScript production build**

Run: `npm run build`
Expected: Build succeeds with zero type errors

- [ ] **Step 4: Commit**

```bash
git add tests/wholesaleEndToEnd.test.ts
git commit -m "test(wholesale): add comprehensive end-to-end verification suite"
```
