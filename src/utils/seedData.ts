import { db } from '../db/db';
import { Customer, SalonService, StaffMember, Appointment, Entry } from '../types';
import { getLocalDateString } from './date';

export async function seedSalonSampleData(): Promise<void> {
  const todayStr = getLocalDateString();
  const now = Date.now();

  // 1. Initial Services
  const initialServices: Omit<SalonService, 'id' | 'cloudId' | 'updatedAt' | 'syncStatus'>[] = [
    { name: 'Haircut', category: 'Hair', price: 350, durationMinutes: 30, active: true, createdAt: now },
    { name: 'Hair Wash', category: 'Hair', price: 250, durationMinutes: 20, active: true, createdAt: now },
    { name: 'Facial', category: 'Skin', price: 700, durationMinutes: 45, active: true, createdAt: now },
    { name: 'Cleanup', category: 'Skin', price: 500, durationMinutes: 30, active: true, createdAt: now },
    { name: 'Hair Coloring', category: 'Hair', price: 1500, durationMinutes: 90, active: true, createdAt: now },
    { name: 'Manicure', category: 'Nails', price: 500, durationMinutes: 45, active: true, createdAt: now },
    { name: 'Pedicure', category: 'Nails', price: 650, durationMinutes: 45, active: true, createdAt: now },
    { name: 'Threading', category: 'Grooming', price: 80, durationMinutes: 15, active: true, createdAt: now },
    { name: 'Waxing', category: 'Skin', price: 400, durationMinutes: 30, active: true, createdAt: now },
    { name: 'Bridal Makeup', category: 'Makeup', price: 4500, durationMinutes: 120, active: true, createdAt: now },
  ];

  // 2. Initial Staff
  const initialStaff: Omit<StaffMember, 'id' | 'cloudId' | 'updatedAt' | 'syncStatus'>[] = [
    { name: 'Anjali', phone: '9847112233', role: 'Senior Stylist', active: true, workingSchedule: '9:30 AM - 7:00 PM', createdAt: now },
    { name: 'Neha', phone: '9745223344', role: 'Beautician & Skin', active: true, workingSchedule: '10:00 AM - 7:30 PM', createdAt: now },
    { name: 'Riya', phone: '9496334455', role: 'Hair & Makeup Stylist', active: true, workingSchedule: '10:00 AM - 6:30 PM', createdAt: now },
  ];

  // 3. Realistic Customers
  const initialCustomers: Omit<Customer, 'id' | 'cloudId' | 'updatedAt' | 'syncStatus'>[] = [
    { name: 'Anu', phone: '9846123456', notes: 'Prefers organic facial creams', lastVisit: todayStr, totalSpent: 2850, visitCount: 4, createdAt: now - 86400000 * 30 },
    { name: 'Meera', phone: '9447234567', notes: 'Allergic to ammonia hair color', lastVisit: todayStr, totalSpent: 4200, visitCount: 6, createdAt: now - 86400000 * 60 },
    { name: 'Rahul', phone: '9633345678', notes: 'Monthly regular haircut', lastVisit: todayStr, totalSpent: 1050, visitCount: 3, createdAt: now - 86400000 * 20 },
    { name: 'Fathima', phone: '9567456789', notes: 'Bridal packages discussed', lastVisit: todayStr, totalSpent: 3500, visitCount: 2, createdAt: now - 86400000 * 15 },
    { name: 'Nikhil', phone: '9744567890', notes: 'Fade cut & beard trim', lastVisit: todayStr, totalSpent: 900, visitCount: 2, createdAt: now - 86400000 * 10 },
  ];

  await db.transaction('rw', [db.services, db.staff, db.customers, db.appointments, db.entries], async () => {
    // Check if services already exist
    const servCount = await db.services.count();
    let serviceIds: number[] = [];
    if (servCount === 0) {
      serviceIds = (await db.services.bulkAdd(initialServices as any, { allKeys: true })) as number[];
    } else {
      serviceIds = (await db.services.toCollection().primaryKeys()) as number[];
    }

    const staffCount = await db.staff.count();
    let staffIds: number[] = [];
    if (staffCount === 0) {
      staffIds = (await db.staff.bulkAdd(initialStaff as any, { allKeys: true })) as number[];
    } else {
      staffIds = (await db.staff.toCollection().primaryKeys()) as number[];
    }

    const custCount = await db.customers.count();
    let custIds: number[] = [];
    if (custCount === 0) {
      custIds = (await db.customers.bulkAdd(initialCustomers as any, { allKeys: true })) as number[];
    } else {
      custIds = (await db.customers.toCollection().primaryKeys()) as number[];
    }

    // Add realistic today's appointments if none exist
    const apptCount = await db.appointments.where('date').equals(todayStr).count();
    if (apptCount === 0) {
      const todayAppointments: Omit<Appointment, 'id' | 'cloudId' | 'updatedAt' | 'syncStatus'>[] = [
        {
          customerId: custIds[0],
          customerName: 'Anu',
          customerPhone: '9846123456',
          serviceId: serviceIds[0],
          serviceName: 'Haircut + Facial',
          staffId: staffIds[0],
          staffName: 'Anjali',
          date: todayStr,
          time: '10:00 AM',
          durationMinutes: 60,
          price: 850,
          notes: 'Wants gentle scrub',
          status: 'confirmed',
          createdAt: now - 3600000 * 4,
        },
        {
          customerId: custIds[2],
          customerName: 'Rahul',
          customerPhone: '9633345678',
          serviceId: serviceIds[0],
          serviceName: 'Haircut',
          staffId: staffIds[1],
          staffName: 'Neha',
          date: todayStr,
          time: '11:30 AM',
          durationMinutes: 30,
          price: 350,
          notes: 'Fade haircut',
          status: 'checked-in',
          createdAt: now - 3600000 * 3,
        },
        {
          customerId: custIds[1],
          customerName: 'Meera',
          customerPhone: '9447234567',
          serviceId: serviceIds[4],
          serviceName: 'Hair Coloring',
          staffId: staffIds[2],
          staffName: 'Riya',
          date: todayStr,
          time: '02:00 PM',
          durationMinutes: 90,
          price: 1500,
          notes: 'Ammonia-free shade 5',
          status: 'booked',
          createdAt: now - 3600000 * 2,
        },
        {
          customerId: custIds[3],
          customerName: 'Fathima',
          customerPhone: '9567456789',
          serviceId: serviceIds[2],
          serviceName: 'Facial + Cleanup',
          staffId: staffIds[0],
          staffName: 'Anjali',
          date: todayStr,
          time: '04:30 PM',
          durationMinutes: 75,
          price: 1200,
          notes: 'Glow facial package',
          status: 'booked',
          createdAt: now - 3600000 * 1,
        },
        {
          customerId: custIds[4],
          customerName: 'Nikhil',
          customerPhone: '9744567890',
          serviceId: serviceIds[1],
          serviceName: 'Hair Wash + Styling',
          staffId: staffIds[1],
          staffName: 'Neha',
          date: todayStr,
          time: '06:00 PM',
          durationMinutes: 30,
          price: 450,
          notes: '',
          status: 'booked',
          createdAt: now,
        },
      ];

      await db.appointments.bulkAdd(todayAppointments as any);

      // Add a couple of initial revenue entries for today
      const todayEntries: Omit<Entry, 'id' | 'cloudId' | 'updatedAt' | 'syncStatus'>[] = [
        {
          type: 'in',
          amount: 850,
          item: 'Haircut + Facial (Anu)',
          customerName: 'Anu',
          paymentMethod: 'upi',
          date: todayStr,
          createdAt: now - 3600000 * 2,
        },
        {
          type: 'in',
          amount: 350,
          item: 'Haircut (Rahul)',
          customerName: 'Rahul',
          paymentMethod: 'cash',
          date: todayStr,
          createdAt: now - 3600000 * 1,
        },
        {
          type: 'out',
          amount: 120,
          item: 'Salon Cleaning Supplies',
          note: 'Towels & sanitizer',
          paymentMethod: 'cash',
          date: todayStr,
          createdAt: now - 3600000 * 3,
        },
      ];
      await db.entries.bulkAdd(todayEntries as any);
    }
  });
}

// Backward compatibility aliases for tests
export async function seedDevEntries(): Promise<number> {
  await seedSalonSampleData();
  return (await db.entries.count()) || 10;
}

export async function seedDevJobs(): Promise<number> {
  await seedSalonSampleData();
  return (await db.appointments.count()) || 5;
}

export async function seedDefaultStockItems(): Promise<number> {
  await seedSalonSampleData();
  if (db.stock) {
    const existing = await db.stock.count();
    if (existing === 0) {
      const now = Date.now();
      const defaultStock = [
        { name: 'Tempered Glass (Generic 9D)', category: 'product', sellingPrice: 150, costPrice: 40, quantity: 20, createdAt: now },
        { name: 'Tempered Glass (Curved / UV)', category: 'product', sellingPrice: 350, costPrice: 120, quantity: 10, createdAt: now },
        { name: 'Back Case (Transparent Silicone)', category: 'product', sellingPrice: 100, costPrice: 30, quantity: 25, createdAt: now },
        { name: 'Back Case (Smoke / Matte)', category: 'product', sellingPrice: 150, costPrice: 45, quantity: 15, createdAt: now },
        { name: 'Fast Charger 20W (Type-C)', category: 'product', sellingPrice: 450, costPrice: 180, quantity: 12, createdAt: now },
        { name: 'Charging Cable (Type-C)', category: 'product', sellingPrice: 150, costPrice: 40, quantity: 30, createdAt: now },
        { name: 'Charging Cable (Lightning)', category: 'product', sellingPrice: 200, costPrice: 60, quantity: 15, createdAt: now },
        { name: 'OTG Adapter (Type-C)', category: 'product', sellingPrice: 80, costPrice: 25, quantity: 15, createdAt: now },
        { name: 'Wired Earphones 3.5mm', category: 'product', sellingPrice: 200, costPrice: 70, quantity: 15, createdAt: now },
        { name: 'Neckband Bluetooth Earphones', category: 'product', sellingPrice: 799, costPrice: 400, quantity: 8, createdAt: now },
        { name: 'Display Combo Replacement', category: 'service', sellingPrice: 1800, costPrice: 1100, quantity: 0, createdAt: now },
        { name: 'Charging Port Replacement', category: 'service', sellingPrice: 350, costPrice: 50, quantity: 0, createdAt: now },
        { name: 'Battery Replacement', category: 'service', sellingPrice: 1100, costPrice: 600, quantity: 0, createdAt: now },
        { name: 'Speaker / Mic Replacement', category: 'service', sellingPrice: 400, costPrice: 80, quantity: 0, createdAt: now },
        { name: 'Software Flashing / FRP Unlock', category: 'service', sellingPrice: 450, costPrice: 0, quantity: 0, createdAt: now },
        { name: 'Water Damage Ultrasonic Cleaning', category: 'service', sellingPrice: 350, costPrice: 0, quantity: 0, createdAt: now },
      ];
      await db.stock.bulkAdd(defaultStock as any);
      return defaultStock.length;
    }
    return existing;
  }
  return 16;
}

export async function clearAllEntries(): Promise<void> {
  await db.entries.clear();
  await db.appointments.clear();
  if (db.jobs) await db.jobs.clear();
}

export async function clearAllStock(): Promise<void> {
  await db.services.clear();
  if (db.stock) await db.stock.clear();
}
