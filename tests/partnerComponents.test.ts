import { describe, it, expect } from 'vitest';
import { generateQrSvg } from '../src/utils/qr';

describe('QR Vector Generator', () => {
  it('generates a valid SVG string containing path or rect elements and viewBox', () => {
    const svg = generateQrSvg('https://mymobileshop.online/?ref=METRO99');
    expect(svg).toContain('<svg');
    expect(svg).toContain('viewBox=');
    expect(svg).toContain('</svg>');
    expect(svg.length).toBeGreaterThan(100);
  });
});
