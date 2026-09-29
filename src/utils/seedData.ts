import { db } from '../db/db';
import { Entry } from '../types';

export async function seedDevEntries(): Promise<number> {
  const sampleItemsIn = [
    { item: 'Screen Guard 11D', amount: 150, p: 'cash' },
    { item: 'Jio 28-day Recharge', amount: 299, p: 'upi' },
    { item: 'Type-C Fast Cable', amount: 250, p: 'upi' },
    { item: 'Back Cover Smoke Matte', amount: 180, p: 'cash' },
    { item: 'Boat Bassheads Earphones', amount: 450, p: 'upi' },
    { item: 'Display Combo Replacement', amount: 2400, p: 'upi' },
    { item: 'Airtel Unlimited Pack', amount: 349, p: 'cash' },
    { item: 'Tempered Glass (Curved)', amount: 250, p: 'cash' },
    { item: 'iPhone 20W Adapter', amount: 850, p: 'card' },
    { item: 'Mobile Battery Change', amount: 1100, p: 'cash' },
    { item: 'OTG Adapter', amount: 80, p: 'cash' },
    { item: 'Bluetooth Neckband', amount: 799, p: 'upi' },
    { item: 'Camera Lens Protector', amount: 120, p: 'cash' },
    { item: 'Phone Stand Holder', amount: 160, p: 'upi' },
    { item: 'Charging Port Service', amount: 400, p: 'cash' },
    { item: 'Memory Card 64GB', amount: 550, p: 'upi' },
    { item: 'Power Bank 10000mAh', amount: 1299, p: 'card' },
    { item: 'Touch Screen Cleaning Kit', amount: 99, p: 'cash' },
    { item: 'SIM Card Swap / MNP', amount: 100, p: 'cash' },
    { item: 'Smartwatch Strap', amount: 250, p: 'upi' },
  ] as const;

  const sampleExpensesOut = [
    { item: 'കടയിലെ ചായ & പലഹാരം', amount: 90, note: 'Tea & Snacks' },
    { item: 'സ്റ്റോക്ക് പാക്കിംഗ് കവർ', amount: 350, note: 'Packaging covers' },
    { item: 'കട ക്ലീനിംഗ് സാധനങ്ങൾ', amount: 180, note: 'Cleaning liquids' },
    { item: 'കട വൈദ്യുതി ബിൽ', amount: 680, note: 'KSEB Bill' },
    { item: 'കുടിവെള്ള കാൻ (2 Nos)', amount: 120, note: 'Water cans' },
    { item: 'കട വാടക അഡ്വാൻസ്', amount: 2500, note: 'Rent partial' },
    { item: 'ലോക്കൽ കൊറിയർ ചാർജ്', amount: 150, note: 'Stock courier' },
  ] as const;

  const sampleCustomers = [
    'Rahul', 'Aneesh', 'Faisal', 'Vishnu', 'Deepak', 'Arun', 'Suresh', 'Manju',
    'Nidheesh', 'Akhil', 'Sujith', 'Muhammed', 'Anjali', 'Kiran', 'Pranav'
  ];

  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth(); // 0-indexed
  const currentDay = today.getDate();

  const entriesToInsert: Entry[] = [];

  // Generate ~30 entries across days 1 to currentDay of this month
  for (let i = 0; i < 32; i++) {
    // Pick day between 1 and currentDay (biased towards recent days)
    const targetDay = Math.max(1, currentDay - Math.floor(Math.random() * Math.min(currentDay, 20)));
    const d = new Date(year, month, targetDay);
    const yStr = d.getFullYear();
    const mStr = String(d.getMonth() + 1).padStart(2, '0');
    const dStr = String(d.getDate()).padStart(2, '0');
    const dateStr = `${yStr}-${mStr}-${dStr}`;

    const isExpense = Math.random() < 0.22; // ~22% expenses
    const createdAt = new Date(year, month, targetDay, 9 + Math.floor(Math.random() * 11), Math.floor(Math.random() * 60)).getTime();

    if (isExpense) {
      const exp = sampleExpensesOut[Math.floor(Math.random() * sampleExpensesOut.length)];
      entriesToInsert.push({
        type: 'out',
        amount: exp.amount,
        item: exp.item,
        note: exp.note,
        date: dateStr,
        createdAt,
      });
    } else {
      const sale = sampleItemsIn[Math.floor(Math.random() * sampleItemsIn.length)];
      const customer = Math.random() > 0.4 ? sampleCustomers[Math.floor(Math.random() * sampleCustomers.length)] : undefined;
      entriesToInsert.push({
        type: 'in',
        amount: sale.amount,
        item: sale.item,
        customerName: customer,
        paymentMethod: sale.p as 'cash' | 'upi' | 'card',
        date: dateStr,
        createdAt,
      });
    }
  }

  // Sort chronologically
  entriesToInsert.sort((a, b) => a.createdAt - b.createdAt);

  await db.entries.bulkAdd(entriesToInsert);
  return entriesToInsert.length;
}

export async function clearAllEntries(): Promise<void> {
  await db.entries.clear();
}
