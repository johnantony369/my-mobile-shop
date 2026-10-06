import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

describe('Dual Entry & Double Submission Prevention', () => {
  it('AddEditSheet has synchronous isSubmittingRef mutex and non-submitting footer button', () => {
    const file = path.resolve(__dirname, '../src/screens/AddEditSheet.tsx');
    const content = fs.readFileSync(file, 'utf-8');

    expect(content).toContain('isSubmittingRef = useRef(false)');
    expect(content).toContain('if (isSubmittingRef.current) return;');
    expect(content).toContain('isSubmittingRef.current = true;');
    // Footer button must be type="button" to prevent native form submission duplicate
    expect(content).toMatch(/footer=\{[\s\S]*?<button[\s\S]*?type="button"[\s\S]*?onClick=/);
    expect(content).not.toMatch(/footer=\{[\s\S]*?<button[\s\S]*?type="submit"[\s\S]*?form="add-entry-form"/);
  });

  it('AddEditStockSheet has synchronous isSubmittingRef mutex and non-submitting footer button', () => {
    const file = path.resolve(__dirname, '../src/screens/AddEditStockSheet.tsx');
    const content = fs.readFileSync(file, 'utf-8');

    expect(content).toContain('isSubmittingRef = useRef(false)');
    expect(content).toContain('if (isSubmittingRef.current) return;');
    expect(content).toContain('isSubmittingRef.current = true;');
    expect(content).toMatch(/footer=\{[\s\S]*?<button[\s\S]*?type="button"[\s\S]*?onClick=/);
    expect(content).not.toMatch(/footer=\{[\s\S]*?<button[\s\S]*?type="submit"[\s\S]*?form="add-stock-form"/);
  });

  it('AddEditJobSheet has synchronous isSubmittingRef mutex and non-submitting footer button', () => {
    const file = path.resolve(__dirname, '../src/screens/AddEditJobSheet.tsx');
    const content = fs.readFileSync(file, 'utf-8');

    expect(content).toContain('isSubmittingRef = useRef(false)');
    expect(content).toContain('if (isSubmittingRef.current) return;');
    expect(content).toContain('isSubmittingRef.current = true;');
    expect(content).toMatch(/footer=\{[\s\S]*?<button[\s\S]*?type="button"[\s\S]*?onClick=/);
    expect(content).not.toMatch(/footer=\{[\s\S]*?<button[\s\S]*?type="submit"[\s\S]*?form="add-job-form"/);
  });

  it('DeliverySheet has synchronous isSubmittingRef mutex and non-submitting footer button', () => {
    const file = path.resolve(__dirname, '../src/screens/DeliverySheet.tsx');
    const content = fs.readFileSync(file, 'utf-8');

    expect(content).toContain('isSubmittingRef = useRef(false)');
    expect(content).toContain('if (isSubmittingRef.current) return;');
    expect(content).toContain('isSubmittingRef.current = true;');
    expect(content).toMatch(/footer=\{[\s\S]*?<button[\s\S]*?type="button"[\s\S]*?onClick=/);
    expect(content).not.toMatch(/footer=\{[\s\S]*?<button[\s\S]*?type="submit"[\s\S]*?form="delivery-form"/);
  });

  it('BillSheet has synchronous isSubmittingRef mutex', () => {
    const file = path.resolve(__dirname, '../src/screens/BillSheet.tsx');
    const content = fs.readFileSync(file, 'utf-8');

    expect(content).toContain('isSubmittingRef = useRef(false)');
    expect(content).toContain('if (isSubmittingRef.current) return;');
    expect(content).toContain('isSubmittingRef.current = true;');
  });

  it('ConfirmModal has isConfirmingRef mutex to prevent rapid double-clicks on confirmation', () => {
    const file = path.resolve(__dirname, '../src/components/ConfirmModal.tsx');
    const content = fs.readFileSync(file, 'utf-8');

    expect(content).toContain('isConfirmingRef = React.useRef(false)');
    expect(content).toContain('if (isConfirmingRef.current) return;');
    expect(content).toContain('isConfirmingRef.current = true;');
  });

  it('BookScreen and RepairsScreen use softDelete to prevent resurrection across refresh and sync', () => {
    const bookFile = path.resolve(__dirname, '../src/screens/BookScreen.tsx');
    const bookContent = fs.readFileSync(bookFile, 'utf-8');
    expect(bookContent).toContain('softDeleteEntry');
    expect(bookContent).not.toMatch(/db\.entries\.delete\(entryToDelete\.id\)/);

    const repairsFile = path.resolve(__dirname, '../src/screens/RepairsScreen.tsx');
    const repairsContent = fs.readFileSync(repairsFile, 'utf-8');
    expect(repairsContent).toContain('softDeleteJob');
    expect(repairsContent).not.toMatch(/db\.jobs\.delete\(jobToDelete\.id\)/);
  });
});
