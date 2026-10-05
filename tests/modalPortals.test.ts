import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

describe('Modal Portaling and Centering Verification', () => {
  it('ConfirmModal uses createPortal to document.body to remain locked to screen center', () => {
    const filePath = path.resolve(__dirname, '../src/components/ConfirmModal.tsx');
    expect(fs.existsSync(filePath)).toBe(true);
    const content = fs.readFileSync(filePath, 'utf-8');

    expect(content).toContain("import { createPortal } from 'react-dom'");
    expect(content).toContain('createPortal(modalElement, document.body)');
    expect(content).toContain('overflow');
  });

  it('LegalModal uses createPortal to document.body', () => {
    const filePath = path.resolve(__dirname, '../src/components/LegalModal.tsx');
    const content = fs.readFileSync(filePath, 'utf-8');

    expect(content).toContain("import { createPortal } from 'react-dom'");
    expect(content).toContain('createPortal(content, document.body)');
  });

  it('LoginModal uses createPortal to document.body', () => {
    const filePath = path.resolve(__dirname, '../src/components/LoginModal.tsx');
    const content = fs.readFileSync(filePath, 'utf-8');

    expect(content).toContain("import { createPortal } from 'react-dom'");
    expect(content).toContain('createPortal(modalElement, document.body)');
  });

  it('PaywallModal uses createPortal to document.body', () => {
    const filePath = path.resolve(__dirname, '../src/components/PaywallModal.tsx');
    const content = fs.readFileSync(filePath, 'utf-8');

    expect(content).toContain("import { createPortal } from 'react-dom'");
    expect(content).toContain('createPortal(sheetElement, document.body)');
  });
});
