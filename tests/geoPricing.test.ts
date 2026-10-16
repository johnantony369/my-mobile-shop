import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import geoHandler from '../api/geo';
import type { IncomingMessage, ServerResponse } from 'http';
import { resolveVisitorCountry, _resetCachedAutoCountry, STORAGE_KEY_COUNTRY, PRICING_CONFIG } from '../src/utils/pricing';

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
      json: async () => ({ country: 'AE' }),
    });
    global.fetch = fetchMock as any;

    try {
      const country1 = await resolveVisitorCountry({ bypassCache: true });
      expect(country1).toBe('AE');
      expect(fetchMock).toHaveBeenCalledTimes(1);

      const country2 = await resolveVisitorCountry();
      expect(country2).toBe('AE');
      expect(fetchMock).toHaveBeenCalledTimes(1);
    } finally {
      global.fetch = originalFetch;
    }
  });
});

