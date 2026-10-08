import { MasterDevice, MasterSparePart } from '../types/wholesale';

export const MASTER_DEVICES_SEED: MasterDevice[] = [
  // Xiaomi / Redmi / Poco
  { id: 'xiaomi_redmi_note_10', brand: 'Xiaomi', model: 'Redmi Note 10', releaseYear: 2021 },
  { id: 'xiaomi_redmi_note_10_pro', brand: 'Xiaomi', model: 'Redmi Note 10 Pro', releaseYear: 2021 },
  { id: 'xiaomi_redmi_note_11', brand: 'Xiaomi', model: 'Redmi Note 11', releaseYear: 2022 },
  { id: 'xiaomi_redmi_note_12', brand: 'Xiaomi', model: 'Redmi Note 12', releaseYear: 2023 },
  { id: 'xiaomi_redmi_9_power', brand: 'Xiaomi', model: 'Redmi 9 Power', releaseYear: 2020 },
  { id: 'xiaomi_redmi_9_prime', brand: 'Xiaomi', model: 'Redmi 9 Prime', releaseYear: 2020 },
  { id: 'poco_m2_pro', brand: 'Xiaomi', model: 'Poco M2 Pro', releaseYear: 2020 },
  { id: 'poco_x3_pro', brand: 'Xiaomi', model: 'Poco X3 Pro', releaseYear: 2021 },

  // Samsung
  { id: 'samsung_m31', brand: 'Samsung', model: 'Galaxy M31', releaseYear: 2020 },
  { id: 'samsung_m21', brand: 'Samsung', model: 'Galaxy M21', releaseYear: 2020 },
  { id: 'samsung_a12', brand: 'Samsung', model: 'Galaxy A12', releaseYear: 2021 },
  { id: 'samsung_a14_5g', brand: 'Samsung', model: 'Galaxy A14 5G', releaseYear: 2023 },
  { id: 'samsung_a50', brand: 'Samsung', model: 'Galaxy A50', releaseYear: 2019 },
  { id: 'samsung_a51', brand: 'Samsung', model: 'Galaxy A51', releaseYear: 2020 },
  { id: 'samsung_s21_fe', brand: 'Samsung', model: 'Galaxy S21 FE', releaseYear: 2022 },

  // Vivo / iQOO
  { id: 'vivo_y20', brand: 'Vivo', model: 'Vivo Y20', releaseYear: 2020 },
  { id: 'vivo_y21', brand: 'Vivo', model: 'Vivo Y21', releaseYear: 2021 },
  { id: 'vivo_y16', brand: 'Vivo', model: 'Vivo Y16', releaseYear: 2022 },
  { id: 'vivo_t1_5g', brand: 'Vivo', model: 'Vivo T1 5G', releaseYear: 2022 },
  { id: 'vivo_v20', brand: 'Vivo', model: 'Vivo V20', releaseYear: 2020 },
  { id: 'vivo_v23_5g', brand: 'Vivo', model: 'Vivo V23 5G', releaseYear: 2022 },

  // Oppo
  { id: 'oppo_a15', brand: 'Oppo', model: 'Oppo A15', releaseYear: 2020 },
  { id: 'oppo_a16', brand: 'Oppo', model: 'Oppo A16', releaseYear: 2021 },
  { id: 'oppo_a53', brand: 'Oppo', model: 'Oppo A53', releaseYear: 2020 },
  { id: 'oppo_a54', brand: 'Oppo', model: 'Oppo A54', releaseYear: 2021 },
  { id: 'oppo_reno_6', brand: 'Oppo', model: 'Oppo Reno 6', releaseYear: 2021 },
  { id: 'oppo_reno_8', brand: 'Oppo', model: 'Oppo Reno 8', releaseYear: 2022 },

  // Realme
  { id: 'realme_8', brand: 'Realme', model: 'Realme 8', releaseYear: 2021 },
  { id: 'realme_9', brand: 'Realme', model: 'Realme 9', releaseYear: 2022 },
  { id: 'realme_10', brand: 'Realme', model: 'Realme 10', releaseYear: 2023 },
  { id: 'realme_c11', brand: 'Realme', model: 'Realme C11', releaseYear: 2020 },
  { id: 'realme_c21', brand: 'Realme', model: 'Realme C21', releaseYear: 2021 },
  { id: 'realme_c35', brand: 'Realme', model: 'Realme C35', releaseYear: 2022 },
  { id: 'realme_narzo_30', brand: 'Realme', model: 'Realme Narzo 30', releaseYear: 2021 },

  // Apple
  { id: 'apple_iphone_11', brand: 'Apple', model: 'iPhone 11', releaseYear: 2019 },
  { id: 'apple_iphone_12', brand: 'Apple', model: 'iPhone 12', releaseYear: 2020 },
  { id: 'apple_iphone_13', brand: 'Apple', model: 'iPhone 13', releaseYear: 2021 },
  { id: 'apple_iphone_14', brand: 'Apple', model: 'iPhone 14', releaseYear: 2022 },

  // OnePlus
  { id: 'oneplus_nord_ce_2', brand: 'OnePlus', model: 'OnePlus Nord CE 2', releaseYear: 2022 },
  { id: 'oneplus_nord_ce_3', brand: 'OnePlus', model: 'OnePlus Nord CE 3', releaseYear: 2023 },
  { id: 'oneplus_7', brand: 'OnePlus', model: 'OnePlus 7', releaseYear: 2019 },
  { id: 'oneplus_8t', brand: 'OnePlus', model: 'OnePlus 8T', releaseYear: 2020 },
  { id: 'oneplus_9r', brand: 'OnePlus', model: 'OnePlus 9R', releaseYear: 2021 },
];

export const MASTER_SPARES_SEED: MasterSparePart[] = [
  // Redmi Note 10
  {
    id: 'rn10_display',
    deviceId: 'xiaomi_redmi_note_10',
    brand: 'Xiaomi',
    model: 'Redmi Note 10',
    category: 'display',
    partName: 'Display Combo (Folder OLED)',
    wholesalePrice: 1650,
    costPrice: 1400,
    compatibleModels: ['Redmi Note 10', 'Redmi Note 10S'],
  },
  {
    id: 'rn10_battery',
    deviceId: 'xiaomi_redmi_note_10',
    brand: 'Xiaomi',
    model: 'Redmi Note 10',
    category: 'battery',
    partName: 'Battery 5000mAh',
    partCode: 'BN53',
    wholesalePrice: 550,
    costPrice: 420,
    compatibleModels: ['Redmi Note 10', 'Redmi Note 9 Pro', 'Poco M2 Pro', 'Redmi 9 Power'],
  },
  {
    id: 'rn10_cc',
    deviceId: 'xiaomi_redmi_note_10',
    brand: 'Xiaomi',
    model: 'Redmi Note 10',
    category: 'charging_board',
    partName: 'Charging Sub-Board (CC Board with Mic)',
    wholesalePrice: 180,
    costPrice: 110,
    compatibleModels: ['Redmi Note 10'],
  },
  {
    id: 'rn10_back',
    deviceId: 'xiaomi_redmi_note_10',
    brand: 'Xiaomi',
    model: 'Redmi Note 10',
    category: 'back_panel',
    partName: 'Back Panel Battery Door Cover',
    wholesalePrice: 220,
    costPrice: 140,
    compatibleModels: ['Redmi Note 10'],
  },
  {
    id: 'rn10_cam_glass',
    deviceId: 'xiaomi_redmi_note_10',
    brand: 'Xiaomi',
    model: 'Redmi Note 10',
    category: 'camera_glass',
    partName: 'Camera Glass Lens with Frame',
    wholesalePrice: 90,
    costPrice: 40,
    compatibleModels: ['Redmi Note 10'],
  },

  // Vivo Y20
  {
    id: 'vy20_display',
    deviceId: 'vivo_y20',
    brand: 'Vivo',
    model: 'Vivo Y20',
    category: 'display',
    partName: 'Display Combo (Folder Incell)',
    wholesalePrice: 850,
    costPrice: 680,
    compatibleModels: ['Vivo Y20', 'Vivo Y20i', 'Vivo Y12s', 'Vivo Y20G'],
  },
  {
    id: 'vy20_battery',
    deviceId: 'vivo_y20',
    brand: 'Vivo',
    model: 'Vivo Y20',
    category: 'battery',
    partName: 'Battery 5000mAh',
    partCode: 'B-O5',
    wholesalePrice: 490,
    costPrice: 380,
    compatibleModels: ['Vivo Y20', 'Vivo Y12s'],
  },
  {
    id: 'vy20_cc',
    deviceId: 'vivo_y20',
    brand: 'Vivo',
    model: 'Vivo Y20',
    category: 'charging_board',
    partName: 'Charging Connector Sub-Board',
    wholesalePrice: 130,
    costPrice: 75,
    compatibleModels: ['Vivo Y20', 'Vivo Y20i'],
  },

  // Samsung M31
  {
    id: 'sm31_display',
    deviceId: 'samsung_m31',
    brand: 'Samsung',
    model: 'Galaxy M31',
    category: 'display',
    partName: 'Display Combo (OLED Frame)',
    wholesalePrice: 1950,
    costPrice: 1600,
    compatibleModels: ['Galaxy M31', 'Galaxy M21', 'Galaxy M30s'],
  },
  {
    id: 'sm31_battery',
    deviceId: 'samsung_m31',
    brand: 'Samsung',
    model: 'Galaxy M31',
    category: 'battery',
    partName: 'Battery 6000mAh',
    partCode: 'EB-BM207ABY',
    wholesalePrice: 650,
    costPrice: 490,
    compatibleModels: ['Galaxy M31', 'Galaxy M21'],
  },

  // Realme 8
  {
    id: 'r8_display',
    deviceId: 'realme_8',
    brand: 'Realme',
    model: 'Realme 8',
    category: 'display',
    partName: 'Display Combo Folder (Super AMOLED)',
    wholesalePrice: 2100,
    costPrice: 1750,
    compatibleModels: ['Realme 8', 'Realme 8 Pro'],
  },
  {
    id: 'r8_battery',
    deviceId: 'realme_8',
    brand: 'Realme',
    model: 'Realme 8',
    category: 'battery',
    partName: 'Battery 5000mAh',
    partCode: 'BLP837',
    wholesalePrice: 520,
    costPrice: 410,
    compatibleModels: ['Realme 8'],
  },

  // iPhone 11
  {
    id: 'ip11_display',
    deviceId: 'apple_iphone_11',
    brand: 'Apple',
    model: 'iPhone 11',
    category: 'display',
    partName: 'Display Screen Assembly (Incell High Brightness)',
    wholesalePrice: 1550,
    costPrice: 1250,
    compatibleModels: ['iPhone 11'],
  },
  {
    id: 'ip11_battery',
    deviceId: 'apple_iphone_11',
    brand: 'Apple',
    model: 'iPhone 11',
    category: 'battery',
    partName: 'Battery 3110mAh High Capacity',
    partCode: '616-00641',
    wholesalePrice: 780,
    costPrice: 580,
    compatibleModels: ['iPhone 11'],
  },

  // OnePlus Nord CE 2
  {
    id: 'opnce2_display',
    deviceId: 'oneplus_nord_ce_2',
    brand: 'OnePlus',
    model: 'OnePlus Nord CE 2',
    category: 'display',
    partName: 'Display Combo (Fluid AMOLED)',
    wholesalePrice: 2400,
    costPrice: 2000,
    compatibleModels: ['OnePlus Nord CE 2'],
  },
  {
    id: 'opnce2_battery',
    deviceId: 'oneplus_nord_ce_2',
    brand: 'OnePlus',
    model: 'OnePlus Nord CE 2',
    category: 'battery',
    partName: 'Battery 4500mAh Dual-Cell',
    partCode: 'BLP911',
    wholesalePrice: 620,
    costPrice: 480,
    compatibleModels: ['OnePlus Nord CE 2'],
  },
];

export function searchMasterSparesInMemory(query: string): MasterSparePart[] {
  const q = query.trim().toLowerCase();
  if (!q) return MASTER_SPARES_SEED;

  return MASTER_SPARES_SEED.filter((part) => {
    const matchModel = part.model.toLowerCase().includes(q);
    const matchBrand = part.brand.toLowerCase().includes(q);
    const matchName = part.partName.toLowerCase().includes(q);
    const matchCode = part.partCode ? part.partCode.toLowerCase().includes(q) : false;
    const matchCompat = part.compatibleModels?.some((m) => m.toLowerCase().includes(q));

    return matchModel || matchBrand || matchName || matchCode || matchCompat;
  });
}
