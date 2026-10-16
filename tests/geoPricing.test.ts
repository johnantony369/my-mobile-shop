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
