# How to Build & Publish My Mobile Shop to Apple App Store from Windows

> **You do NOT need to buy or own a physical Mac.**
>
> Apple requires macOS/Xcode to compile iOS binaries, but you can run macOS in the cloud for free using **GitHub Actions** (included with your GitHub account) or **Codemagic**.
>
> Everything you do — coding, committing, signing, and triggering builds — happens directly on your Windows PC and your web browser.

---

## Architecture: The Windows-to-App-Store Pipeline

```
  [ Your Windows PC ] ──> git push ──> [ GitHub Repository ]
                                                │
                                                ▼
                                    [ Cloud macOS Runner ]
                                    • Runs macOS 14 & Xcode 15/16
                                    • Builds Vite dist & syncs Capacitor
                                    • Codesigns with your Apple certs
                                    • Generates signed .ipa file
                                                │
                                                ▼
                              [ App Store Connect / TestFlight ]
                              (Ready for beta testing & App Review)
```

---

## Step 1: Enroll in the Apple Developer Program (From Windows Browser)

1. Open your browser on Windows and visit: [developer.apple.com/programs](https://developer.apple.com/programs/)
2. Sign in with your Apple ID (or create one).
3. Complete enrollment ($99 USD/year or ₹8,299 INR/year).
4. Approval usually takes between a few hours to 24–48 hours.

---

## Step 2: Register App ID & Generate Signing Keys (From Browser)

You do **NOT** need macOS to create Apple certificates or profiles. Open [developer.apple.com/account](https://developer.apple.com/account/):

### A. Register the Bundle ID
1. Go to **Certificates, Identifiers & Profiles** > **Identifiers**.
2. Click **+** > **App IDs** > **App**.
3. **Description:** `My Mobile Shop`
4. **Bundle ID (Explicit):** `online.mymobileshop.app`
5. Enable Capabilities:
   - **In-App Purchase** (checked by default)
6. Click **Continue** > **Register**.

### B. Create an App Store Distribution Certificate
1. Go to **Certificates** > click **+**.
2. Select **Apple Distribution**.
3. It asks for a Certificate Signing Request (CSR):
   - On Windows, you can generate a CSR in 5 seconds using OpenSSL in PowerShell:
     ```powershell
     openssl req -nodes -newkey rsa:2048 -keyout mymobileshop.key -out mymobileshop.csr -subj "/CN=My Mobile Shop/O=My Mobile Shop/C=IN"
     ```
   - Upload `mymobileshop.csr` to Apple.
   - Download the generated `distribution.cer`.
   - Export to `.p12` format with this command:
     ```powershell
     openssl x509 -in distribution.cer -inform DER -out distribution.pem -outform PEM
     openssl pkcs12 -export -inkey mymobileshop.key -in distribution.pem -out distribution.p12
     ```
     *(Enter a password when prompted, e.g., `MySecretP12Pass2026!`)*

### C. Create an App Store Distribution Provisioning Profile
1. Go to **Profiles** > click **+**.
2. Select **App Store** (under Distribution) > click **Continue**.
3. Select your App ID: `online.mymobileshop.app`.
4. Select the Distribution Certificate you just created.
5. Profile Name: `MyMobileShop_AppStore_Profile`.
6. Click **Generate** and download `MyMobileShop_AppStore_Profile.mobileprovision`.

### D. Generate App Store Connect API Key (For automated TestFlight upload)
1. Go to [appstoreconnect.apple.com](https://appstoreconnect.apple.com) > **Users and Access** > **Integrations** > **App Store Connect API**.
2. Click **+** to generate a key.
3. **Name:** `GitHub-CI`
4. **Access:** `App Manager` or `Admin`.
5. Click **Generate**.
6. Note down:
   - **Issuer ID** (UUID at top of page)
   - **Key ID** (10-character string)
   - Click **Download API Key** (downloads `AuthKey_XXXXXXXXXX.p8`). *Note: Apple only lets you download this once.*

---

## Step 3: Add Secrets to Your GitHub Repository

On your GitHub repo page:
1. Go to **Settings** > **Secrets and variables** > **Actions**.
2. Click **New repository secret** for each of the following:

| Secret Name | Value | How to generate on Windows |
| :--- | :--- | :--- |
| `BUILD_CERTIFICATE_BASE64` | Base64 string of your `.p12` file | `[Convert]::ToBase64String([IO.File]::ReadAllBytes("distribution.p12")) \| Set-Clipboard` |
| `P12_PASSWORD` | Password you set on the `.p12` | Plain text password |
| `BUILD_PROVISION_PROFILE_BASE64` | Base64 string of `.mobileprovision` | `[Convert]::ToBase64String([IO.File]::ReadAllBytes("MyMobileShop_AppStore_Profile.mobileprovision")) \| Set-Clipboard` |
| `PROVISIONING_PROFILE_NAME` | Profile name in Apple portal | `MyMobileShop_AppStore_Profile` |
| `APPLE_TEAM_ID` | 10-char Team ID from Apple portal | Found at top right of developer.apple.com |
| `KEYCHAIN_PASSWORD` | Any temporary random password | E.g. `TempKeychainPass99!` |
| `APP_STORE_CONNECT_KEY_ID` | 10-char Key ID from Step 2D | E.g. `2X9R4ABCD2` |
| `APP_STORE_CONNECT_ISSUER_ID` | Issuer UUID from Step 2D | E.g. `69a6de70-xxxx-xxxx-xxxx-xxxxxxxxxxxx` |
| `APP_STORE_CONNECT_API_KEY_BASE64` | Base64 string of `.p8` key | `[Convert]::ToBase64String([IO.File]::ReadAllBytes("AuthKey_XXXXXXXXXX.p8")) \| Set-Clipboard` |

---

## Step 4: Run the Build from Windows (1-Click)

Whenever you want to build and submit a new version to TestFlight:

1. Push your latest code changes to your GitHub repo.
2. Go to your GitHub repository in your web browser.
3. Click the **Actions** tab at the top.
4. In the left sidebar, click **Build & Deploy iOS App to TestFlight**.
5. Click the **Run workflow** dropdown button on the right.
6. Leave "Upload directly to TestFlight" checked, and click **Run workflow**.

GitHub's cloud Mac runner will automatically:
1. Check out your code
2. Run `npm run build` & `npx cap sync ios`
3. Decrypt and install your Apple certificates
4. Compile the native iOS `.ipa` binary
5. Upload the `.ipa` directly to TestFlight in App Store Connect
6. Provide a downloadable `.ipa` artifact under the Actions run summary so you have a local copy on your Windows PC!

---

## Alternative Option: Codemagic (No-Code Cloud GUI)

If you prefer a visual web dashboard instead of GitHub Actions:
1. Sign up for free at [codemagic.io](https://codemagic.io) using your GitHub account.
2. Select your `My Mobile Shop` repository.
3. Select **Capacitor** workflow.
4. Under **Distribution**, enter your App Store Connect credentials.
5. Click **Start new build**. Codemagic will build on their cloud Macs and deliver the build directly to TestFlight!
