# Apple App Store Connect — Listing Metadata & Submission Guide

Use this document to copy and paste all listing fields directly into **App Store Connect** (`apps.apple.com`).

---

## 1. App Information

| Field | Value | Character Limit |
| :--- | :--- | :--- |
| **App Name** | `My Mobile Shop — Daily Book` | 27 / 30 chars |
| **Subtitle** | `Shop POS, Repairs & Stock` | 25 / 30 chars |
| **Primary Category** | `Business` | — |
| **Secondary Category** | `Finance` | — |
| **Bundle ID** | `online.mymobileshop.app` | — |
| **SKU** | `MMS-IOS-001` | — |
| **Content Rights** | Contains no third-party content. | — |
| **Age Rating** | 4+ (No unrestricted web access, no gambling/violence) | — |

---

## 2. Keywords & Promotional Text

### Keywords (Exact 100 chars, comma-separated without spaces):
```text
mobile shop,pos,repair tracking,daily ledger,billing,stock register,cash book,gst bill,khata,bahi khata
```

### Promotional Text (166 / 170 chars — can be updated anytime without a new build):
```text
All-in-one offline POS, repair job sheet tracking, accessories stock manager, and GST billing designed specifically for retail mobile shops & repair technicians.
```

---

## 3. Full App Store Description

```text
My Mobile Shop is the all-in-one retail POS, repair tracker, and inventory register built specifically for mobile store owners, smartphone technicians, and accessory retailers.

Whether you run a busy repair counter or a high-volume accessory shop, My Mobile Shop gives you complete control over your daily sales, customer repair status, spare parts inventory, and pre-owned device trade-ins — completely offline-first.

KEY FEATURES FOR MOBILE SHOPS:

1. ULTRA-FAST DAILY DAYBOOK & CASH REGISTER
• Record Cash, UPI, and Card transactions in under 3 seconds with single-hand entry.
• Instant daily opening balance, total sales, expenses, and closing cash-in-hand summary.
• Real-time payment method breakdown with zero mathematical errors.

2. REPAIR CRM & JOB SHEET TRACKING
• Digital intake slips: record customer complaint, passcode/pattern, physical condition, and estimated cost.
• 4-stage job status tracker: Received → Repairing → Ready → Delivered.
• Send instant WhatsApp status updates & pickup ready notices to customers with one tap.
• Maintain full repair history by customer phone number or device IMEI.

3. ACCESSORIES & SPARE PARTS INVENTORY
• Track screen folders, batteries, charging ICs, cables, tempered glass, and phone cases.
• Automatic low-stock visual badges so you never run out of fast-moving items.
• Master Spares Catalog with built-in compatibility lookup across 500+ popular phone models.

4. PRE-OWNED & USED PHONES REGISTER
• Document device purchases with 8-point inspection checklist and customer photo/ID attachment.
• Track IMEI numbers, purchase cost, refurbishing expenses, and selling margins.
• Generate verified second-hand phone purchase receipts.

5. GST & NON-GST INVOICE BILLING
• Print professional bills on Bluetooth thermal printers (58mm / 80mm) or export PDF receipts.
• Support for GST / CGST / SGST tax calculations or simplified non-GST bills.
• One-tap invoice sharing directly via WhatsApp or AirDrop.

6. 100% OFFLINE-FIRST WITH SECURE CLOUD SYNC
• Works continuously without internet in basements and market stalls.
• Automatic background sync to secure cloud when network connectivity is available.
• Full CSV and JSON export for complete data portability.

SUBSCRIPTION & PRICING:
• 14-Day Full Access Free Trial included for all new users.
• Monthly Pro Plan: ₹249 / month
• Yearly Pro Plan: ₹2,499 / year (Save 16%)
• Subscriptions automatically renew unless canceled in Apple ID Account Settings at least 24 hours before the end of the current billing period.
```

---

## 4. App Store URLs

| Field | URL |
| :--- | :--- |
| **Privacy Policy URL** | `https://mymobileshop.online/privacy` |
| **Terms of Service URL** | `https://mymobileshop.online/terms` |
| **Support URL** | `https://mymobileshop.online` |
| **Marketing URL** | `https://mymobileshop.online` |

---

## 5. In-App Purchase Configuration (App Store Connect)

Navigate to **Monetization** > **Subscriptions** in App Store Connect:

1. **Subscription Group:** `My Mobile Shop Pro`
2. **Products:**

| Product ID | Reference Name | Type | Price Tier (India) | Free Trial |
| :--- | :--- | :--- | :--- | :--- |
| `com.mymobileshop.pro.monthly` | Pro Monthly | Auto-Renewable Subscription | ₹249.00 / month | 14 Days |
| `com.mymobileshop.pro.yearly` | Pro Yearly | Auto-Renewable Subscription | ₹2,499.00 / year | 14 Days |

3. **App Store Localization Display Name:** `My Mobile Shop Pro`
4. **App Store Localization Description:** `Unlimited transactions, automatic cloud sync, and customer repair WhatsApp tracking.`

---

## 6. App Review Information (For Apple Reviewers)

When submitting for App Review, provide this in the **App Review Notes** box:

```text
Hello App Review Team,

My Mobile Shop is a commercial daybook and repair tracking tool for mobile repair shop owners.

TESTING INSTRUCTIONS:
1. The app works fully offline on first launch. Tap "Set up Shop" on the onboarding screen and enter any demo shop name (e.g., "Apex Mobile Care") to immediately access the registers.
2. To test cloud authentication, you can sign in using the test account:
   - Email: apple-reviewer@mymobileshop.online
   - Password: DemoReviewer2026!
3. To test In-App Purchases: Sandbox test accounts can test both the Monthly and Yearly subscriptions from Settings > Upgrade or Book > Upgrade.
4. "Restore Purchases" button is accessible in Settings > Activation & Pro Plan and inside the Upgrade sheet.
5. Camera access is used solely when scanning product barcodes and attaching photos to repair job sheets or used phone entries.

Thank you for your review!
```

---

## 7. App Store Screenshots Checklist

Screenshots have been generated and validated at pixel-perfect resolutions:

### Set A: 6.7" Super Retina XDR (iPhone 16 Pro Max / 15 Pro Max)
*Location:* `docs/screenshots/ios-6.7/`
*Resolution:* `1290 x 2796 px`
1. `01_day_book_pos.png` — Daily Cash/UPI/Card POS register & balance
2. `02_repair_crm_jobs.png` — Repair job cards, stages, and status updates
3. `03_accessories_stock.png` — Accessories inventory and low-stock alerts
4. `04_shop_tools_calculator.png` — Customer EMI calculator and shop tools
5. `05_settings_cloud_sync.png` — Store profile and cloud sync settings

### Set B: 6.5" Super Retina (iPhone 11 Pro Max / XS Max / 11)
*Location:* `docs/screenshots/ios-6.5/`
*Resolution:* `1242 x 2688 px`
1. `01_day_book_pos.png`
2. `02_repair_crm_jobs.png`
3. `03_accessories_stock.png`
4. `04_shop_tools_calculator.png`
5. `05_settings_cloud_sync.png`

---

## 8. App Icon Specification

*File:* `public/icon-1024.png` (also copied to `assets/icon-only.png`)
*Size:* `1024 x 1024 px`
*Color Type:* 24-bit RGB (Color Type 2, **Zero Alpha/Transparency Channels** — passes Apple ITMS-90717 check).
