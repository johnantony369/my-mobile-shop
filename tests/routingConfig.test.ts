import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

describe('Vercel SPA & Routing Configuration', () => {
  it('should have vercel.json with catch-all rewrite to index.html', () => {
    const vercelPath = path.resolve(__dirname, '../vercel.json');
    expect(fs.existsSync(vercelPath)).toBe(true);
    const config = JSON.parse(fs.readFileSync(vercelPath, 'utf-8'));
    expect(config.rewrites).toBeDefined();
    expect(config.rewrites[0].source).toBe('/(.*)');
    expect(config.rewrites[0].destination).toBe('/index.html');
  });

  it('should have react-router-dom installed in package.json', () => {
    const pkgPath = path.resolve(__dirname, '../package.json');
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
    expect(pkg.dependencies['react-router-dom']).toBeDefined();
  });
});
