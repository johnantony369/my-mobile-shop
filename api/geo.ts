import type { IncomingMessage, ServerResponse } from 'http';

export default function handler(req: IncomingMessage, res: ServerResponse): void {
  const rawHeader = req.headers['x-vercel-ip-country'];
  const rawCountry = typeof rawHeader === 'string' && rawHeader.trim().length > 0
    ? rawHeader.trim().toUpperCase()
    : 'US';

  // Support only two currencies: INR for India and USD for all international markets (including GCC)
  const country = rawCountry === 'IN' ? 'IN' : 'US';

  res.writeHead(200, {
    'Content-Type': 'application/json',
    'Cache-Control': 's-maxage=86400, stale-while-revalidate=43200',
    'Access-Control-Allow-Origin': '*',
  });
  res.end(JSON.stringify({ country }));
}
