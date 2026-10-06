# Design Specification: Shop Tools Hub & Used Phone System

**Date:** 2026-10-07  
**Status:** Approved for Implementation  
**Target:** Navigation restructuring (Reports to Settings, Tools to TabBar), Concept 4 Bento Grid Tools Hub, and complete Serialized Pre-Owned Phone Intake with Seller KYC.

---

## 1. Overview & Objectives

Mobile shop retailers need specialized utilities that go beyond day book accounting and repair tickets. Specifically:
1. **Navigation Restructuring:** Reports moves into Settings with smooth back navigation, freeing up a dedicated spot on the bottom navigation bar for **Tools**.
2. **Shop Tools Hub (Concept 4 Bento Grid):** An interactive, Apple iOS-style Bento Grid hosting daily power tools.
3. **Used Phone Hub (Flagship Tool):** A serialized device intake and management system with strict legal protection:
   - 15-digit IMEI tracking (Luhn checksum validation).
   - Seller KYC: Name, mobile number, Government ID details, and compressed ID photo capture.
   - 1-Tap WhatsApp Owner Transfer Declaration to obtain verifiable seller confirmation.
   - Simplified device attributes: **no cosmetic grading or battery health** to keep real-world shop operations fast and friction-free.
   - Stock status tracking (`in_stock` / `sold`) and Day Book auto-integration (Cash Out on buyback, Cash In on sale).
4. **Interactive Utilities:**
   - **1-Tap WhatsApp Showcase Broadcast:** Formats active used inventory into a clean, professional text catalog to send to inquiring customers.
   - **Customer EMI & Loan Calculator:** Interactive monthly payment calculator with live slider and WhatsApp quotation sharing.
   - **CEIR Stolen Check:** 15-digit IMEI validator and direct portal shortcut for government device blacklisting verification.

---

## 2. Navigation & Architecture

### 2.1 TabBar Restructuring (`src/components/TabBar.tsx`)
- Update `TabType`: `'book' | 'stock' | 'repairs' | 'tools' | 'settings'`
- Replace the `reports` tab button with `tools`:
  - Icon: `LayoutGrid` from `lucide-react`
  - Label: `Tools`
  - Badge: Dynamic count of active unsold used phones in stock

### 2.2 Relocating Reports into Settings (`src/screens/SettingsScreen.tsx` & `src/screens/ReportsScreen.tsx`)
- In `SettingsScreen`, add a prominent top-level navigation row in the first section:
  - Title: **📊 Reports & Analytics**
  - Subtitle: *View monthly cash flow, day-by-day profits & repair metrics*
  - Interaction: Tapping opens `ReportsScreen` via full view state.
- In `ReportsScreen`:
  - Accepts `onBack?: () => void` prop.
  - Renders a clean iOS top navigation bar with `← Settings` button to return smoothly.

### 2.3 Main App Wiring (`src/App.tsx`)
- Support `currentTab === 'tools'`.
- Mount `ToolsScreen` with relevant props (`language`, `shopName`, `shopPhone`, `shopAddress`, `isReadOnly`, `onOpenPaywall`).

---

## 3. Data Models & Database Schema

### 3.1 Type Definitions (`src/types/index.ts`)

```typescript
export type UsedDeviceStatus = 'in_stock' | 'sold';

export interface UsedDevice extends SyncMetadata {
  id?: number;
  brand: string;
  model: string;
  imei: string; // 15 digits validated
  color?: string;
  storage?: string;
  accessories?: string[]; // e.g. ['Box', 'Charger', 'Bill']
  purchasePrice: number;
  sellingPrice?: number;
  purchaseDate: string; // 'YYYY-MM-DD'
  notes?: string;
  
  // Seller KYC
  sellerName: string;
  sellerPhone: string;
  sellerGovtIdType?: 'Aadhaar' | 'Driving License' | 'Voter ID' | 'PAN' | 'Other';
  sellerGovtIdNumber?: string;
  sellerIdPhotoUrl?: string; // compressed base64 / dataUrl (< 120KB)

  // Status & Resale details
  status: UsedDeviceStatus;
  soldPrice?: number;
  soldDate?: string;
  buyerName?: string;
  buyerPhone?: string;

  createdAt: number; // timestamp ms
}
```

### 3.2 Dexie Schema Migration (`src/db/db.ts`)
- Increment Dexie database version to declare table:
  `usedDevices: '++id, imei, status, brand, model, purchaseDate, createdAt, syncStatus, deletedAt'`
- Helper functions:
  - `addUsedDevice(device: Omit<UsedDevice, 'id'>, createDayBookEntry?: boolean)`: Adds device and optionally creates a Cash Out entry in Day Book.
  - `updateUsedDevice(id: number, changes: Partial<UsedDevice>)`
  - `markUsedDeviceSold(id: number, saleData: { soldPrice: number; buyerName?: string; buyerPhone?: string; soldDate: string }, createDayBookEntry?: boolean)`: Marks status as `sold` and optionally creates Cash In entry.
  - `softDeleteUsedDevice(id: number)`

---

## 4. Screen Specifications

### 4.1 ToolsScreen (`src/screens/ToolsScreen.tsx`) - Concept 4 Bento Grid
- **Top Hero Card: Pre-Owned Phone Hub (Full Width)**
  - Gradient purple background with sleek styling.
  - Live statistics: **X In Stock** badge and total estimated stock value.
  - Quick action: `+ New Intake` button opens `AddEditUsedPhoneSheet`.
  - Tap card opens full `UsedPhonesView`.
- **Middle Left Bento Card: 📢 WhatsApp Stock Broadcast**
  - Displays count of available devices.
  - 1-tap opens broadcast modal previewing the formatted text:
    - Shop header, list of in-stock models with storage, color, price, accessories.
    - Shop address and contact number.
    - Actions: `Share to WhatsApp` (`whatsapp://send?text=...`) and `Copy to Clipboard`.
- **Middle Right Bento Card: 🧮 Customer EMI & Loan Calculator**
  - Interactive quick calculator:
    - Device Price input
    - Down Payment input (₹)
    - Loan Tenure (3, 6, 9, 12, 18 months)
    - Interest Rate %
    - Live output: Monthly EMI (₹), Total Payable (₹), Total Interest (₹).
    - `Share Quotation on WhatsApp` button formatting the calculation for the customer.
- **Bottom Bento Card: 🛡️ CEIR Stolen Device Check**
  - Input field for 15-digit IMEI with Luhn checksum status indicator.
  - 1-tap button to open the Government CEIR portal (`https://www.ceir.gov.in/Device/CeirIMEIVerification.jsp`) with IMEI automatically copied to clipboard.

---

### 4.2 UsedPhonesView (`src/screens/UsedPhonesView.tsx`)
- Top Bar: Back to Tools, Title "Pre-Owned Phones", Search bar, Filter segment: `All` | `In Stock` | `Sold`.
- Device List:
  - Model & Brand, Color & Storage.
  - IMEI (formatted with quick copy).
  - Purchase cost vs Resale price (projected profit indicator).
  - KYC verified badge (tap to view seller details and ID snapshot).
- Actions per card:
  - **View KYC:** Modal displaying seller name, phone, ID number, and ID photo.
  - **Mark as Sold:** Modal collecting buyer name, sale price, and Day Book Cash In option.
  - **Share on WhatsApp:** Single-device spec card for customer inquiries.
  - **Edit / Delete.**

---

### 4.3 AddEditUsedPhoneSheet (`src/screens/AddEditUsedPhoneSheet.tsx`)
- Responsive bottom sheet / modal.
- **Device Details:**
  - Brand (quick chips: Apple, Samsung, OnePlus, Vivo, Oppo, Realme, Xiaomi, Other) + Model input.
  - 15-digit IMEI with real-time Luhn algorithm validation (shows green check or red warning).
  - Storage (e.g. 64GB, 128GB, 256GB chips) & Color.
  - Accessories Checkboxes: Box, Bill, Original Charger, Earphones.
  - Purchase Cost (₹) & Target Reselling Price (₹).
  - Checkbox: `Record Cash Out in Day Book (₹...)` (default checked).
- **Seller KYC:**
  - Seller Name & Mobile Number (10 digits).
  - Govt ID Type (Aadhaar / Voter ID / Driving License / PAN) & ID Number.
  - Govt ID Photo: Camera capture / file picker with automatic browser image compression to < 120KB.
- **1-Tap WhatsApp Legal Transfer Declaration:**
  - Button: `Send Transfer Declaration on WhatsApp`
  - Opens WhatsApp with seller's phone:
    > *"I, [Seller Name], confirm that I am the rightful owner of [Model] (IMEI: [IMEI]) and have sold it to [Shop Name] on [Date] for ₹[Amount]. I declare this device is not lost, stolen, or under finance block."*
- Save action saves to Dexie and updates live counters.

---

## 5. Error Handling & Edge Cases
1. **IMEI Validation:** Enforces 15 numeric digits and checks Luhn checksum formula; alerts user if invalid.
2. **Offline & Image Storage:** ID photo is compressed to canvas JPEG (< 120KB, max 800px) before IndexedDB storage, preventing quota errors.
3. **Ledger Integrity:** If user deletes or edits a used device, associated Day Book entries remain intact with appropriate notes.
4. **Permissions:** Safe camera / file picker fallbacks for photo capture.

---

## 6. Testing & Verification Plan
1. **Unit & Calculation Tests:**
   - IMEI Luhn checksum verification test.
   - EMI calculation accuracy test.
   - WhatsApp catalog message formatting test.
2. **Database & Schema Tests:**
   - Dexie migration and CRUD operations on `usedDevices` table.
   - Day Book automatic Cash Out / Cash In linkage.
3. **Navigation & Flow Verification:**
   - TabBar switching between Book, Stock, Repairs, Tools, Settings.
   - Opening Reports from Settings and navigating back.
   - Opening Tools and launching each Bento card.
