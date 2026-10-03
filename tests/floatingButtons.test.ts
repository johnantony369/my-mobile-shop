import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

describe('Floating Action Buttons (FAB) in Tabs', () => {
  it('StockScreen has a floating Add Item button with responsive positioning and paywall handling', () => {
    const filePath = path.resolve(__dirname, '../src/screens/StockScreen.tsx');
    expect(fs.existsSync(filePath)).toBe(true);
    const content = fs.readFileSync(filePath, 'utf-8');

    expect(content).toContain('<FloatingAction>');
    expect(content).toContain('Add Item');
    expect(content).toContain('handleOpenAdd');
  });

  it('RepairsScreen has a floating New Job button with responsive positioning and paywall handling', () => {
    const filePath = path.resolve(__dirname, '../src/screens/RepairsScreen.tsx');
    expect(fs.existsSync(filePath)).toBe(true);
    const content = fs.readFileSync(filePath, 'utf-8');

    expect(content).toContain('<FloatingAction>');
    expect(content).toContain("t('new_job_btn', language)");
  });

  it('BookScreen has a floating Add Entry button with responsive positioning and paywall handling', () => {
    const filePath = path.resolve(__dirname, '../src/screens/BookScreen.tsx');
    expect(fs.existsSync(filePath)).toBe(true);
    const content = fs.readFileSync(filePath, 'utf-8');

    expect(content).toContain('<FloatingAction>');
    expect(content).toContain("t('add_entry', language)");
  });

  it('FloatingAction portals a bottom-right fixed container to document.body', () => {
    const content = fs.readFileSync(path.resolve(__dirname, '../src/components/FloatingAction.tsx'), 'utf-8');
    expect(content).toContain('createPortal');
    expect(content).toContain('fixed bottom-[calc(env(safe-area-inset-bottom)+66px)]');
  });
});
