import { describe, it, expect, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import {
  db,
  addPurchaseItem,
  togglePurchaseItem,
  deletePurchaseItem,
  clearPurchasedItems,
} from '../src/db/db';

describe('Stock / Purchase List', () => {
  beforeEach(async () => {
    await db.purchases.clear();
  });

  it('adds an item with name, quantity, note and sync fields', async () => {
    const id = await addPurchaseItem('  iPhone 11 Display ', 3, ' vendor X ');
    const item = await db.purchases.get(id!);
    expect(item?.name).toBe('iPhone 11 Display');
    expect(item?.quantity).toBe(3);
    expect(item?.note).toBe('vendor X');
    expect(item?.isPurchased).toBe(false);
    expect(item?.cloudId).toBeTruthy();
    expect(item?.syncStatus).toBe('pending');
  });

  it('ignores blank names and defaults quantity to 1', async () => {
    expect(await addPurchaseItem('   ')).toBeUndefined();
    const id = await addPurchaseItem('Charger', 0);
    expect((await db.purchases.get(id!))?.quantity).toBe(1);
    expect(await db.purchases.count()).toBe(1);
  });

  it('toggles purchased status', async () => {
    const id = (await addPurchaseItem('Cable'))!;
    await togglePurchaseItem(id, true);
    expect((await db.purchases.get(id))?.isPurchased).toBe(true);
    await togglePurchaseItem(id, false);
    expect((await db.purchases.get(id))?.isPurchased).toBe(false);
  });

  it('deletes an item and clears purchased items only', async () => {
    const a = (await addPurchaseItem('A'))!;
    const b = (await addPurchaseItem('B'))!;
    await addPurchaseItem('C');
    await togglePurchaseItem(a, true);
    expect(await clearPurchasedItems()).toBe(1);
    await deletePurchaseItem(b);
    const left = await db.purchases.toArray();
    expect(left.map((p) => p.name)).toEqual(['C']);
  });
});
