import { describe, it, expect } from 'vitest';
import { searchMasterSparesInMemory, MASTER_DEVICES_SEED } from '../src/data/masterSparesSeed';
import { searchMasterSpares } from '../src/firebase/masterSpares';

describe('Master Spares Search & Taxonomy', () => {
  it('contains popular Indian smartphone brands and models in seed data', () => {
    expect(MASTER_DEVICES_SEED.length).toBeGreaterThan(10);
    const brands = new Set(MASTER_DEVICES_SEED.map((d) => d.brand));
    expect(brands.has('Xiaomi')).toBe(true);
    expect(brands.has('Samsung')).toBe(true);
    expect(brands.has('Vivo')).toBe(true);
    expect(brands.has('Realme')).toBe(true);
  });

  it('finds spare parts by model name or part code in memory', () => {
    const results = searchMasterSparesInMemory('note 10');
    expect(results.length).toBeGreaterThan(0);
    expect(results.some((r) => r.model.toLowerCase().includes('note 10'))).toBe(true);
  });

  it('matches parts by battery code', () => {
    const results = searchMasterSparesInMemory('bn53');
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].partCode).toBe('BN53');
  });

  it('searches spares via service layer with fallback', async () => {
    const results = await searchMasterSpares('y20');
    expect(results.length).toBeGreaterThan(0);
    expect(results.some((r) => r.model.toLowerCase().includes('y20'))).toBe(true);
  });
});
