const http = require('http');
const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer-core');

const DIST_DIR = path.resolve(__dirname, '../dist');
const DIR_67 = path.resolve(__dirname, '../docs/screenshots/ios-6.7');
const DIR_65 = path.resolve(__dirname, '../docs/screenshots/ios-6.5');
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 5199;

const MIME_TYPES = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.webmanifest': 'application/manifest+json',
  '.woff2': 'font/woff2',
};

function startServer() {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      let reqPath = req.url.split('?')[0];
      if (reqPath === '/' || reqPath === '/app' || reqPath === '/privacy' || reqPath === '/terms') {
        reqPath = '/index.html';
      }
      let filePath = path.join(DIST_DIR, reqPath);
      if (!fs.existsSync(filePath)) {
        filePath = path.join(DIST_DIR, 'index.html');
      }

      const ext = path.extname(filePath).toLowerCase();
      const contentType = MIME_TYPES[ext] || 'application/octet-stream';

      fs.readFile(filePath, (err, content) => {
        if (err) {
          res.writeHead(500);
          res.end('Error loading file');
        } else {
          res.writeHead(200, { 'Content-Type': contentType });
          res.end(content);
        }
      });
    });

    server.listen(PORT, () => {
      resolve(server);
    });
  });
}

async function capture() {
  [DIR_67, DIR_65].forEach((d) => {
    if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
  });

  const server = await startServer();
  console.log(`Preview server running at http://localhost:${PORT}`);

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
  });

  const page = await browser.newPage();

  const screens = [
    { tab: 'book', name: '01_day_book_pos.png', label: 'Day Book & POS Ledger' },
    { tab: 'repairs', name: '02_repair_crm_jobs.png', label: 'Repairs CRM & Status' },
    { tab: 'stock', name: '03_accessories_stock.png', label: 'Stock & Inventory Alerts' },
    { tab: 'tools', name: '04_shop_tools_calculator.png', label: 'Shop Tools & EMI Calculator' },
    { tab: 'settings', name: '05_settings_cloud_sync.png', label: 'Cloud Sync & Store Profile' },
  ];

  // 1. Capture 6.7" (iPhone 16 Pro Max / 15 Pro Max) - 1290 x 2796 px (430 x 932 @ 3x)
  console.log('\n--- Capturing 6.7" Displays (1290 x 2796 px) ---');
  await page.setViewport({
    width: 430,
    height: 932,
    deviceScaleFactor: 3,
    isMobile: true,
    hasTouch: true,
  });

  for (const s of screens) {
    await page.goto(`http://localhost:${PORT}/?tab=${s.tab}`, { waitUntil: 'networkidle0' });
    await new Promise((r) => setTimeout(r, 600));
    const outPath = path.join(DIR_67, s.name);
    await page.screenshot({ path: outPath, type: 'png' });
    console.log(`[6.7"] Saved: ${s.name}`);
  }

  // 2. Capture 6.5" (iPhone 11 Pro Max / XS Max / 11) - 1242 x 2688 px (414 x 896 @ 3x)
  console.log('\n--- Capturing 6.5" Displays (1242 x 2688 px) ---');
  await page.setViewport({
    width: 414,
    height: 896,
    deviceScaleFactor: 3,
    isMobile: true,
    hasTouch: true,
  });

  for (const s of screens) {
    await page.goto(`http://localhost:${PORT}/?tab=${s.tab}`, { waitUntil: 'networkidle0' });
    await new Promise((r) => setTimeout(r, 600));
    const outPath = path.join(DIR_65, s.name);
    await page.screenshot({ path: outPath, type: 'png' });
    console.log(`[6.5"] Saved: ${s.name}`);
  }

  await browser.close();
  server.close();
  console.log('\nAll App Store screenshots successfully captured and validated!');
}

capture().catch((err) => {
  console.error('Capture error:', err);
  process.exit(1);
});
