import { describe, it, expect } from 'vitest';
import { deduplicateById } from '../src/firebase/masterSpares';
import { MasterDevice, MasterSparePart } from '../src/types/wholesale';

describe('Master Spares & Devices Deduplication Suite', () => {
  it('deduplicateById strips duplicate entries with identical id keeping the first one', () => {
    const rawDevices: MasterDevice[] = [
      { id: 'xiaomi_redmi_10', brand: 'Xiaomi', model: 'Redmi 10', releaseYear: 2021 },
      { id: 'samsung_galaxy_m31', brand: 'Samsung', model: 'Galaxy M31', releaseYear: 2020 },
      { id: 'xiaomi_redmi_10', brand: 'Xiaomi', model: 'Redmi 10 Custom Modified', releaseYear: 2021 },
      { id: 'apple_iphone_13', brand: 'Apple', model: 'iPhone 13', releaseYear: 2021 },
      { id: 'apple_iphone_13', brand: 'Apple', model: 'iPhone 13 Duplicate', releaseYear: 2021 },
    ];

    const deduplicated = deduplicateById(rawDevices);
    expect(deduplicated).toHaveLength(3);
    expect(deduplicated.map((d) => d.id)).toEqual([
      'xiaomi_redmi_10',
      'samsung_galaxy_m31',
      'apple_iphone_13',
    ]);
    expect(deduplicated[0].model).toBe('Redmi 10');
  });

  it('deduplicateById handles spare parts correctly', () => {
    const rawSpares: MasterSparePart[] = [
      {
        id: 'dev1_display_123',
        deviceId: 'dev1',
        brand: 'Xiaomi',
        model: 'Redmi 10',
        category: 'display',
        partName: 'Display Folder',
        compatibleModels: ['Redmi 10'],
      },
      {
        id: 'dev1_display_123',
        deviceId: 'dev1',
        brand: 'Xiaomi',
        model: 'Redmi 10',
        category: 'display',
        partName: 'Display Folder Duplicate',
        compatibleModels: ['Redmi 10'],
      },
      {
        id: 'dev1_battery_456',
        deviceId: 'dev1',
        brand: 'Xiaomi',
        model: 'Redmi 10',
        category: 'battery',
        partName: 'Battery BN53',
        compatibleModels: ['Redmi 10'],
      },
    ];

    const deduplicated = deduplicateById(rawSpares);
    expect(deduplicated).toHaveLength(2);
    expect(deduplicated.map((s) => s.id)).toEqual(['dev1_display_123', 'dev1_battery_456']);
  });
});
