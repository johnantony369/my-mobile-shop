import { SyncMetadata } from './index';

export type SpareCategory =
  | 'display'
  | 'battery'
  | 'charging_board'
  | 'back_panel'
  | 'camera_glass'
  | 'flex'
  | 'speaker'
  | 'glass_oca'
  | 'sim_tray'
  | 'other';

export interface MasterDevice {
  id: string; // e.g. "xiaomi_redmi_note_10"
  brand: string;
  model: string;
  photoUrl?: string;
  releaseYear?: number;
}

export interface MasterSparePart {
  id: string; // e.g. "xiaomi_redmi_note_10_display"
  deviceId: string;
  brand: string;
  model: string;
  category: SpareCategory;
  partName: string;
  partCode?: string; // e.g. "BN53"
  wholesalePrice?: number;
  costPrice?: number;
  photoUrl?: string;
  compatibleModels: string[];
}

export interface CustomPartCompatibility extends SyncMetadata {
  id?: number;
  partKey: string;
  compatibleModels: string[];
}

export interface WholesaleClient extends SyncMetadata {
  id?: number;
  cloudId: string;
  shopName: string;
  contactPerson?: string;
  phone: string;
  address?: string;
  creditLimit?: number;
  currentCreditBalance: number;
  createdAt: number;
}

export type ClientTransactionType = 'credit_sale' | 'payment_received';
export type WholesalePaymentMethod = 'cash' | 'upi' | 'bank_transfer' | 'cheque';

export interface ClientTransaction extends SyncMetadata {
  id?: number;
  cloudId: string;
  clientCloudId: string;
  dayBookEntryId?: number;
  type: ClientTransactionType;
  amount: number;
  paymentMethod?: WholesalePaymentMethod;
  note?: string;
  date: string; // 'YYYY-MM-DD'
  createdAt: number;
}
