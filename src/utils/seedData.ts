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
      customerName: 'മുഹമ്മദ് ഷാഫി',
      phone: '9847123456',
      model: 'Samsung Galaxy M31',
      complaint: 'ചാർജിംഗ് ആകുന്നില്ല, പിൻ ലൂസ് ആണ്',
      estimate: 450,
      advance: 100,
      status: 'received',
      expectedDate: todayStr,
      receivedAt: now - oneDayMs * 2,
    },
    {
      customerName: 'അരുൺ കുമാർ',
      phone: '9447556677',
      model: 'Redmi Note 9',
      complaint: 'മൈക്ക് വർക്ക് ചെയ്യുന്നില്ല, സംസാരിക്കുന്നത് കേൾക്കുന്നില്ല',
      estimate: 350,
      advance: 0,
      status: 'received',
      receivedAt: now - oneDayMs * 1,
    },

    // 1 Waiting for parts (Active)
    {
      customerName: 'വിഷ്ണു പ്രസാദ്',
      phone: '9745889900',
      model: 'Realme 7 Pro',
      complaint: 'ഡിസ്‌പ്ലേ തകർന്നു, ഫോൾഡർ ഓർഡർ ചെയ്തിട്ടുണ്ട്',
      estimate: 2200,
      advance: 500,
      status: 'waiting',
      expectedDate: todayStr,
      receivedAt: now - oneDayMs * 4,
    },

    // 2 Ready
    {
      customerName: 'സുരേഷ് ബാബു',
      phone: '9496112233',
      model: 'Vivo Y20',
      complaint: 'ഡിസ്‌പ്ലേ മാറ്റി, ഫിറ്റിംഗ് പൂർത്തിയായി',
      estimate: 1800,
      advance: 500,
      status: 'ready',
      receivedAt: now - oneDayMs * 3,
      readyAt: now - 3600000 * 2, // 2 hours ago
    },
    {
      customerName: 'അനീഷ് റഹ്മാൻ',
      phone: '9895443322',
      model: 'OnePlus Nord CE',
      complaint: 'ബാറ്ററി ബാക്കപ്പ് ഇല്ലായിരുന്നു, പുതിയ ബാറ്ററി ഇട്ടു',
      estimate: 1400,
      advance: 0,
      status: 'ready',
      receivedAt: now - oneDayMs * 2,
      readyAt: now - 3600000 * 5,
    },

    // 5 In History (4 Delivered, 1 Returned)
    {
      customerName: 'രാഹുൽ കൃഷ്ണൻ',
      phone: '9633114455',
      model: 'iPhone 11',
      complaint: 'ബാക്ക് ഗ്ലാസ് തകർന്നു, മാറ്റി നൽകി',
      estimate: 2200,
      advance: 1000,
      finalAmount: 2200,
      status: 'delivered',
      receivedAt: now - oneDayMs * 8,
      readyAt: now - oneDayMs * 7,
      deliveredAt: now - oneDayMs * 6,
    },
    {
      customerName: 'ഫാത്തിമ',
      phone: '9567881122',
      model: 'Redmi Note 8',
      complaint: 'ലൗഡ് സ്പീക്കർ സൗണ്ട് കുറവ്',
      estimate: 350,
      advance: 0,
      finalAmount: 350,
      status: 'delivered',
      receivedAt: now - oneDayMs * 10,
      readyAt: now - oneDayMs * 9,
      deliveredAt: now - oneDayMs * 9,
    },
    {
      customerName: 'ദിനേശ്',
      phone: '9446223344',
      model: 'Oppo A53',
      complaint: 'ഫുൾ കോംബോ ചേഞ്ച്',
      estimate: 1900,
      advance: 500,
      finalAmount: 1900,
      status: 'delivered',
      receivedAt: now - oneDayMs * 12,
      readyAt: now - oneDayMs * 11,
      deliveredAt: now - oneDayMs * 10,
    },
    {
      customerName: 'ജോസഫ് തോമസ്',
      phone: '9846337788',
      model: 'Poco X3',
      complaint: 'ഹെഡ്‌ഫോൺ ജാക്ക് പ്രശ്നം',
      estimate: 400,
      advance: 0,
      finalAmount: 400,
      status: 'delivered',
      receivedAt: now - oneDayMs * 14,
      readyAt: now - oneDayMs * 13,
      deliveredAt: now - oneDayMs * 13,
    },
    {
      customerName: 'മനോജ് കുമാർ',
      phone: '9744119900',
      model: 'Samsung Galaxy A50',
      complaint: 'മദർബോർഡ് ഡെഡ്, റീബൂട്ട് ആകുന്നില്ല',
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
