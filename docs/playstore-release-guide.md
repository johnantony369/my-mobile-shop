# Google Play Store Release & Publishing Guide: My Mobile Shop (MMS)

This guide documents the exact end-to-end steps to generate your release **Android App Bundle (`.aab`)**, configure signing keys, and successfully pass Google Play Store review for **My Mobile Shop**.

---

## 1. Application Details

* **App Name:** My Mobile Shop
* **Package Name (Application ID):** `online.mymobileshop.app`
* **Target SDK:** 36 (Android 15 / 14 compatible; exceeds Google Play minimum requirement of 34)
* **Minimum SDK:** 24 (Android 7.0 Nougat+)
* **Architecture:** Offline-First PWA wrapped via Capacitor Android

---

## 2. Generating Your Production Release Keystore

Before building your production bundle, create a cryptographically secure release keystore.

Run this command in PowerShell or Terminal (keep your passwords safe and backed up in a secure password manager):

```bash
keytool -genkey -v -keystore mymobileshop-release-key.jks -alias mymobileshop -keyalg RSA -keysize 2048 -validity 10000
```

> [!CAUTION]
> **Backup your `.jks` file:** If you lose this keystore file or forget the passwords, you will permanently lose the ability to update this app on Google Play. Keep a copy in Google Drive or offline encrypted backup.

---

## 3. Building the Android App Bundle (`.aab`)

Google Play mandates the **Android App Bundle (`.aab`)** format for all new app releases (standalone `.apk` is only used for local test distribution).

### Step A: Update Web Assets
Whenever you make changes to the React code, build and sync to Android:

```bash
npm run cap:build
```
*(This automatically runs `tsc && vite build` and executes `cap sync android`)*

### Step B: Build Release Bundle via Gradle

If you have Android Studio / JDK installed:
```powershell
cd android
./gradlew bundleRelease
```
The output file will be generated at:
```
android/app/build/outputs/bundle/release/app-release.aab
```

### Step C: (Alternative) Build Directly in Android Studio
1. Open Android Studio.
2. Select **Open an existing project** and choose the `f:\My Mobile Shop\android` folder.
3. Wait for Gradle sync to complete.
4. From the top menu, click **Build** > **Generate Signed Bundle / APK...**
5. Select **Android App Bundle**, click **Next**.
6. Select your `mymobileshop-release-key.jks`, enter your passwords, and choose **release**.
7. Android Studio will generate the signed `.aab` file ready for upload.

---

## 4. Google Play Console Listing & Policy Requirements

### A. URLs Required
* **Privacy Policy URL:** `https://mymobileshop.online/privacy`
* **Account Deletion Request URL:** `https://mymobileshop.online/delete-account`
* **Terms of Service URL:** `https://mymobileshop.online/terms`

### B. In-App Payments Compliance
Under Google Play Developer Policy, MMS complies by:
* Hiding external web checkout links (Razorpay) when running inside the Android app wrapper.
* Displaying a **License Key Redemption** box and direct WhatsApp support assistance for merchants who purchased shop licenses offline or via web.

### C. Data Safety Questionnaire Answers
When filling out the **Data Safety** questionnaire in Google Play Console:
1. **Does your app collect or share user data?** Yes.
2. **Is all user data encrypted in transit?** Yes (all Firebase sync and API calls use HTTPS/TLS).
3. **Do you provide a way for users to request data deletion?** Yes (via in-app Settings > Delete Account, and web URL `/delete-account`).
4. **Data Types to Declare:**
   * **Personal Info:** Name, Email Address, Phone Number (optional login / customer repair receipt contact).
   * **Financial Info:** Daily cashbook totals, transaction amounts (stored locally in IndexedDB and backed up to Firebase Firestore for shop accounting).
   * **Device or other IDs:** Anonymous Firebase App Check / installation identifiers for crash tracking.

### D. App Access / Demo Account
When Google testers review your app, they need to log in to test:
* Go to **Policy and programs** > **App content** > **App access**.
* Select **All or some functionality is restricted**.
* Provide a demo account or instructions:
  * "Sign in using Demo Account: demo@mymobileshop.online / password" OR
  * "Tap 'Continue as Guest' or 'Set up Shop' to access the local daybook registers."

### E. 14-Day Closed Testing Rule (For Personal Developer Accounts)
* If your Google Play Developer Console account was created after **November 13, 2023**, Google mandates running a **Closed Test with at least 20 testers opted-in for 14 continuous days**.
* Invite friends, colleagues, or mobile repair shop owners via email to join your Closed Testing track.
* Keep the track active for 14 days before submitting the "Apply for Production" request.

---

## 5. Store Listing Creative Assets Checklist

Prepare these assets before creating the store listing:

1. **App Title:** `My Mobile Shop - Day Book` (max 30 characters)
2. **Short Description:** `Digital daybook, repair ticket tracking & inventory for mobile shops.` (max 80 characters)
3. **Full Description:** Detailed overview highlighting offline register, repair tickets, pre-owned phone ledger, PDF bills, and cloud sync. (up to 4000 characters)
4. **App Icon:** `512 x 512 px` (PNG, 32-bit color, no transparency)
5. **Feature Graphic:** `1024 x 500 px` (PNG or JPEG, no transparency, 16:9 banner)
6. **Phone Screenshots:** At least 4-8 screenshots (1080x1920 or 1080x2400) of:
   * Daily Ledger / Cash In & Out
   * Mobile Repair Job Cards & Status
   * Pre-Owned / Used Phone Inventory
   * Invoice / Receipt PDF preview
