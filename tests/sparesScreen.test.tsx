import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { SparesScreen } from '../src/screens/wholesale/SparesScreen';

describe('SparesScreen Component', () => {
  it('renders search input and brand filter chips', () => {
    const html = renderToString(<SparesScreen language="en" />);
    expect(html).toContain('Search phone model or spare part...');
    expect(html).toContain('Xiaomi');
    expect(html).toContain('Add Item');
    expect(html).not.toContain('+ Add Item');
    expect(html).not.toContain('+ Add Phone Model');
    expect(html).not.toContain('+ Add Spare Part');
  });

  it('AddItemBottomSheet component adheres to GEMINI.md portal and bottom-safe clearance rules', async () => {
    const fs = await import('fs');
    const path = await import('path');
    const filePath = path.resolve(__dirname, '../src/components/wholesale/AddItemBottomSheet.tsx');
    expect(fs.existsSync(filePath)).toBe(true);

    const content = fs.readFileSync(filePath, 'utf-8');
    // Portaling & z-index
    expect(content).toContain("import { createPortal } from 'react-dom'");
    expect(content).toContain('createPortal(');
    expect(content).toContain('document.body');
    expect(content).toContain('z-50');

    // Bottom safe area clearance
    expect(content).toContain('pb-[calc(env(safe-area-inset-bottom)+20px)] sm:pb-5');

    // Inline + New Model toggle
    expect(content).toContain('+ New Model');
    expect(content).toContain('isNewModel');

    // Inline + New Category toggle
    expect(content).toContain('+ New Category');
    expect(content).toContain('isNewCategory');
  });

  it('implements high-performance inverted index and pre-grouped sparesByDeviceId map in SparesScreen', async () => {
    const fs = await import('fs');
    const path = await import('path');
    const screenPath = path.resolve(__dirname, '../src/screens/wholesale/SparesScreen.tsx');
    const content = fs.readFileSync(screenPath, 'utf-8');

    // useDeferredValue integration
    expect(content).toContain('useDeferredValue');
    expect(content).toContain('deferredSearchQuery = useDeferredValue(searchQuery)');

    // Inverted index single-pass matching
    expect(content).toContain('matchingDeviceIdsFromSpares = new Set<string>()');
    expect(content).toContain('matchingDeviceIdsFromSpares.add(s.deviceId)');

    // O(1) Pre-grouped spares map
    expect(content).toContain('const sparesByDeviceId = useMemo(');
    expect(content).toContain('sparesByDeviceId.get(device.id)');
    expect(content).not.toContain('spares.some(');
  });
});
