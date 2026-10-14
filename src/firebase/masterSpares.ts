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

export function deduplicateById<T extends { id: string }>(items: T[]): T[] {
  const seen = new Set<string>();
  const result: T[] = [];
  for (const item of items) {
    if (item && item.id) {
      if (seen.has(item.id)) continue;
      seen.add(item.id);
    }
    result.push(item);
  }
  return result;
}

export async function fetchMasterDevices(): Promise<MasterDevice[]> {
  const baseDevices = await loadFullDevices();
  try {
    const uid = auth?.currentUser?.uid;
    if (!dbFirestore || !uid) {
      return deduplicateById(baseDevices);
    }

    // Fetch ONLY this shop's private custom devices (never polluted by other users)
    const userDevicesCol = collection(dbFirestore, 'users', uid, 'custom_devices');
    const snap = await getDocs(userDevicesCol);
    if (snap.empty) return deduplicateById(baseDevices);

    const privateList: MasterDevice[] = [];
    snap.forEach((d) => privateList.push({ ...(d.data() as MasterDevice), id: d.id }));
    return deduplicateById([...privateList, ...baseDevices]);
  } catch (err) {
    console.warn('Could not fetch user custom devices:', err);
    return deduplicateById(baseDevices);
  }
}

export async function fetchMasterSpares(deviceId?: string): Promise<MasterSparePart[]> {
  const allBaseSpares = await loadFullSpares();
  const baseSpares = deviceId ? allBaseSpares.filter((s) => s.deviceId === deviceId) : allBaseSpares;

  try {
    const uid = auth?.currentUser?.uid;
    if (!dbFirestore || !uid) {
      return deduplicateById(baseSpares);
    }

    // Fetch ONLY this shop's private custom spares (never polluted by other users)
    const userSparesCol = collection(dbFirestore, 'users', uid, 'custom_spares');
    const q = deviceId ? query(userSparesCol, where('deviceId', '==', deviceId)) : userSparesCol;
    const snap = await getDocs(q);
    if (snap.empty) return deduplicateById(baseSpares);

    const privateList: MasterSparePart[] = [];
    snap.forEach((d) => privateList.push({ ...(d.data() as MasterSparePart), id: d.id }));
    return deduplicateById([...privateList, ...baseSpares]);
  } catch (err) {
    console.warn('Could not fetch user custom spares:', err);
    return deduplicateById(baseSpares);
  }
}

export async function searchMasterSpares(searchQuery: string): Promise<MasterSparePart[]> {
  try {
    const q = searchQuery.trim().toLowerCase();
    const allSpares = await loadFullSpares();

    if (!q) {
      return allSpares.slice(0, 50);
    }

    const results: MasterSparePart[] = [];
    for (let i = 0; i < allSpares.length; i++) {
      const part = allSpares[i];
      const matchModel = part.model.toLowerCase().includes(q);
      const matchBrand = part.brand.toLowerCase().includes(q);
      const matchName = part.partName.toLowerCase().includes(q);
      const matchCode = part.partCode ? part.partCode.toLowerCase().includes(q) : false;
      const matchCompat = part.compatibleModels?.some((m) => m.toLowerCase().includes(q));

      if (matchModel || matchBrand || matchName || matchCode || matchCompat) {
        results.push(part);
        if (results.length >= 50) break;
      }
    }
    return results;
  } catch (err) {
    console.warn('Error searching master spares:', err);
    return searchMasterSparesInMemory(searchQuery);
  }
}

export async function searchMasterDevices(searchQuery: string): Promise<MasterDevice[]> {
  try {
    const q = searchQuery.trim().toLowerCase();
    const allDevices = await fetchMasterDevices();
    if (!q) {
      return allDevices.slice(0, 20);
    }

    const results: MasterDevice[] = [];
    for (let i = 0; i < allDevices.length; i++) {
      const d = allDevices[i];
      const fullName = `${d.brand} ${d.model}`.toLowerCase();
      const matchModel = d.model.toLowerCase().includes(q);
      const matchBrand = d.brand.toLowerCase().includes(q);
      const matchFull = fullName.includes(q);
      const matchCodes = d.modelCodes?.some((c) => c.toLowerCase().includes(q));

      if (matchModel || matchBrand || matchFull || matchCodes) {
        results.push(d);
        if (results.length >= 25) break;
      }
    }
    return results;
  } catch (err) {
    console.warn('Error searching master devices:', err);
    return [];
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

  // Update cached list & in-memory seed list without duplicates for this shop session
  if (cachedDevices) {
    cachedDevices = [newDevice, ...cachedDevices.filter((d) => d.id !== newDevice.id)];
  }
  const seedIdx = MASTER_DEVICES_SEED.findIndex((d) => d.id === newDevice.id);
  if (seedIdx >= 0) {
    MASTER_DEVICES_SEED[seedIdx] = newDevice;
  } else {
    MASTER_DEVICES_SEED.unshift(newDevice);
  }
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
    cachedSpares = [newPart, ...cachedSpares.filter((s) => s.id !== newPart.id)];
  }
  const spareSeedIdx = MASTER_SPARES_SEED.findIndex((s) => s.id === newPart.id);
  if (spareSeedIdx >= 0) {
    MASTER_SPARES_SEED[spareSeedIdx] = newPart;
  } else {
    MASTER_SPARES_SEED.unshift(newPart);
  }
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
