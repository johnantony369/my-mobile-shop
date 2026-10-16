import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import geoHandler from '../api/geo';
import type { IncomingMessage, ServerResponse } from 'http';
import { resolveVisitorCountry, _resetCachedAutoCountry, STORAGE_KEY_COUNTRY, PRICING_CONFIG } from '../src/utils/pricing';

describe('/api/geo handler', () => {
  it('returns IN for India and US for other countries from x-vercel-ip-country header', () => {
    const reqIn = {
      headers: {
        'x-vercel-ip-country': 'in',
      },
    } as unknown as IncomingMessage;

    let statusCode = 0;
    let headers: Record<string, string> = {};
    let bodyIn = '';

    const resIn = {
      writeHead(code: number, h: Record<string, string>) {
        statusCode = code;
        headers = h;
        return this;
      },
      end(data: string) {
        bodyIn = data;
        return this;
      },
    } as unknown as ServerResponse;

    geoHandler(reqIn, resIn);

    expect(statusCode).toBe(200);
    expect(headers['Content-Type']).toBe('application/json');
    expect(headers['Cache-Control']).toContain('s-maxage=86400');
    expect(JSON.parse(bodyIn)).toEqual({ country: 'IN' });

    const reqAe = {
      headers: {
        'x-vercel-ip-country': 'ae',
      },
    } as unknown as IncomingMessage;
    let bodyAe = '';
    const resAe = {
      writeHead: () => resAe,
      end: (data: string) => { bodyAe = data; return resAe; },
    } as unknown as ServerResponse;

    geoHandler(reqAe, resAe);
    expect(JSON.parse(bodyAe)).toEqual({ country: 'US' });
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

  it('defaults to US when header is empty or whitespace', () => {
    const req = {
      headers: {
        'x-vercel-ip-country': '   ',
      },
    } as unknown as IncomingMessage;
    let body = '';
    const res = {
      writeHead: () => res,
      end: (data: string) => { body = data; return res; },
    } as unknown as ServerResponse;

    geoHandler(req, res);
    expect(JSON.parse(body)).toEqual({ country: 'US' });
  });
});

describe('resolveVisitorCountry()', () => {
  const originalLocalStorage = globalThis.localStorage;
  let store: Record<string, string> = {};

  beforeEach(() => {
    _resetCachedAutoCountry();
    store = {};
    Object.defineProperty(globalThis, 'localStorage', {
      value: {
        getItem: (k: string) => store[k] ?? null,
        setItem: (k: string, v: string) => { store[k] = v; },
        removeItem: (k: string) => { delete store[k]; },
        clear: () => { store = {}; },
      },
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    Object.defineProperty(globalThis, 'localStorage', {
      value: originalLocalStorage,
      writable: true,
      configurable: true,
    });
  });

  it('respects saved manual override in localStorage before fetching', async () => {
    localStorage.setItem(STORAGE_KEY_COUNTRY, 'IN');
    const country = await resolveVisitorCountry();
    expect(country).toBe('IN');
  });

  it('resolves country from /api/geo response when IN', async () => {
    const originalFetch = global.fetch;
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ country: 'IN' }),
    }) as any;

    try {
      const country = await resolveVisitorCountry({ bypassCache: true });
      expect(country).toBe('IN');
    } finally {
      global.fetch = originalFetch;
    }
  });

  it('maps all international countries (including GCC) to US', async () => {
    const originalFetch = global.fetch;
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ country: 'AE' }),
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

  it('falls back to timezone detection when fetch times out via abort controller', async () => {
    const originalFetch = global.fetch;
    global.fetch = vi.fn().mockImplementation((_url, options) => {
      return new Promise((resolve, reject) => {
        if (options?.signal) {
          options.signal.addEventListener('abort', () => {
            const err = new Error('The operation was aborted');
            err.name = 'AbortError';
            reject(err);
          });
        }
      });
    }) as any;

    try {
      const country = await resolveVisitorCountry({ bypassCache: true, timeoutMs: 50 });
      expect(PRICING_CONFIG[country]).toBeDefined();
    } finally {
      global.fetch = originalFetch;
    }
  });

  it('uses in-memory cached country on subsequent calls without bypassCache', async () => {
    const originalFetch = global.fetch;
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ country: 'IN' }),
    });
    global.fetch = fetchMock as any;

    try {
      const country1 = await resolveVisitorCountry({ bypassCache: true });
      expect(country1).toBe('IN');
      expect(fetchMock).toHaveBeenCalledTimes(1);

      const country2 = await resolveVisitorCountry();
      expect(country2).toBe('IN');
      expect(fetchMock).toHaveBeenCalledTimes(1);
    } finally {
      global.fetch = originalFetch;
    }
  });
});

