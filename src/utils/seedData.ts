import { db } from '../db/db';
import { Entry, Job } from '../types';
import { getLocalDateString } from './date';

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
    { item: 'Tea & Snacks', amount: 90, note: 'Tea & Snacks' },
    { item: 'Packaging Covers', amount: 350, note: 'Packaging covers' },
    { item: 'Shop Cleaning Supplies', amount: 180, note: 'Cleaning liquids' },
    { item: 'Electricity Bill', amount: 680, note: 'Power Bill' },
    { item: 'Drinking Water Cans (2 Nos)', amount: 120, note: 'Water cans' },
    { item: 'Shop Rent Advance', amount: 2500, note: 'Rent partial' },
    { item: 'Courier Delivery Charge', amount: 150, note: 'Stock courier' },
  ] as const;

  const sampleCustomers = [
    'Rahul', 'Aneesh', 'Faisal', 'Vishnu', 'Deepak', 'Arun', 'Suresh', 'Manju',
    'Nidheesh', 'Akhil', 'Sujith', 'Muhammed', 'Anjali', 'Kiran', 'Pranav'
  ];

  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();
  const currentDay = today.getDate();

  const entriesToInsert: Entry[] = [];

  for (let i = 0; i < 32; i++) {
    const targetDay = Math.max(1, currentDay - Math.floor(Math.random() * Math.min(currentDay, 20)));
    const d = new Date(year, month, targetDay);
    const yStr = d.getFullYear();
    const mStr = String(d.getMonth() + 1).padStart(2, '0');
    const dStr = String(d.getDate()).padStart(2, '0');
    const dateStr = `${yStr}-${mStr}-${dStr}`;

    const isExpense = Math.random() < 0.22;
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

  entriesToInsert.sort((a, b) => a.createdAt - b.createdAt);
  await db.entries.bulkAdd(entriesToInsert);
  return entriesToInsert.length;
}

export async function seedDevJobs(): Promise<number> {
  const now = Date.now();
  const oneDayMs = 24 * 60 * 60 * 1000;
  const todayStr = getLocalDateString();

  const sampleJobs: Job[] = [
    // 2 Received (Active)
    {
      customerName: 'Muhammed Shafi',
      phone: '9847123456',
      model: 'Samsung Galaxy M31',
      complaint: 'Charging issue, pin loose',
      estimate: 450,
      advance: 100,
      status: 'received',
      expectedDate: todayStr,
      receivedAt: now - oneDayMs * 2,
    },
    {
      customerName: 'Arun Kumar',
      phone: '9447556677',
      model: 'Redmi Note 9',
      complaint: 'Microphone not working, caller cannot hear',
      estimate: 350,
      advance: 0,
      status: 'received',
      receivedAt: now - oneDayMs * 1,
    },

    // 1 Waiting for parts (Active)
    {
      customerName: 'Vishnu Prasad',
      phone: '9745889900',
      model: 'Realme 7 Pro',
      complaint: 'Display broken, folder ordered',
      estimate: 2200,
      advance: 500,
      status: 'waiting',
      expectedDate: todayStr,
      receivedAt: now - oneDayMs * 4,
    },

    // 2 Ready
    {
      customerName: 'Suresh Babu',
      phone: '9496112233',
      model: 'Vivo Y20',
      complaint: 'Display replaced, fitting completed',
      estimate: 1800,
      advance: 500,
      status: 'ready',
      receivedAt: now - oneDayMs * 3,
      readyAt: now - 3600000 * 2, // 2 hours ago
    },
    {
      customerName: 'Aneesh Rahman',
      phone: '9895443322',
      model: 'OnePlus Nord CE',
      complaint: 'Poor battery backup, new battery installed',
      estimate: 1400,
      advance: 0,
      status: 'ready',
      receivedAt: now - oneDayMs * 2,
      readyAt: now - 3600000 * 5,
    },

    // 5 In History (4 Delivered, 1 Returned)
    {
      customerName: 'Rahul Krishnan',
      phone: '9633114455',
      model: 'iPhone 11',
      complaint: 'Back glass broken, replaced',
      estimate: 2200,
      advance: 1000,
      finalAmount: 2200,
      status: 'delivered',
      receivedAt: now - oneDayMs * 8,
      readyAt: now - oneDayMs * 7,
      deliveredAt: now - oneDayMs * 6,
    },
    {
      customerName: 'Fathima',
      phone: '9567881122',
      model: 'Redmi Note 8',
      complaint: 'Loudspeaker low volume',
      estimate: 350,
      advance: 0,
      finalAmount: 350,
      status: 'delivered',
      receivedAt: now - oneDayMs * 10,
      readyAt: now - oneDayMs * 9,
      deliveredAt: now - oneDayMs * 9,
    },
    {
      customerName: 'Dinesh',
      phone: '9446223344',
      model: 'Oppo A53',
      complaint: 'Full combo replacement',
      estimate: 1900,
      advance: 500,
      finalAmount: 1900,
      status: 'delivered',
      receivedAt: now - oneDayMs * 12,
      readyAt: now - oneDayMs * 11,
      deliveredAt: now - oneDayMs * 10,
    },
    {
      customerName: 'Joseph Thomas',
      phone: '9846337788',
      model: 'Poco X3',
      complaint: 'Headphone jack faulty',
      estimate: 400,
      advance: 0,
      finalAmount: 400,
      status: 'delivered',
      receivedAt: now - oneDayMs * 14,
      readyAt: now - oneDayMs * 13,
      deliveredAt: now - oneDayMs * 13,
    },
    {
      customerName: 'Manoj Kumar',
      phone: '9744119900',
      model: 'Samsung Galaxy A50',
      complaint: 'Motherboard dead, not rebooting',
      estimate: 2500,
      advance: 0,
      status: 'returned',
      receivedAt: now - oneDayMs * 7,
      deliveredAt: now - oneDayMs * 5,
    },
  ];

  await db.jobs.bulkAdd(sampleJobs);
  return sampleJobs.length;
}

export async function clearAllEntries(): Promise<void> {
  await db.entries.clear();
  await db.jobs.clear();
}
