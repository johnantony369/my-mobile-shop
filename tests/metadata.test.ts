import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

describe('Site Metadata & Robots Configuration', () => {
  it('should have a public/robots.txt allowing crawler access', () => {
    const robotsPath = path.resolve(__dirname, '../public/robots.txt');
    expect(fs.existsSync(robotsPath)).toBe(true);
    const content = fs.readFileSync(robotsPath, 'utf-8');
    expect(content).toContain('User-agent: *');
    expect(content).toContain('Allow: /');
  });

  it('should have description, canonical, and opengraph meta tags in index.html', () => {
    const indexPath = path.resolve(__dirname, '../index.html');
    const content = fs.readFileSync(indexPath, 'utf-8');
    expect(content).toContain('<link rel="canonical" href="https://www.mymobileshop.online/"');
    expect(content).toContain('<meta name="description"');
    expect(content).toContain('og:title');
    expect(content).toContain('og:description');
  });
});
