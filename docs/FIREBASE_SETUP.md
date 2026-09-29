# Firebase Setup Guide for "My Mobile Shop"

This guide walks you through setting up Firebase for free cloud backup and multi-device sync in **under 5 minutes**.

---

### Step 1: Create a Firebase Project
1. Go to the [Firebase Console](https://console.firebase.google.com/).
2. Click **"Add project"** (or **"Create a project"**).
3. Name your project (e.g. `my-mobile-shop`).
4. (Optional) Disable Google Analytics to keep it simple, or keep it on.
5. Click **"Create project"**.

---

### Step 2: Register Web App & Get Keys
1. On the project overview page, click the **Web icon (`</>`)** to add a web application.
2. Enter an App nickname (e.g. `My Mobile Shop Web`).
3. (Optional) Uncheck Firebase Hosting for now. Click **"Register app"**.
4. You will see a `firebaseConfig` object looking like:
   ```javascript
   const firebaseConfig = {
     apiKey: "AIzaSy...",
     authDomain: "my-mobile-shop.firebaseapp.com",
     projectId: "my-mobile-shop",
     storageBucket: "my-mobile-shop.firebasestorage.app",
     messagingSenderId: "1234567890",
     appId: "1:1234567890:web:abcdef..."
   };
   ```
5. In your project root, create a file named `.env` (copied from `.env.example`) and paste your values:
   ```env
   VITE_FIREBASE_API_KEY=AIzaSy...
   VITE_FIREBASE_AUTH_DOMAIN=my-mobile-shop.firebaseapp.com
   VITE_FIREBASE_PROJECT_ID=my-mobile-shop
   VITE_FIREBASE_STORAGE_BUCKET=my-mobile-shop.firebasestorage.app
   VITE_FIREBASE_MESSAGING_SENDER_ID=1234567890
   VITE_FIREBASE_APP_ID=1:1234567890:web:abcdef...
   ```

---

### Step 3: Enable Authentication
1. In the Firebase Console left menu, navigate to **Build > Authentication**.
2. Click **"Get started"**.
3. Under the **Sign-in method** tab:
   - **Google**: Click Google, toggle **Enable**, select your support email, and click **Save**.
   - **Phone**: Click Phone, toggle **Enable**, and click **Save**.
     > **Tip for testing Phone OTP without SMS costs:** Under Phone provider settings, scroll down to *"Phone numbers for testing"*. You can add a dummy number (e.g. `+91 9999999999` with code `123456`) to test for free without consuming real SMS quotas!

---

### Step 4: Create Cloud Firestore Database
1. In the left menu, click **Build > Firestore Database**.
2. Click **"Create database"**.
3. Choose your database location (for India/Kerala, choose **`asia-south1` (Mumbai)** for lowest latency).
4. Select **"Start in production mode"** and click **Create**.
5. Once created, go to the **Rules** tab, replace the contents with the following security rule, and click **Publish**:
   ```javascript
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       // Only allow each shop owner to access their own shop records
       match /users/{userId}/{document=**} {
         allow read, write: if request.auth != null && request.auth.uid == userId;
       }
     }
   }
   ```

---

### Step 5: Test & Enjoy
1. Restart your dev server (`npm run dev`) or re-open the app.
2. Go to **Settings > Cloud Sync & Backup**.
3. Click **"Google"** or **"Phone OTP"** to sign in.
4. Your entries, repair jobs, and settings will now automatically sync to the cloud and remain safe forever!
