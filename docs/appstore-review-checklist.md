# Apple App Store Review — Pre-Flight Compliance Checklist

Before clicking **"Submit for Review"** in App Store Connect, verify that every item on this checklist is completed. This checklist maps directly to Apple's **App Store Review Guidelines**.

---

## 1. Guideline 3.1.1 — In-App Purchases & Payments (🔴 High Priority)

- [x] **StoreKit 2 / RevenueCat Integration:** Pro subscriptions (`monthly` and `yearly`) are processed exclusively through Apple In-App Purchase.
- [x] **No External Web Payment Deeplinks on iOS:** Razorpay payment links are completely hidden on iOS native devices (`isiOSNativeApp()`).
- [x] **Restore Purchases Button:** A visible, functional "Restore Purchases" button is provided in:
  1. `SettingsScreen` (under Section 3: Activation & Pro Plan)
  2. `PaywallModal` (directly below the subscription buttons)
- [x] **Terms of Use (EULA) & Privacy Policy:** Direct links are present on the paywall screen, login modal, landing page, and settings screen.
- [x] **Subscription Details Disclosed:** Subscription title, price, duration, and auto-renewal terms are clearly shown before purchase.

---

## 2. Guideline 5.1.1 — Privacy & Permission Strings (🔴 High Priority)

- [x] **`NSCameraUsageDescription` in `Info.plist`:**
  *"My Mobile Shop uses your camera to scan product barcodes and capture repair condition photos or device inspection slips."*
- [x] **`NSPhotoLibraryUsageDescription` in `Info.plist`:**
  *"My Mobile Shop accesses your photos to attach existing repair receipts and device trade-in photos."*
- [x] **`NSPhotoLibraryAddUsageDescription` in `Info.plist`:**
  *"My Mobile Shop saves generated PDF tax invoices and repair job slips to your photo library."*
- [x] **No Unexpected Permission Prompts:** Camera and photo permissions are only triggered upon user intent (tapping barcode scan or attaching an image), never on app launch.

---

## 3. Guideline 5.1.1(v) — In-App Account Deletion (Required for apps with account creation)

- [x] **In-App Account & Data Deletion:** Accessible via **Settings** > **Delete Account and Data** (`src/screens/legal/DeleteAccountScreen.tsx`).
- [x] **Public Web Account Deletion URL:** Hosted at `https://mymobileshop.online/delete-account` for users requesting cloud data purge without the device.

---

## 4. Guideline 2.1 — Performance & App Completeness

- [x] **No Placeholder Text:** All "Lorem ipsum", placeholder phone numbers, or dummy URLs have been reviewed and replaced.
- [x] **Zero Crashes on Offline Mode:** The app operates seamlessly with zero internet connectivity (IndexedDB local database).
- [x] **App Review Demo Account:** A verified reviewer account is set up with sample data (`apple-reviewer@mymobileshop.online` / `DemoReviewer2026!`).
- [x] **No Alpha Channel in 1024×1024 App Icon:** `public/icon-1024.png` is encoded in 24-bit RGB (Color Type 2, no alpha) to avoid ITMS-90717 build rejection.

---

## 5. Guideline 2.3 — Accurate Metadata & Screenshots

- [x] **Valid Screenshots Uploaded:**
  - 6.7" Display (iPhone 16 Pro Max / 15 Pro Max): `1290 × 2796 px` (`docs/screenshots/ios-6.7/`)
  - 6.5" Display (iPhone 11 Pro Max / XS Max): `1242 × 2688 px` (`docs/screenshots/ios-6.5/`)
- [x] **No Android / Non-Apple Mentions in iOS Screenshots:** Screenshots contain purely native iOS typography, clean status bars, and no Android device frames.
- [x] **Accurate Categorization:** Primary: `Business`, Secondary: `Finance`.

---

## 6. App Review Submission Notes Template

Paste this into the **App Review Information > Notes** field in App Store Connect:

```text
Dear App Review Team,

My Mobile Shop is a business management and daybook app designed for retail mobile phone and repair shops.

Key Information for Reviewers:
1. First Launch / Offline: The app works 100% offline. You can tap "Set up Shop" and enter "Demo Shop" to immediately test the local Daybook, Repairs CRM, and Stock registers.
2. Cloud Account Login (Optional):
   - Email: apple-reviewer@mymobileshop.online
   - Password: DemoReviewer2026!
3. Subscriptions & IAP: We offer Auto-Renewable Subscriptions (Monthly and Yearly) with a 14-day free trial. Test in Sandbox environment via Settings > Upgrade or Book > Upgrade.
4. Restore Purchases: Located in Settings > Activation & Pro Plan and inside the Upgrade sheet.
5. Camera Access: Used solely when the user taps "Scan Product Barcode" or attaches a repair intake photo.

Contact:
Email: support@mymobileshop.online
Website: https://mymobileshop.online
```
