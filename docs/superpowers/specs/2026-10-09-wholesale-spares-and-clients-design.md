# Wholesale Spares Catalog & B2B Clients Subsystem Design Spec

- **Date:** 2026-10-09
- **Status:** Draft / Approved Design Concept
- **Author:** Antigravity & User

---

## 1. Executive Summary & Ground Insights

From ground visits to Indian wholesale mobile spare and accessory markets, two fundamental operational realities emerged:
1. **Massive Spares Inventory:** Distributors carry parts across 1,000s of smartphone models with 10–15 standard spare categories per model (Displays, Batteries, Charging CC Boards, Back Doors, Flex cables, Camera lenses, etc.) plus photos and part codes. Typing every item manually is impossible; a pre-populated Master Spares Catalog is required.
2. **B2B Technician Relationships & Credit Cycles:** Wholesalers do not repair customer phones and do not need consumer retail tools. Instead, they distribute parts to local technician and retail shops who purchase items on running credit. Wholesalers need a dedicated **B2B Clients & Credit CRM** with fast wholesale billing, credit tracking, payment logging, and 1-tap WhatsApp credit statements.

To serve this market while keeping the app clean for regular retailers, the application introduces **Wholesaler Mode**.

---

## 2. Wholesaler Mode Toggle & Navigation Architecture

### 2.1 Settings & Onboarding Toggle
- **Settings Screen (`SettingsScreen.tsx`):**
  - Toggle: **Wholesale & Spares Mode** (`settings.wholesaleMode: boolean`).
  - Description: *"Optimizes the app for wholesale spare parts distributors and accessory shops."*
- **Onboarding (`OnboardingScreen.tsx`):**
  - Optional business profile question during first setup: *"Shop Type: Retail Mobile Shop | Spare Parts Wholesaler"*.

### 2.2 Adaptive Bottom Navigation (`TabBar.tsx`)
When `wholesaleMode` is active, the bottom bar dynamically adapts:

| Standard Mode (Retailers) | Wholesaler Mode (Distributors) |
|---|---|
| 📖 **Day Book** (`BookOpen`) | 📖 **Day Book** (`BookOpen`) |
| 📦 **Stock** (`Package`) | 📦 **Stock** (`Package`) |
| 🔧 **Repairs** (`Wrench`) | 📱 **Spares** (`Cpu` / `Smartphone`) |
| 🧰 **Tools** (`LayoutGrid`) | 👥 **Clients** (`Users`) |
| ⚙️ **Settings** (`Settings`) | ⚙️ **Settings** (`Settings`) |

- Both `Repairs` and `Tools` tabs are hidden in Wholesaler Mode and replaced with `Spares` and `Clients`.
- Standard mode behavior is 100% preserved when the toggle is OFF.

---

## 3. Cloud Master Spares Catalog (`SparesScreen`) & Day Book Auto-Suggest

### 3.1 Pre-Loaded Cloud Architecture
- **Pre-Loaded by Default:** All smartphone models and spare parts are pre-loaded in the cloud database (`master_devices` and `master_spares`). Wholesalers do **not** have to manually import or tap "+ Add to Stock" model-by-model—the entire catalog is immediately active and available to browse, quote, and bill against from day one.
- **Photos & Media:** Compressed WebP photos for parts and models are hosted in the cloud and lazy-loaded on demand to ensure zero bloat on local devices.
- **Offline Cache:** Models and parts viewed or recently searched are cached locally so common lookups remain fast even with spotty connectivity.

### 3.2 Catalog Data Taxonomy
- **Brands:** Xiaomi / Redmi, Samsung, Vivo / iQOO, Oppo, Realme, Apple, OnePlus, Poco, Motorola, Infinix, Tecno.
- **Standard Part Categories:**
  1. `display`: Combo / Folder (Incell, OLED, Original)
  2. `battery`: OEM replacement battery with battery code (e.g. *BN53, BLP793, EB-BA505ABU*)
  3. `charging_board`: Charging sub-board / CC board / Mic PCB
  4. `back_panel`: Battery cover / Back door / Glass
  5. `camera_glass`: Rear camera glass lens & camera modules
  6. `flex`: Power / Volume flex cable, fingerprint sensor flex
  7. `speaker`: Loudspeaker / Ringer & Ear speaker
  8. `glass_oca`: Front outer touch glass & OCA
  9. `sim_tray`: SIM card tray
  10. `other`: Screws, mesh, brackets, ICs

### 3.3 Adding New Phone Models & Custom Spare Parts in `SparesScreen`
In wholesale markets, new phone models and aftermarket accessories arrive constantly. Inside `SparesScreen`:
- **`+ Add Phone Model`**: Modal to register a newly launched model:
  - `Enter brand` (dropdown or custom)
  - `Enter model name`
  - `Enter release year / series (optional)`
- **`+ Add Spare Part / Product`**: Modal to add a new spare part or accessory to any selected model:
  - `Enter part name`
  - `Select part category`
  - `Enter part code / battery number (optional)`
  - `Enter wholesale price (optional)`
  - `Enter cost price (optional)`
- Newly created models and parts are saved to the cloud, immediately reflected in their catalog.

### 3.4 Cross-Model Compatibility & User Customization
- Built-in cross-model compatibility notes (e.g. *"Battery BN53 fits Redmi Note 9 Pro / Poco M2 Pro"*).
- **User Compatibility Editor:** Wholesalers can add or edit their own cross-model compatibility tags for any part, allowing their bench knowledge to be saved and searchable across the catalog.

### 3.5 Day Book Entry Auto-Suggestion (`BookScreen`)
When Wholesaler Mode is active:
- When a user opens the **Add Entry** or **Edit Entry** sheet in the `Day Book` (`BookScreen`), typing in the **Item / Description** field triggers a real-time auto-suggest dropdown querying the master spares catalog.
- **Instant Search:** Typing `note 10` or `bn53` or `y20 dis` immediately displays matching parts:
  - *Redmi Note 10 • Display Combo*
  - *Redmi Note 10 • Battery (BN53)*
  - *Vivo Y20 • Charging CC Board*
- **1-Tap Selection:** Tapping a suggested part automatically populates the `Item` field and sets the default wholesale price if configured, making daily wholesale transaction logging fast and error-free.

---

## 4. B2B Clients & Credit Management (`ClientsScreen`)

### 4.1 Strict Terminology & Input Rules
- **Credit Only:** The system strictly uses the business term **"Credit"** (e.g., *Credit Balance*, *Credit Given*, *Credit Settled*, *Credit History*). Zero colloquial terms are permitted.
- **Neutral Placeholders:** All form inputs must strictly use neutral, descriptive placeholders:
  - `Enter client shop name`
  - `Enter technician name`
  - `Enter 10-digit mobile number`
  - `Enter market area or address`
  - `Enter credit limit (optional)`
  - `Enter amount`
  - `Enter note or bill description`

### 4.2 Screen Layout & Workflows
1. **Top Metric Cards:**
   - **Total Credit Due:** Aggregate outstanding balance to be collected across all registered retail shops.
   - **Active Clients:** Total client shops registered.
2. **Client Directory:**
   - Search by client shop name, technician name, or phone.
   - Filter chips: `All`, `Has Credit Due`, `Settled`.
   - Card layout displaying:
     - Client Shop Name & Contact Person
     - Phone Number with quick WhatsApp & Call actions
     - Highlighted **Credit Balance** (e.g. `₹14,500 Credit Due`).
3. **Client Detail & Credit Ledger View:**
   - Tapping a client displays their full transaction ledger:
     - Chronological list of credit sales and payment settlements.
     - Running credit balance after each entry.
4. **Core Client Actions:**
   - **Record Payment Received:** Modal to record payments (*Cash, UPI, Bank Transfer, Cheque*) with date and reference note; immediately reduces the client's credit balance.
   - **Add Credit Sale / Quick Bill:** Modal to select parts from active stock, set quantities and wholesale rates, and append directly to the client's credit ledger.
   - **1-Tap WhatsApp Credit Statement:** Formats and launches a professional WhatsApp message:
     ```
     *Payment Statement*
     Client: [Client Shop Name]
     From: [Wholesaler Shop Name]
     Current Credit Balance: ₹14,500
     Last Payment: ₹5,000 received on 05 Oct 2026
     UPI for Settlement: [Wholesaler UPI ID]
     Thank you for your business!
     ```

---

## 5. Data Models & Offline Storage

### 5.1 TypeScript Definitions (`src/types/wholesale.ts`)

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

### 5.2 Local Database (Dexie IndexedDB Upgrade)
In `src/db/db.ts`:
- Upgrade schema:
  - `clients`: `'++id, cloudId, shopName, phone, currentCreditBalance, createdAt, updatedAt, syncStatus'`
  - `clientTransactions`: `'++id, cloudId, clientCloudId, type, amount, date, createdAt, updatedAt, syncStatus'`
  - `customCompatibilities`: `'++id, cloudId, partKey, updatedAt, syncStatus'`
- Dexie lifecycle hooks automatically populate `cloudId`, timestamps, and `syncStatus: 'pending'`.
- Cloud sync via `src/firebase/sync.ts` mirrors clients and transactions to Firestore when online.

---

## 6. Implementation Stages & Verification Plan

1. **Stage 1: Types & Local Database Schema**
   - Add wholesale types in `src/types/wholesale.ts`.
   - Update `AppSettings` with `wholesaleMode?: boolean`.
   - Upgrade Dexie database schema and sync hooks in `src/db/db.ts`.
   - Unit tests for Dexie CRUD operations and credit balance calculations.

2. **Stage 2: Adaptive Navigation & Settings Toggle**
   - Add Wholesale Mode toggle to `SettingsScreen.tsx` and onboarding flow in `OnboardingScreen.tsx`.
   - Update `TabBar.tsx` and `App.tsx` to conditionally mount `SparesScreen` and `ClientsScreen` instead of `RepairsScreen` and `ToolsScreen` when `wholesaleMode` is true.
   - Component tests for tab bar switching.

3. **Stage 3: Master Spares Catalog Service & UI (`SparesScreen`)**
   - Implement cloud master catalog service (`src/firebase/masterSpares.ts`) with pre-loaded models/spares and custom additions.
   - Build `SparesScreen.tsx` with search, brand filtering, model/part cards, and cross-model compatibility editor.
   - Implement "+ Add Phone Model" and "+ Add Spare Part" modals saving to cloud.
   - Wire Day Book (`BookScreen.tsx`) `Item` input with auto-suggest dropdown querying master spares.
   - Integration tests for catalog search, custom part additions, and auto-suggest.

4. **Stage 4: B2B Clients & Credit Management (`ClientsScreen`)**
   - Build `ClientsScreen.tsx` with total credit due metrics, client search, and filter chips.
   - Implement Add/Edit Client modal with neutral placeholders.
   - Implement Client Detail ledger view, Record Payment modal, and Add Credit Sale modal.
   - Implement 1-tap WhatsApp credit statement generation.
   - Unit and integration tests for credit calculations and client management.

5. **Stage 5: Full Build & Verification**
   - Run complete test suite (`npx vitest run`).
   - Run TypeScript typecheck & production build (`npm run build`).
