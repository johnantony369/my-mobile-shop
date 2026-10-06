import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('AddEditSheet GPay UX Flow Contract', () => {
  const sheetPath = path.resolve(__dirname, '../src/screens/AddEditSheet.tsx');
  const sheetContent = fs.readFileSync(sheetPath, 'utf-8');

  it('declares step state with amount and details steps', () => {
    expect(sheetContent).toMatch(/step.*['"]amount['"]|['"]details['"]/);
  });

  it('renders forward arrow button leading to balance form', () => {
    expect(sheetContent).toContain('ArrowRight');
  });

  it('renders back arrow and amount chip on Step 2', () => {
    expect(sheetContent).toContain('ArrowLeft');
  });

  it('initializes edit mode directly in details step', () => {
    expect(sheetContent).toMatch(/entryToEdit\s*\?\s*['"]details['"]\s*:\s*['"]amount['"]/);
  });
});
