import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

describe('Button Icon & Label Invariants', () => {
  it('ensures buttons with Plus icons do not contain duplicate "+" in their text labels', () => {
    const screensToCheck = [
      'src/screens/wholesale/SparesScreen.tsx',
      'src/screens/wholesale/ClientsScreen.tsx',
      'src/components/StockPickerSheet.tsx',
      'src/screens/ToolsScreen.tsx',
      'src/screens/UsedPhonesView.tsx',
    ];

    for (const relPath of screensToCheck) {
      const fullPath = path.resolve(__dirname, '..', relPath);
      expect(fs.existsSync(fullPath)).toBe(true);

      const content = fs.readFileSync(fullPath, 'utf-8');

      // Ensure no buttons have <Plus ... /> followed by <span>+ ...</span>
      expect(content).not.toMatch(/<Plus[^>]*\/>\s*<span>\+/);
      expect(content).not.toContain('<span>+ Add Item</span>');
      expect(content).not.toContain('<span>+ Add Client</span>');
      expect(content).not.toContain('<span>+ Add New</span>');
      expect(content).not.toContain('<span>+ New Intake</span>');
    }
  });
});
