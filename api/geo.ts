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
