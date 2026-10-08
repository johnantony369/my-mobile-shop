import { collection, doc, getDocs, setDoc, query, where } from 'firebase/firestore';
import { dbFirestore, auth } from './config';
import { MasterDevice, MasterSparePart } from '../types/wholesale';
import { MASTER_DEVICES_SEED, MASTER_SPARES_SEED, searchMasterSparesInMemory } from '../data/masterSparesSeed';
import { db } from '../db/db';

let cachedDevices: MasterDevice[] | null = null;
let cachedSpares: MasterSparePart[] | null = null;

export async function loadFullDevices(): Promise<MasterDevice[]> {
  if (cachedDevices) return cachedDevices;
  try {
    const mod = await import('../data/models_2019_present.json');
    cachedDevices = (mod.default || mod) as MasterDevice[];
    return cachedDevices;
  } catch (err) {
    console.warn('Could not load full devices JSON, fallback to seed:', err);
    return MASTER_DEVICES_SEED;
  }
}

export async function loadFullSpares(): Promise<MasterSparePart[]> {
  if (cachedSpares) return cachedSpares;
  try {
    const mod = await import('../data/master_spares_catalog.json');
    cachedSpares = (mod.default || mod) as MasterSparePart[];
    return cachedSpares;
  } catch (err) {
    console.warn('Could not load full spares JSON, fallback to seed:', err);
    return MASTER_SPARES_SEED;
  }
}

export async function fetchMasterDevices(): Promise<MasterDevice[]> {
  const baseDevices = await loadFullDevices();
  try {
    const uid = auth?.currentUser?.uid;
    if (!dbFirestore || !uid) {
      return baseDevices;
    }

    // Fetch ONLY this shop's private custom devices (never polluted by other users)
    const userDevicesCol = collection(dbFirestore, 'users', uid, 'custom_devices');
    const snap = await getDocs(userDevicesCol);
    if (snap.empty) return baseDevices;

    const privateList: MasterDevice[] = [];
    snap.forEach((d) => privateList.push({ ...(d.data() as MasterDevice), id: d.id }));
    return [...privateList, ...baseDevices];
  } catch (err) {
    console.warn('Could not fetch user custom devices:', err);
    return baseDevices;
  }
}

export async function fetchMasterSpares(deviceId?: string): Promise<MasterSparePart[]> {
  const allBaseSpares = await loadFullSpares();
  const baseSpares = deviceId ? allBaseSpares.filter((s) => s.deviceId === deviceId) : allBaseSpares;

  try {
    const uid = auth?.currentUser?.uid;
    if (!dbFirestore || !uid) {
      return baseSpares;
    }

    // Fetch ONLY this shop's private custom spares (never polluted by other users)
    const userSparesCol = collection(dbFirestore, 'users', uid, 'custom_spares');
    const q = deviceId ? query(userSparesCol, where('deviceId', '==', deviceId)) : userSparesCol;
    const snap = await getDocs(q);
    if (snap.empty) return baseSpares;

    const privateList: MasterSparePart[] = [];
    snap.forEach((d) => privateList.push({ ...(d.data() as MasterSparePart), id: d.id }));
    return [...privateList, ...baseSpares];
  } catch (err) {
    console.warn('Could not fetch user custom spares:', err);
    return baseSpares;
  }
}

export async function searchMasterSpares(searchQuery: string): Promise<MasterSparePart[]> {
  try {
    const q = searchQuery.trim().toLowerCase();
    const allSpares = await loadFullSpares();

    if (!q) {
      return allSpares.slice(0, 50);
    }

    return allSpares
      .filter((part) => {
        const matchModel = part.model.toLowerCase().includes(q);
        const matchBrand = part.brand.toLowerCase().includes(q);
        const matchName = part.partName.toLowerCase().includes(q);
        const matchCode = part.partCode ? part.partCode.toLowerCase().includes(q) : false;
        const matchCompat = part.compatibleModels?.some((m) => m.toLowerCase().includes(q));

        return matchModel || matchBrand || matchName || matchCode || matchCompat;
      })
      .slice(0, 50);
  } catch (err) {
    console.warn('Error searching master spares:', err);
    return searchMasterSparesInMemory(searchQuery);
  }
}

export async function addCustomDevice(device: Omit<MasterDevice, 'id'>): Promise<MasterDevice> {
  const id = `${device.brand.toLowerCase()}_${device.model.toLowerCase().replace(/[^a-z0-9]+/g, '_')}`;
  const newDevice: MasterDevice = { ...device, id };

  try {
    const uid = auth?.currentUser?.uid;
    if (dbFirestore && uid) {
      // Save strictly to the current user's private shop data — NEVER to the global catalog
      await setDoc(doc(dbFirestore, 'users', uid, 'custom_devices', id), newDevice, { merge: true });
    }
  } catch (err) {
    console.warn('Failed to save private custom device:', err);
  }

  // Prepend to cached list & in-memory seed list for this shop session
  if (cachedDevices) {
    cachedDevices.unshift(newDevice);
  }
  MASTER_DEVICES_SEED.unshift(newDevice);
  return newDevice;
}

export async function addCustomSparePart(spare: Omit<MasterSparePart, 'id'>): Promise<MasterSparePart> {
  const id = `${spare.deviceId}_${spare.category}_${Date.now()}`;
  const newPart: MasterSparePart = { ...spare, id };

  try {
    const uid = auth?.currentUser?.uid;
    if (dbFirestore && uid) {
      // Save strictly to the current user's private shop data — NEVER to the global catalog
      await setDoc(doc(dbFirestore, 'users', uid, 'custom_spares', id), newPart, { merge: true });
    }
  } catch (err) {
    console.warn('Failed to save private custom spare:', err);
  }

  if (cachedSpares) {
    cachedSpares.unshift(newPart);
  }
  MASTER_SPARES_SEED.unshift(newPart);
  return newPart;
}

export async function updatePartCompatibility(partKey: string, compatibleModels: string[]): Promise<void> {
  try {
    // 1. Update local Dexie custom compatibilities for this shop
    const existing = await db.customCompatibilities.where('partKey').equals(partKey).first();
    if (existing && existing.id) {
      await db.customCompatibilities.update(existing.id, { compatibleModels, updatedAt: new Date().toISOString() });
    } else {
      await db.customCompatibilities.add({
        partKey,
        compatibleModels,
        updatedAt: new Date().toISOString(),
      });
    }

    // 2. Also update in-memory caches if present in current session
    const updateInList = (list: MasterSparePart[]) => {
      const part = list.find((p) => p.id === partKey || p.partCode === partKey);
      if (part) {
        part.compatibleModels = Array.from(new Set([...part.compatibleModels, ...compatibleModels]));
      }
    };

    if (cachedSpares) updateInList(cachedSpares);
    updateInList(MASTER_SPARES_SEED);
  } catch (err) {
    console.warn('Error saving custom compatibility:', err);
  }
}
