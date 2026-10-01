# Benefit-Focused Landing Page & Route Restructuring Design

**Date:** 2026-10-01  
**Status:** Approved  
**Author:** Antigravity  

## 1. Problem & Goal

Currently, `mymobileshop.online` serves the application directly or falls back to an unauthenticated prompt. To establish strong credibility, prevent automated heuristic flags (such as Google Safe Browsing deceptive pages false positives), and drive shop conversions, we need:
1. A compelling, benefit-focused marketing landing page at `/`.
2. A structured authentication & onboarding sequence: `/` &rarr; `/login` &rarr; `/onboarding` &rarr; `/app`.
3. Seamless client-side routing with `react-router-dom` and Vercel SPA rewrite support.

## 2. Route Architecture

Using `react-router-dom` (v6+), the application URLs are structured as follows:

| Path | Component | Description & Access Control |
|---|---|---|
| `/` | `LandingPage` | Public marketing page emphasizing tangible business benefits for mobile shop owners. Header includes "Sign In" and "Get Started" CTAs. If an authenticated user visits `/`, the primary hero button offers "Open Your Shop" (&rarr; `/app`). |
| `/login` | `LoginScreen` | Public / Guest auth screen. Supports Shop ID/Password, Google OAuth, and Phone OTP. Upon successful authentication:<br/>• If user has no existing settings/shop name, redirect to `/onboarding`.<br/>• If shop profile exists, redirect to `/app`. |
| `/onboarding` | `OnboardingScreen` | Protected setup wizard. If user is unauthenticated, redirect to `/login`. Prompts for Shop Name and whether repairs are offered. Upon submission, initializes settings in local DB and redirects to `/app`. |
| `/app/*` | `App` (Day Book & Repairs) | Protected application. If unauthenticated, redirect to `/login`. If user has no settings, redirect to `/onboarding`. Houses existing bottom navigation tabs (`book`, `repairs`, `reports`, `settings`). |
| `*` | Redirect | Any unrecognized route navigates to `/`. |

## 3. Benefit-Driven Landing Page Specifications (`src/screens/LandingPage.tsx`)

The landing page must focus strictly on **concrete owner benefits and daily outcomes**, avoiding technical or backend jargon (no mentions of IndexedDB, Firebase, PWA workers, etc.).

### 3.1 Header / Navigation
- Left: App logo icon + "My Mobile Shop".
- Center/Right: "Benefits", "Features", "Pricing", "Support".
- Action Buttons:
  - "Sign In" button &rarr; navigates to `/login`.
  - "Get Started" button &rarr; navigates to `/login?mode=register`.

### 3.2 Hero Section
- **Headline:** *"Run Your Mobile Shop Without the Daily Notebook Chaos"*
- **Subheading:** *"Track daily cash & UPI in seconds, manage customer phone repairs without missed deliveries, and send professional WhatsApp repair receipts—all from your phone."*
- **Key Metric Badges:**
  - ⚡ 5-second entry speed
  - 📱 Instant WhatsApp repair receipts
  - 📶 Opens instantly even without shop internet
- **Call-to-Action Buttons:**
  - *"Start Your Free Shop Ledger"* &rarr; `/login?mode=register`
  - *"Sign In to Existing Shop"* &rarr; `/login`
- **Visual App Showcase:**
  - iOS-style mockup preview showing the daily ₹IN / ₹OUT balance card and repair status badges.

### 3.3 The "6 Daily Headaches Solved" Grid
1. **Closing Balance Clarity:** Never wonder where cash went at closing. See exact cash-in-hand, UPI collections, and net profit with zero calculation errors.
2. **Customer Repair Tracking:** No more angry follow-ups or lost devices. Status badges (Received, Waiting for Parts, Ready, Delivered) show workbench progress at a glance.
3. **Professional WhatsApp Receipts:** Avoid customer disputes over quotes or prior phone damage. Send detailed job cards directly to customer WhatsApp.
4. **Never Blocked by Wi-Fi Outages:** Counter transactions never freeze. Records instantly with zero lag even when shop connection drops.
5. **Safe From Lost or Broken Phones:** Switching phones or upgrading devices restores all historical shop books and customer records effortlessly.
6. **Stress-Free Month-End Accounting:** Generate 1-tap summary reports ready for tax filing or business review.

### 3.4 "A Day at Your Shop" Workflow
- **Morning:** Open the day book and set starting cash.
- **Midday:** Log quick sales and accessory purchases between counter customers.
- **Afternoon:** Mark repaired phones "Ready" and notify customers via WhatsApp in 1 tap.
- **Night Closing:** Compare cash drawer with digital total, close the book, and go home relaxed.

### 3.5 Transparent Pricing Section
- **Affordable Plans for Every Shop:**
  - **Monthly:** ₹99 / month — cancel anytime.
  - **Yearly:** ₹999 / year — save 16% (best value for busy shops).
- **Everything Included:** Unlimited daily transactions, unlimited customer repair cards, WhatsApp receipts, and secure cloud backup.
- Trust guarantee: No ads, no selling customer data, cancel anytime.

### 3.6 Footer & Compliance
- Direct buttons to open `LegalModal` ("Privacy Policy" & "Terms of Service").
- Direct support link: `support@mymobileshop.online`.
- Copyright & business identity.

## 4. Onboarding & Login Sequencing Logic

1. **Unauthenticated User Entry:**
   - Visits `https://www.mymobileshop.online/` &rarr; Sees `LandingPage`.
   - Clicks "Get Started" &rarr; Navigates to `/login?mode=register`.
   - Clicks "Sign In" &rarr; Navigates to `/login`.
2. **Authentication Completion:**
   - After successful authentication (Password, Google, or Phone OTP):
   - Check if settings exist (query `db.settings.toArray()`).
   - If empty: Navigate to `/onboarding`.
   - If populated: Navigate to `/app`.
3. **Onboarding Submission:**
   - User inputs Shop Name and selects repair preferences.
   - On completion: Settings initialized in Dexie DB.
   - Navigate to `/app`.
4. **App Protection:**
   - Navigating directly to `/app` without login &rarr; Redirects to `/login`.
   - Navigating directly to `/app` with login but no settings &rarr; Redirects to `/onboarding`.

## 5. Vercel SPA Routing Configuration

Add `vercel.json` in the project root:
```json
{
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```
This guarantees that direct URL entry, bookmarks, or browser reloads on `/login`, `/onboarding`, or `/app` route to `index.html` without returning Vercel 404s.

## 6. Testing Strategy

- `tests/routing.test.ts`:
  - Verify routing configuration renders `LandingPage` at `/`.
  - Verify `/login` displays login options and navigates to `/onboarding` for new users.
  - Verify `/onboarding` requires authentication.
  - Verify `vercel.json` exists with correct rewrite rules.
- Existing tests:
  - Ensure all 37 tests across existing test files remain 100% passing.
