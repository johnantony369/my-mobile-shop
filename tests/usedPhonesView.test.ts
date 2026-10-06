import { describe, it, expect } from 'vitest';
import { UsedDevice } from '../src/types';

describe('Used Phones View Logic', () => {
  const devices: UsedDevice[] = [
    {
      id: 1,
      brand: 'Apple',
      model: 'iPhone 13',
      imei: '351756051523993',
      storage: '128GB',
      purchasePrice: 28000,
      sellingPrice: 32000,
      purchaseDate: '2026-10-07',
      sellerName: 'Rahul',
      sellerPhone: '9876543210',
      status: 'in_stock',
      createdAt: 1,
    },
    {
      id: 2,
      brand: 'Samsung',
      model: 'Galaxy S21',
      imei: '490154203237518',
      storage: '256GB',
      purchasePrice: 15000,
      sellingPrice: 19000,
      soldPrice: 18500,
      purchaseDate: '2026-10-06',
      sellerName: 'Amit',
      sellerPhone: '9876543211',
      status: 'sold',
      createdAt: 2,
    },
  ];

  it('filters devices by status correctly', () => {
    const inStock = devices.filter((d) => d.status === 'in_stock');
    const sold = devices.filter((d) => d.status === 'sold');
    expect(inStock.length).toBe(1);
    expect(sold.length).toBe(1);
  });

  it('filters devices by search query (model or imei)', () => {
    const query = '351756';
    const matched = devices.filter(
      (d) =>
        d.model.toLowerCase().includes(query.toLowerCase()) ||
        d.imei.includes(query)
    );
    expect(matched.length).toBe(1);
    expect(matched[0].model).toBe('iPhone 13');
  });

  it('calculates total in-stock investment and expected profit', () => {
    const inStock = devices.filter((d) => d.status === 'in_stock');
    const totalCost = inStock.reduce((acc, d) => acc + d.purchasePrice, 0);
    const expectedRevenue = inStock.reduce((acc, d) => acc + (d.sellingPrice || d.purchasePrice), 0);
    const projectedMargin = expectedRevenue - totalCost;

    expect(totalCost).toBe(28000);
    expect(expectedRevenue).toBe(32000);
    expect(projectedMargin).toBe(4000);
  });
});
