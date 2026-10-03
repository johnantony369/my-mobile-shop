import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

describe('BottomSheet Layout & Submit Accessibility', () => {
  it('BottomSheet component provides flex-1 min-h-0, dvh bounds, overflow containment, and sticky footer prop', () => {
    const filePath = path.resolve(__dirname, '../src/components/BottomSheet.tsx');
    expect(fs.existsSync(filePath)).toBe(true);
    const content = fs.readFileSync(filePath, 'utf-8');

    // Sticky footer prop support
    expect(content).toContain('footer?: React.ReactNode');
    expect(content).toContain('{footer}');

    // Proper mobile viewport constraints
    expect(content).toContain('max-h-[90dvh]');
    expect(content).toContain('overflow-hidden');

    // Scrollable body flex constraints
    expect(content).toContain('flex-1 min-h-0 overflow-y-auto');
  });

  it('AddEditSheet pins the save/update button to BottomSheet sticky footer', () => {
    const filePath = path.resolve(__dirname, '../src/screens/AddEditSheet.tsx');
    const content = fs.readFileSync(filePath, 'utf-8');

    expect(content).toContain('footer={');
    expect(content).toMatch(/<button[\s\S]*?(?:update_btn|save_btn)[\s\S]*?<\/button>/);
  });

  it('AddEditJobSheet pins the save/update job button to BottomSheet sticky footer', () => {
    const filePath = path.resolve(__dirname, '../src/screens/AddEditJobSheet.tsx');
    const content = fs.readFileSync(filePath, 'utf-8');

    expect(content).toContain('footer={');
    expect(content).toMatch(/<button[\s\S]*?(?:update_job|save_job)[\s\S]*?<\/button>/);
  });

  it('AddEditStockSheet pins the stock submit button to BottomSheet sticky footer', () => {
    const filePath = path.resolve(__dirname, '../src/screens/AddEditStockSheet.tsx');
    const content = fs.readFileSync(filePath, 'utf-8');

    expect(content).toContain('footer={');
    expect(content).toMatch(/<button[\s\S]*?(?:Update Stock Item|Add to Stock)[\s\S]*?<\/button>/);
  });

  it('DeliverySheet pins the delivery confirmation button to BottomSheet sticky footer', () => {
    const filePath = path.resolve(__dirname, '../src/screens/DeliverySheet.tsx');
    const content = fs.readFileSync(filePath, 'utf-8');

    expect(content).toContain('footer={');
    expect(content).toMatch(/<button[\s\S]*?delivery_confirm_btn[\s\S]*?<\/button>/);
  });
});
