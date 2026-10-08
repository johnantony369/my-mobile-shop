import { collection, doc, getDocs, setDoc, query, where } from 'firebase/firestore';
import { dbFirestore } from './config';
import { MasterDevice, MasterSparePart } from '../types/wholesale';
import { MASTER_DEVICES_SEED, MASTER_SPARES_SEED, searchMasterSparesInMemory } from '../data/masterSparesSeed';
import { db } from '../db/db';

export async function fetchMasterDevices(): Promise<MasterDevice[]> {
  try {
    if (!dbFirestore) return MASTER_DEVICES_SEED;
    const colRef = collection(dbFirestore, 'master_devices');
    const snap = await getDocs(colRef);
    if (snap.empty) return MASTER_DEVICES_SEED;

    const list: MasterDevice[] = [];
    snap.forEach((d) => list.push({ ...(d.data() as MasterDevice), id: d.id }));
    return list.length > 0 ? list : MASTER_DEVICES_SEED;
  } catch (err) {
    console.warn('Could not fetch cloud master devices, using seed:', err);
    return MASTER_DEVICES_SEED;
  }
}

export async function fetchMasterSpares(deviceId?: string): Promise<MasterSparePart[]> {
  try {
    if (!dbFirestore) {
      return deviceId ? MASTER_SPARES_SEED.filter((s) => s.deviceId === deviceId) : MASTER_SPARES_SEED;
    }
    const colRef = collection(dbFirestore, 'master_spares');
    const q = deviceId ? query(colRef, where('deviceId', '==', deviceId)) : colRef;
    const snap = await getDocs(q);
    if (snap.empty) {
      return deviceId ? MASTER_SPARES_SEED.filter((s) => s.deviceId === deviceId) : MASTER_SPARES_SEED;
    }

    const list: MasterSparePart[] = [];
    snap.forEach((d) => list.push({ ...(d.data() as MasterSparePart), id: d.id }));
    return list;
  } catch (err) {
    console.warn('Could not fetch cloud master spares, using seed:', err);
    return deviceId ? MASTER_SPARES_SEED.filter((s) => s.deviceId === deviceId) : MASTER_SPARES_SEED;
  }
}

export async function searchMasterSpares(searchQuery: string): Promise<MasterSparePart[]> {
  try {
    const seedMatches = searchMasterSparesInMemory(searchQuery);
    return seedMatches;
  } catch (err) {
    console.warn('Error searching master spares:', err);
    return searchMasterSparesInMemory(searchQuery);
  }
}

export async function addCustomDevice(device: Omit<MasterDevice, 'id'>): Promise<MasterDevice> {
  const id = `${device.brand.toLowerCase()}_${device.model.toLowerCase().replace(/[^a-z0-9]+/g, '_')}`;
  const newDevice: MasterDevice = { ...device, id };

  try {
    if (dbFirestore) {
      await setDoc(doc(dbFirestore, 'master_devices', id), newDevice, { merge: true });
    }
  } catch (err) {
    console.warn('Failed to save device to cloud:', err);
  }

  // Prepend to in-memory seed list
  MASTER_DEVICES_SEED.unshift(newDevice);
  return newDevice;
}

export async function addCustomSparePart(spare: Omit<MasterSparePart, 'id'>): Promise<MasterSparePart> {
  const id = `${spare.deviceId}_${spare.category}_${Date.now()}`;
  const newPart: MasterSparePart = { ...spare, id };

  try {
    if (dbFirestore) {
      await setDoc(doc(dbFirestore, 'master_spares', id), newPart, { merge: true });
    }
  } catch (err) {
    console.warn('Failed to save spare to cloud:', err);
  }

  MASTER_SPARES_SEED.unshift(newPart);
  return newPart;
}

export async function updatePartCompatibility(partKey: string, compatibleModels: string[]): Promise<void> {
  try {
    // 1. Update local Dexie custom compatibilities
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

    // 2. Also update in-memory seed part if present
    const part = MASTER_SPARES_SEED.find((p) => p.id === partKey || p.partCode === partKey);
    if (part) {
      part.compatibleModels = Array.from(new Set([...part.compatibleModels, ...compatibleModels]));
    }
  } catch (err) {
    console.warn('Error saving custom compatibility:', err);
  }
}
