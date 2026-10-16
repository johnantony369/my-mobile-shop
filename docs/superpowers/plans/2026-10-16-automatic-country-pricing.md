# Automatic Country-Specific Pricing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enable automatic country-specific regional pricing detection for web visitors via Vercel Edge Geolocation (`/api/geo`) with instant timezone and native offline fallbacks, while preserving manual selection and zero-emoji UI standards.

**Architecture:** A lightweight serverless edge function (`api/geo.ts`) reads Vercel's incoming `x-vercel-ip-country` request header and responds with cached JSON (`s-maxage=86400`). An asynchronous resolution utility `resolveVisitorCountry()` in `src/utils/pricing.ts` queries this endpoint with a 1.5-second timeout, falling back gracefully to client timezone heuristics (`detectVisitorCountry()`) and default Indian/USD pricing. `LandingPage.tsx` and `PaywallModal.tsx` subscribe to this resolver on mount while always honoring user-stored overrides in `localStorage`.

**Tech Stack:** React 18, TypeScript, Vite, Vercel Serverless Functions, Vitest.

**Spec:** Automated geo-detection for GCC (AE, SA, QA, OM, BH, KW) and Indian (IN) markets without forcing or breaking existing payment checkout.

## Global Constraints

- **Strictly No Emojis**: Country names, buttons, badges, and headers must never contain emojis.
- **No IP Locking**: Visitors must always be able to manually switch country via the UI; manual user preference stored in `mms_pricing_country` always takes priority over auto-detection.
- **Fast & Resilient**: Edge geo fetch must timeout in 1.5 seconds so UI never hangs offline, in local dev, or on slow networks.
- **Git & Deployment Discipline**: No git push or deployment without explicit user instruction.

## Review Focus

1. **Localhost & Development Mode**: When running locally via Vite dev server, `/api/geo` will 404; resolver must catch cleanly and fall back to timezone without throwing or console errors.
2. **Unsupported Countries**: When a visitor arrives from a non-GCC country (e.g. UK, Germany), `/api/geo` returns `GB` or `DE`; resolver must map to Canonical USD (`US`) rather than crashing or showing invalid currency.
3. **Manual Override Precedence**: If a user in UAE manually toggled to "India · INR", refreshing or reopening the paywall must keep "India · INR", never resetting back to UAE.
4. **Offline Resilience**: When the browser has no internet connection, `fetch('/api/geo')` rejects immediately; resolver must catch without unhandled promise rejections.
5. **SPA Routing Integrity**: `vercel.json` rewrite rules must route `/api/geo` to the serverless function while keeping client SPA routing `/(.*)` directed to `/index.html`.

---

## File Structure

- **Create:** `api/geo.ts` - Vercel Serverless Function extracting `x-vercel-ip-country`.
- **Modify:** `vercel.json` - Exclude `/api/` from the wildcard SPA rewrite rule.
- **Modify:** `src/utils/pricing.ts` - Export `resolveVisitorCountry()` with fallback chain and caching.
- **Modify:** `src/screens/LandingPage.tsx` - Trigger auto-detection on mount if no manual override exists.
- **Modify:** `src/components/PaywallModal.tsx` - Sync with `resolveVisitorCountry()` on modal open.
- **Test:** `tests/geoPricing.test.ts` - Unit tests for geo endpoint response, fallback chain, timeouts, and override priority.

---

### Task 1: Vercel Edge Geolocation Endpoint & Routing

**Files:**
- Create: `api/geo.ts`
- Modify: `vercel.json`
- Test: `tests/geoPricing.test.ts`

**Interfaces:**
- Consumes: HTTP request headers `x-vercel-ip-country`
- Produces: JSON `{ country: string }` with HTTP 200 and edge cache headers

- [ ] **Step 1: Write the failing test for geo handler**

Create `tests/geoPricing.test.ts`:
```typescript
import { describe, it, expect } from 'vitest';
import geoHandler from '../api/geo';
import type { IncomingMessage, ServerResponse } from 'http';

describe('/api/geo handler', () => {
  it('returns uppercase country code from x-vercel-ip-country header', () => {
    const req = {
      headers: {
        'x-vercel-ip-country': 'ae',
      },
    } as unknown as IncomingMessage;

    let statusCode = 0;
    let headers: Record<string, string> = {};
    let body = '';

    const res = {
      writeHead(code: number, h: Record<string, string>) {
        statusCode = code;
        headers = h;
        return this;
      },
      end(data: string) {
        body = data;
        return this;
      },
    } as unknown as ServerResponse;

    geoHandler(req, res);

    expect(statusCode).toBe(200);
    expect(headers['Content-Type']).toBe('application/json');
    expect(headers['Cache-Control']).toContain('s-maxage=86400');
    expect(JSON.parse(body)).toEqual({ country: 'AE' });
  });

  it('defaults to US when header is missing', () => {
    const req = { headers: {} } as unknown as IncomingMessage;
    let body = '';
    const res = {
      writeHead: () => res,
      end: (data: string) => { body = data; return res; },
    } as unknown as ServerResponse;

    geoHandler(req, res);
    expect(JSON.parse(body)).toEqual({ country: 'US' });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/geoPricing.test.ts`
Expected: FAIL ("Cannot find module '../api/geo'")

- [ ] **Step 3: Implement `api/geo.ts` and update `vercel.json`**

Create `api/geo.ts`:
```typescript
import type { IncomingMessage, ServerResponse } from 'http';

export default function handler(req: IncomingMessage, res: ServerResponse): void {
  const countryHeader = req.headers['x-vercel-ip-country'];
  const country = typeof countryHeader === 'string' && countryHeader.trim().length > 0
    ? countryHeader.trim().toUpperCase()
    : 'US';

  res.writeHead(200, {
    'Content-Type': 'application/json',
    'Cache-Control': 's-maxage=86400, stale-while-revalidate=43200',
    'Access-Control-Allow-Origin': '*',
  });
  res.end(JSON.stringify({ country }));
}
```

Update `vercel.json`:
```json
{
  "rewrites": [
    { "source": "/((?!api/).*)", "destination": "/index.html" }
  ]
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/geoPricing.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add api/geo.ts vercel.json tests/geoPricing.test.ts
git commit -m "feat(api): add /api/geo edge geolocation endpoint and update vercel rewrites"
```

---

### Task 2: Asynchronous Visitor Country Resolver

**Files:**
- Modify: `src/utils/pricing.ts`
- Modify: `tests/geoPricing.test.ts`

**Interfaces:**
- Consumes: `/api/geo` endpoint, `localStorage` (`mms_pricing_country`), and `detectVisitorCountry()`
- Produces: `resolveVisitorCountry(): Promise<CountryCode>`

- [ ] **Step 1: Write tests for `resolveVisitorCountry`**

Append to `tests/geoPricing.test.ts`:
```typescript
import { resolveVisitorCountry, STORAGE_KEY_COUNTRY, PRICING_CONFIG } from '../src/utils/pricing';

describe('resolveVisitorCountry()', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('respects saved manual override in localStorage before fetching', async () => {
    localStorage.setItem(STORAGE_KEY_COUNTRY, 'SA');
    const country = await resolveVisitorCountry();
    expect(country).toBe('SA');
  });

  it('resolves country from /api/geo response when valid', async () => {
    const originalFetch = global.fetch;
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ country: 'QA' }),
    }) as any;

    try {
      const country = await resolveVisitorCountry({ bypassCache: true });
      expect(country).toBe('QA');
    } finally {
      global.fetch = originalFetch;
    }
  });

  it('maps unsupported foreign countries to US canonical reference', async () => {
    const originalFetch = global.fetch;
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ country: 'DE' }),
    }) as any;

    try {
      const country = await resolveVisitorCountry({ bypassCache: true });
      expect(country).toBe('US');
    } finally {
      global.fetch = originalFetch;
    }
  });

  it('falls back to timezone detection when fetch fails or times out', async () => {
    const originalFetch = global.fetch;
    global.fetch = vi.fn().mockRejectedValue(new Error('Network error')) as any;

    try {
      const country = await resolveVisitorCountry({ bypassCache: true });
      expect(PRICING_CONFIG[country]).toBeDefined();
    } finally {
      global.fetch = originalFetch;
    }
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/geoPricing.test.ts`
Expected: FAIL ("resolveVisitorCountry is not a function")

- [ ] **Step 3: Implement `resolveVisitorCountry` in `src/utils/pricing.ts`**

In `src/utils/pricing.ts`, add:
```typescript
let cachedAutoCountry: CountryCode | null = null;

export interface ResolveGeoOptions {
  bypassCache?: boolean;
  timeoutMs?: number;
}

/**
 * Resolves visitor country automatically.
 * Priority:
 * 1. Explicit user selection saved in localStorage.
 * 2. In-memory cached result from previous resolution.
 * 3. Vercel edge geolocation (/api/geo).
 * 4. Client timezone heuristic (detectVisitorCountry).
 * 5. Default to 'IN'.
 */
export async function resolveVisitorCountry(options: ResolveGeoOptions = {}): Promise<CountryCode> {
  const storage = getStorage();
  if (storage) {
    const saved = storage.getItem(STORAGE_KEY_COUNTRY) as CountryCode | null;
    if (saved && PRICING_CONFIG[saved]) {
      return saved;
    }
  }

  if (!options.bypassCache && cachedAutoCountry && PRICING_CONFIG[cachedAutoCountry]) {
    return cachedAutoCountry;
  }

  const timeoutMs = options.timeoutMs ?? 1500;

  try {
    if (typeof fetch !== 'undefined') {
      const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
      const timeoutId = controller ? setTimeout(() => controller.abort(), timeoutMs) : null;

      const res = await fetch('/api/geo', {
        signal: controller ? controller.signal : undefined,
      });

      if (timeoutId) clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        const code = (data?.country || '').toUpperCase();
        if (code && PRICING_CONFIG[code as CountryCode]) {
          cachedAutoCountry = code as CountryCode;
          return cachedAutoCountry;
        }
        // If country is outside supported GCC/India, route to Canonical USD
        cachedAutoCountry = 'US';
        return 'US';
      }
    }
  } catch {
    // Timeout, offline, or local dev: fall back smoothly
  }

  const fallback = detectVisitorCountry();
  cachedAutoCountry = fallback;
  return fallback;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/geoPricing.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/utils/pricing.ts tests/geoPricing.test.ts
git commit -m "feat(pricing): implement asynchronous resolveVisitorCountry with edge geo and fallback"
```

---

### Task 3: Hook Auto-Detection into LandingPage & PaywallModal

**Files:**
- Modify: `src/screens/LandingPage.tsx`
- Modify: `src/components/PaywallModal.tsx`
- Test: `tests/landingPage.test.ts`
- Test: `tests/pricing.test.ts`

**Interfaces:**
- Consumes: `resolveVisitorCountry()`
- Produces: Seamless initial country state on mount without UI flash or layout shift.

- [ ] **Step 1: Update `src/screens/LandingPage.tsx`**

In `LandingPage.tsx`:
```typescript
import {
  CountryCode,
  detectVisitorCountry,
  resolveVisitorCountry,
  saveVisitorCountry,
  // ...
} from '../utils/pricing';

// In LandingPage component:
const [selectedCountry, setSelectedCountry] = useState<CountryCode>(() => detectVisitorCountry());

useEffect(() => {
  // If user hasn't explicitly set localStorage yet, resolve via edge geo
  const saved = typeof window !== 'undefined' ? localStorage.getItem('mms_pricing_country') : null;
  if (!saved) {
    resolveVisitorCountry().then((geoCountry) => {
      setSelectedCountry(geoCountry);
    });
  }
}, []);
```

- [ ] **Step 2: Update `src/components/PaywallModal.tsx`**

In `PaywallModal.tsx`:
```typescript
import {
  CountryCode,
  detectVisitorCountry,
  resolveVisitorCountry,
  saveVisitorCountry,
  // ...
} from '../utils/pricing';

// In PaywallModal component:
const [selectedCountry, setSelectedCountry] = useState<CountryCode>(() => detectVisitorCountry());

useEffect(() => {
  if (isOpen) {
    const saved = typeof window !== 'undefined' ? localStorage.getItem('mms_pricing_country') : null;
    if (!saved) {
      resolveVisitorCountry().then((geoCountry) => {
        setSelectedCountry(geoCountry);
      });
    }
  }
}, [isOpen]);
```

- [ ] **Step 3: Run full test suite and verify no regressions**

Run: `npx vitest run`
Expected: 94 passed test files, all tests passing.

- [ ] **Step 4: Verify production build**

Run: `npm run build`
Expected: Exit code 0, TypeScript compiles cleanly with 0 errors.

- [ ] **Step 5: Commit**

```bash
git add src/screens/LandingPage.tsx src/components/PaywallModal.tsx
git commit -m "feat(ui): connect automatic geo pricing resolution to landing page and paywall modal"
```

---

## Self-Review Checklist

1. **Spec Coverage:**
   - Automatic detection supported for GCC (UAE, Saudi, Qatar, Oman, Bahrain, Kuwait) and India? Yes (`api/geo.ts` + `resolveVisitorCountry`).
   - Manual override preserved? Yes (`localStorage.getItem(STORAGE_KEY_COUNTRY)` checked first).
   - Zero emojis maintained? Yes.
2. **Placeholder Scan:** No "TODOs", "TBDs", or missing code blocks.
3. **Type Consistency:** `resolveVisitorCountry(options?: ResolveGeoOptions): Promise<CountryCode>` matches across all files and tests.
4. **Offline & Edge-case Handling:** 1.5s timeout abort controller, try/catch around `fetch`, fallback to `detectVisitorCountry()`.
