import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  Smartphone,
  Laptop,
  Tablet,
  Watch,
  Headphones,
  Disc,
  ShieldCheck,
  Camera,
  CheckCircle2,
  AlertCircle,
  Share2,
  Trash2,
  Check,
} from 'lucide-react';
import { UsedDevice, DeviceCategory } from '../types';
import { addUsedDevice, updateUsedDevice } from '../db/db';
import { isValidIMEI, formatWhatsAppDeclaration } from '../utils/usedDevices';
import { compressImageFile } from '../utils/image';
import { getLocalDateString } from '../utils/date';

export interface AddEditUsedPhoneSheetProps {
  isOpen: boolean;
  onClose: () => void;
  deviceToEdit?: UsedDevice | null;
  shopName: string;
  onSaved?: () => void;
}

const CATEGORIES: { id: DeviceCategory; label: string; icon: React.FC<{ className?: string }> }[] = [
  { id: 'phone', label: 'Phone', icon: Smartphone },
  { id: 'laptop', label: 'Laptop', icon: Laptop },
  { id: 'tablet', label: 'Tablet', icon: Tablet },
  { id: 'smartwatch', label: 'Watch', icon: Watch },
  { id: 'earbuds', label: 'Earbuds', icon: Headphones },
  { id: 'other', label: 'Gadget', icon: Disc },
];

const BRANDS_BY_CATEGORY: Record<DeviceCategory, string[]> = {
  phone: ['Apple', 'Samsung', 'OnePlus', 'Vivo', 'Oppo', 'Realme', 'Xiaomi', 'Motorola', 'Other'],
  laptop: ['Apple', 'Dell', 'HP', 'Lenovo', 'Asus', 'Acer', 'MSI', 'Other'],
  tablet: ['Apple', 'Samsung', 'Lenovo', 'OnePlus', 'Xiaomi', 'Other'],
  smartwatch: ['Apple', 'Samsung', 'Noise', 'boAt', 'Fire-Boltt', 'Garmin', 'Other'],
  earbuds: ['Apple', 'boAt', 'OnePlus', 'Samsung', 'Sony', 'Noise', 'Other'],
  other: ['Apple', 'Sony', 'Xiaomi', 'Boat', 'Other'],
};

const STORAGE_OPTIONS = ['64GB', '128GB', '256GB', '512GB', '1TB', '256GB SSD', '512GB SSD', '1TB SSD', 'N/A'];
const GOVT_ID_TYPES = ['Aadhaar', 'Driving License', 'Voter ID', 'PAN', 'Other'];

export const AddEditUsedPhoneSheet: React.FC<AddEditUsedPhoneSheetProps> = ({
  isOpen,
  onClose,
  deviceToEdit,
  shopName,
  onSaved,
}) => {
  const isEditing = Boolean(deviceToEdit && deviceToEdit.id);

  // Form State
  const [deviceCategory, setDeviceCategory] = useState<DeviceCategory>('phone');
  const [brand, setBrand] = useState('Apple');
  const [model, setModel] = useState('');
  const [imei, setImei] = useState('');
  const [serialNumber, setSerialNumber] = useState('');
  const [storage, setStorage] = useState('128GB');
  const [color, setColor] = useState('');
  const [accessories, setAccessories] = useState<string[]>(['Box', 'Original Charger']);
  const [purchasePriceStr, setPurchasePriceStr] = useState('');
  const [sellingPriceStr, setSellingPriceStr] = useState('');
  const [createDayBookEntry, setCreateDayBookEntry] = useState(true);

  // Seller KYC
  const [sellerName, setSellerName] = useState('');
  const [sellerPhone, setSellerPhone] = useState('');
  const [sellerGovtIdType, setSellerGovtIdType] = useState('Aadhaar');
  const [sellerGovtIdNumber, setSellerGovtIdNumber] = useState('');
  const [sellerIdPhotoUrl, setSellerIdPhotoUrl] = useState<string | undefined>(undefined);
  const [isCompressingPhoto, setIsCompressingPhoto] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (deviceToEdit) {
      const cat = deviceToEdit.deviceCategory || 'phone';
      setDeviceCategory(cat);
      setBrand(deviceToEdit.brand || (BRANDS_BY_CATEGORY[cat] ? BRANDS_BY_CATEGORY[cat][0] : 'Apple'));
      setModel(deviceToEdit.model || '');
      setImei(deviceToEdit.imei || '');
      setSerialNumber(deviceToEdit.serialNumber || '');
      setStorage(deviceToEdit.storage || (cat === 'laptop' ? '512GB SSD' : cat === 'earbuds' || cat === 'smartwatch' ? 'N/A' : '128GB'));
      setColor(deviceToEdit.color || '');
      setAccessories(deviceToEdit.accessories || []);
      setPurchasePriceStr(String(deviceToEdit.purchasePrice || ''));
      setSellingPriceStr(deviceToEdit.sellingPrice ? String(deviceToEdit.sellingPrice) : '');
      setCreateDayBookEntry(false); // Don't re-create Day Book on edit
      setSellerName(deviceToEdit.sellerName || '');
      setSellerPhone(deviceToEdit.sellerPhone || '');
      setSellerGovtIdType(deviceToEdit.sellerGovtIdType || 'Aadhaar');
      setSellerGovtIdNumber(deviceToEdit.sellerGovtIdNumber || '');
      setSellerIdPhotoUrl(deviceToEdit.sellerIdPhotoUrl);
    } else {
      // Reset
      setDeviceCategory('phone');
      setBrand('Apple');
      setModel('');
      setImei('');
      setSerialNumber('');
      setStorage('128GB');
      setColor('');
      setAccessories(['Box', 'Original Charger']);
      setPurchasePriceStr('');
      setSellingPriceStr('');
      setCreateDayBookEntry(true);
      setSellerName('');
      setSellerPhone('');
      setSellerGovtIdType('Aadhaar');
      setSellerGovtIdNumber('');
      setSellerIdPhotoUrl(undefined);
    }
    setErrorMsg(null);
  }, [deviceToEdit, isOpen]);

  if (!isOpen) return null;

  const isPhone = deviceCategory === 'phone';
  const cleanImei = imei.trim();
  const cleanSerial = serialNumber.trim();
  const is15Digits = /^\d{15}$/.test(cleanImei);
  const isLuhnValid = is15Digits && isValidIMEI(cleanImei);

  const toggleAccessory = (acc: string) => {
    if (accessories.includes(acc)) {
      setAccessories(accessories.filter((a) => a !== acc));
    } else {
      setAccessories([...accessories, acc]);
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsCompressingPhoto(true);
      const { dataUrl } = await compressImageFile(file, 800, 0.7);
      setSellerIdPhotoUrl(dataUrl);
    } catch (err) {
      console.error('Error compressing ID photo:', err);
      setErrorMsg('Failed to process image. Please try a different photo.');
    } finally {
      setIsCompressingPhoto(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSendDeclarationWhatsApp = () => {
    if (!sellerPhone.trim()) {
      setErrorMsg('Please enter Seller Mobile Number first.');
      return;
    }
    if (!model.trim()) {
      setErrorMsg('Please enter Model name first.');
      return;
    }
    if (isPhone && !cleanImei) {
      setErrorMsg('Please enter 15-digit IMEI first.');
      return;
    }
    if (!isPhone && !cleanSerial && !cleanImei) {
      setErrorMsg('Please enter Serial Number first.');
      return;
    }

    const text = formatWhatsAppDeclaration(
      {
        brand,
        model: model.trim(),
        deviceCategory,
        imei: cleanImei || undefined,
        serialNumber: cleanSerial || undefined,
        purchasePrice: parseFloat(purchasePriceStr) || 0,
        purchaseDate: getLocalDateString(),
        sellerName: sellerName.trim() || 'Seller',
        sellerGovtIdType,
        sellerGovtIdNumber: sellerGovtIdNumber.trim(),
      },
      shopName
    );

    const cleanPhone = sellerPhone.replace(/\D/g, '');
    const phoneWithCountry = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
    const encoded = encodeURIComponent(text);
    window.open(`https://wa.me/${phoneWithCountry}?text=${encoded}`, '_blank');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!model.trim()) {
      setErrorMsg('Please enter device model (e.g. iPhone 13, iPad Air, Galaxy Watch)');
      return;
    }

    if (isPhone) {
      if (!is15Digits) {
        setErrorMsg('IMEI must be exactly 15 numeric digits');
        return;
      }

      if (!isLuhnValid) {
        setErrorMsg('IMEI is invalid (Luhn checksum failed). Please verify typing.');
        return;
      }
    } else {
      if (!cleanSerial && !cleanImei) {
        setErrorMsg('Please enter Serial Number (S/N) or IMEI');
        return;
      }
    }

    const purchasePrice = parseFloat(purchasePriceStr);
    if (isNaN(purchasePrice) || purchasePrice < 0) {
      setErrorMsg('Please enter a valid purchase price');
      return;
    }

    if (!sellerName.trim()) {
      setErrorMsg('Please enter Seller Name for legal KYC');
      return;
    }

    const cleanSellerPhone = sellerPhone.replace(/\D/g, '');
    if (cleanSellerPhone.length < 10) {
      setErrorMsg('Please enter a valid 10-digit Seller Mobile Number');
      return;
    }

    const sellingPrice = sellingPriceStr ? parseFloat(sellingPriceStr) : undefined;

    try {
      if (isEditing && deviceToEdit?.id) {
        await updateUsedDevice(deviceToEdit.id, {
          deviceCategory,
          brand,
          model: model.trim(),
          imei: cleanImei || undefined,
          serialNumber: cleanSerial || undefined,
          storage: storage === 'N/A' ? undefined : storage,
          color: color.trim() || undefined,
          accessories,
          purchasePrice,
          sellingPrice,
          sellerName: sellerName.trim(),
          sellerPhone: cleanSellerPhone,
          sellerGovtIdType,
          sellerGovtIdNumber: sellerGovtIdNumber.trim() || undefined,
          sellerIdPhotoUrl,
        });
      } else {
        await addUsedDevice(
          {
            deviceCategory,
            brand,
            model: model.trim(),
            imei: cleanImei || undefined,
            serialNumber: cleanSerial || undefined,
            storage: storage === 'N/A' ? undefined : storage,
            color: color.trim() || undefined,
            accessories,
            purchasePrice,
            sellingPrice,
            purchaseDate: getLocalDateString(),
            sellerName: sellerName.trim(),
            sellerPhone: cleanSellerPhone,
            sellerGovtIdType,
            sellerGovtIdNumber: sellerGovtIdNumber.trim() || undefined,
            sellerIdPhotoUrl,
            status: 'in_stock',
            createdAt: Date.now(),
          },
          createDayBookEntry
        );
      }

      onSaved?.();
      onClose();
    } catch (err) {
      console.error('Error saving used device:', err);
      setErrorMsg('Failed to save device. Please check inputs.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
      <div className="w-full max-w-lg bg-white rounded-t-[24px] sm:rounded-[24px] shadow-2xl max-h-[92vh] flex flex-col overflow-hidden">
        {/* Top Header */}
        <div className="flex items-center justify-between p-4 border-b border-[#E5E5EA]">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
              {deviceCategory === 'laptop' ? (
                <Laptop className="w-5 h-5" />
              ) : deviceCategory === 'tablet' ? (
                <Tablet className="w-5 h-5" />
              ) : deviceCategory === 'smartwatch' ? (
                <Watch className="w-5 h-5" />
              ) : deviceCategory === 'earbuds' ? (
                <Headphones className="w-5 h-5" />
              ) : deviceCategory === 'other' ? (
                <Disc className="w-5 h-5" />
              ) : (
                <Smartphone className="w-5 h-5" />
              )}
            </div>
            <div>
              <h2 className="text-[17px] font-bold text-black tracking-tight leading-tight">
                {isEditing ? 'Edit Pre-Owned Item' : 'Pre-Owned Intake & KYC'}
              </h2>
              <p className="text-xs text-[#8E8E93]">
                {isEditing ? 'Update device or seller details' : 'Used phone & gadget buyback with legal protection'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200 active:scale-95 transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 space-y-4">
          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-[12px] flex items-start space-x-2 text-xs text-red-700">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Section: Device Info */}
          <div className="bg-[#F2F2F7]/50 rounded-[16px] p-3.5 space-y-3 border border-black/[0.04]">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#8E8E93] block">
              Device Specifications
            </span>

            {/* Category Selector */}
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1.5">Device Type</label>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
                {CATEGORIES.map((c) => {
                  const Icon = c.icon;
                  const isSelected = deviceCategory === c.id;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => {
                        setDeviceCategory(c.id);
                        if (!deviceToEdit) {
                          const brandList = BRANDS_BY_CATEGORY[c.id] || ['Other'];
                          setBrand(brandList[0]);
                          if (c.id === 'laptop') setStorage('512GB SSD');
                          else if (c.id === 'smartwatch' || c.id === 'earbuds') setStorage('N/A');
                          else setStorage('128GB');
                        }
                      }}
                      className={`flex flex-col items-center justify-center p-2 rounded-[12px] border transition-all active:scale-95 ${
                        isSelected
                          ? 'bg-purple-600 border-purple-600 text-white shadow-xs font-bold'
                          : 'bg-white border-black/[0.08] text-slate-700 hover:bg-slate-50 font-medium'
                      }`}
                    >
                      <Icon className="w-4 h-4 mb-1" />
                      <span className="text-[11px] leading-tight">{c.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Brand Chips */}
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Brand</label>
              <div className="flex flex-wrap gap-1.5">
                {(BRANDS_BY_CATEGORY[deviceCategory] || BRANDS_BY_CATEGORY.phone).map((b) => (
                  <button
                    key={b}
                    type="button"
                    onClick={() => setBrand(b)}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all active:scale-95 ${
                      brand === b
                        ? 'bg-purple-600 text-white shadow-xs'
                        : 'bg-white text-slate-700 border border-black/[0.06] hover:bg-slate-50'
                    }`}
                  >
                    {b}
                  </button>
                ))}
              </div>
            </div>

            {/* Model Name */}
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Model Name *</label>
              <input
                type="text"
                required
                value={model}
                onChange={(e) => setModel(e.target.value)}
                placeholder={
                  isPhone
                    ? 'e.g. iPhone 13, Galaxy S21 FE, OnePlus 11R'
                    : deviceCategory === 'laptop'
                    ? 'e.g. MacBook Air M2, ThinkPad X1 Carbon'
                    : deviceCategory === 'tablet'
                    ? 'e.g. iPad Air 5th Gen, Galaxy Tab S9'
                    : deviceCategory === 'smartwatch'
                    ? 'e.g. Apple Watch Series 8, Galaxy Watch 6'
                    : deviceCategory === 'earbuds'
                    ? 'e.g. AirPods Pro 2nd Gen, boAt Airdopes 141'
                    : 'e.g. Sony PS5 Controller, Portable Speaker'
                }
                className="w-full bg-white border border-black/[0.08] rounded-[12px] px-3.5 py-2.5 text-black font-semibold text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>

            {/* Identifier: IMEI or Serial Number */}
            {isPhone ? (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-slate-700">15-Digit IMEI *</label>
                  <span className="text-[11px] font-mono text-[#8E8E93]">
                    {cleanImei.length} / 15
                  </span>
                </div>
                <input
                  type="text"
                  required
                  maxLength={15}
                  value={imei}
                  onChange={(e) => setImei(e.target.value.replace(/\D/g, ''))}
                  placeholder="Dial *#06# on phone to get IMEI"
                  className="w-full bg-white border border-black/[0.08] rounded-[12px] px-3.5 py-2.5 font-mono text-black font-bold text-sm tracking-wider focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
                <div className="mt-1.5">
                  {cleanImei.length === 15 ? (
                    isLuhnValid ? (
                      <span className="flex items-center text-[11px] font-semibold text-green-700 gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />
                        Valid IMEI checksum format
                      </span>
                    ) : (
                      <span className="flex items-center text-[11px] font-semibold text-red-600 gap-1">
                        <AlertCircle className="w-3.5 h-3.5 text-red-600" />
                        Invalid IMEI checksum — check digits
                      </span>
                    )
                  ) : null}
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Serial Number (S/N) *
                  </label>
                  <input
                    type="text"
                    required
                    value={serialNumber}
                    onChange={(e) => setSerialNumber(e.target.value)}
                    placeholder="e.g. C02G41ABMD6M or serial on box/device"
                    className="w-full bg-white border border-black/[0.08] rounded-[12px] px-3.5 py-2.5 font-mono text-black font-bold text-sm tracking-wider focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                {deviceCategory === 'tablet' && (
                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">
                      IMEI (Optional for cellular tablets)
                    </label>
                    <input
                      type="text"
                      maxLength={15}
                      value={imei}
                      onChange={(e) => setImei(e.target.value.replace(/\D/g, ''))}
                      placeholder="Optional 15-digit IMEI"
                      className="w-full bg-white border border-black/[0.08] rounded-[12px] px-3.5 py-2 font-mono text-black text-xs focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                )}
              </div>
            )}

            {/* Storage Chips & Color */}
            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  {deviceCategory === 'laptop' ? 'RAM / Storage' : 'Storage'}
                </label>
                <select
                  value={storage}
                  onChange={(e) => setStorage(e.target.value)}
                  className="w-full bg-white border border-black/[0.08] rounded-[12px] px-3 py-2 text-black font-semibold text-xs focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  {STORAGE_OPTIONS.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Color</label>
                <input
                  type="text"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  placeholder="e.g. Midnight, Blue"
                  className="w-full bg-white border border-black/[0.08] rounded-[12px] px-3 py-2 text-black text-xs font-medium focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
            </div>

            {/* Accessories Checkboxes */}
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1.5">
                Accessories Included
              </label>
              <div className="grid grid-cols-2 gap-1.5">
                {['Box', 'Original Charger', 'Store Bill', 'Earphones'].map((acc) => {
                  const checked = accessories.includes(acc);
                  return (
                    <button
                      key={acc}
                      type="button"
                      onClick={() => toggleAccessory(acc)}
                      className={`flex items-center space-x-2 p-2 rounded-[10px] text-xs font-medium border transition-all text-left ${
                        checked
                          ? 'bg-purple-50 border-purple-300 text-purple-900 font-semibold'
                          : 'bg-white border-black/[0.06] text-slate-700'
                      }`}
                    >
                      <div
                        className={`w-4 h-4 rounded-xs border flex items-center justify-center ${
                          checked ? 'bg-purple-600 border-purple-600 text-white' : 'border-slate-300'
                        }`}
                      >
                        {checked && <Check className="w-3 h-3 stroke-[3]" />}
                      </div>
                      <span>{acc}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Section: Financials */}
          <div className="bg-[#F2F2F7]/50 rounded-[16px] p-3.5 space-y-3 border border-black/[0.04]">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#8E8E93] block">
              Pricing & Day Book
            </span>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Purchase Price (₹) *
                </label>
                <input
                  type="number"
                  required
                  min="0"
                  step="100"
                  value={purchasePriceStr}
                  onChange={(e) => setPurchasePriceStr(e.target.value)}
                  placeholder="25000"
                  className="w-full bg-white border border-black/[0.08] rounded-[12px] px-3.5 py-2.5 text-black font-bold text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Resale Price (₹)
                </label>
                <input
                  type="number"
                  min="0"
                  step="100"
                  value={sellingPriceStr}
                  onChange={(e) => setSellingPriceStr(e.target.value)}
                  placeholder="30000"
                  className="w-full bg-white border border-black/[0.08] rounded-[12px] px-3.5 py-2.5 text-black font-bold text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
            </div>

            {!isEditing && (
              <label className="flex items-center space-x-2.5 pt-1 cursor-pointer">
                <input
                  type="checkbox"
                  checked={createDayBookEntry}
                  onChange={(e) => setCreateDayBookEntry(e.target.checked)}
                  className="w-4 h-4 rounded-xs text-purple-600 focus:ring-purple-500"
                />
                <span className="text-xs font-semibold text-slate-800">
                  Record Cash Out in Day Book automatically
                </span>
              </label>
            )}
          </div>

          {/* Section: Seller Legal KYC */}
          <div className="bg-[#F2F2F7]/50 rounded-[16px] p-3.5 space-y-3 border border-black/[0.04]">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#8E8E93]">
                Seller Legal KYC & Verification
              </span>
              <ShieldCheck className="w-4 h-4 text-purple-600" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Seller Name *</label>
                <input
                  type="text"
                  required
                  value={sellerName}
                  onChange={(e) => setSellerName(e.target.value)}
                  placeholder="Customer full name"
                  className="w-full bg-white border border-black/[0.08] rounded-[12px] px-3.5 py-2 text-black text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Seller Mobile *</label>
                <input
                  type="tel"
                  required
                  maxLength={10}
                  value={sellerPhone}
                  onChange={(e) => setSellerPhone(e.target.value.replace(/\D/g, ''))}
                  placeholder="10-digit number"
                  className="w-full bg-white border border-black/[0.08] rounded-[12px] px-3.5 py-2 text-black text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Govt ID Type</label>
                <select
                  value={sellerGovtIdType}
                  onChange={(e) => setSellerGovtIdType(e.target.value)}
                  className="w-full bg-white border border-black/[0.08] rounded-[12px] px-3 py-2 text-black text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  {GOVT_ID_TYPES.map((g) => (
                    <option key={g} value={g}>{g}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Govt ID Number</label>
                <input
                  type="text"
                  value={sellerGovtIdNumber}
                  onChange={(e) => setSellerGovtIdNumber(e.target.value)}
                  placeholder="e.g. XXXX-XXXX-1234"
                  className="w-full bg-white border border-black/[0.08] rounded-[12px] px-3.5 py-2 text-black text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
            </div>

            {/* Govt ID Photo Capture */}
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Seller ID Proof Photo (Aadhaar / DL Snapshot)
              </label>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handlePhotoUpload}
                className="hidden"
              />

              {sellerIdPhotoUrl ? (
                <div className="relative rounded-[14px] overflow-hidden border border-black/[0.08] bg-black/5 aspect-video flex items-center justify-center">
                  <img
                    src={sellerIdPhotoUrl}
                    alt="Seller ID Proof"
                    className="w-full h-full object-contain"
                  />
                  <div className="absolute bottom-2 right-2 flex space-x-2">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="px-2.5 py-1.5 bg-white/90 backdrop-blur-xs text-xs font-semibold rounded-lg shadow-sm text-slate-800 active:scale-95 transition-all"
                    >
                      Change
                    </button>
                    <button
                      type="button"
                      onClick={() => setSellerIdPhotoUrl(undefined)}
                      className="p-1.5 bg-red-600/90 text-white rounded-lg shadow-sm active:scale-95 transition-all"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  disabled={isCompressingPhoto}
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full border-2 border-dashed border-purple-200 hover:border-purple-400 bg-purple-50/40 rounded-[14px] p-4 flex flex-col items-center justify-center space-y-1 text-purple-700 active:scale-99 transition-all"
                >
                  <Camera className="w-6 h-6 text-purple-600 mb-0.5" />
                  <span className="text-xs font-bold">
                    {isCompressingPhoto ? 'Compressing Image...' : 'Take Photo or Upload ID Proof'}
                  </span>
                  <span className="text-[11px] text-[#8E8E93]">
                    Auto-compressed for fast offline storage
                  </span>
                </button>
              )}
            </div>

            {/* 1-Tap WhatsApp Legal Transfer Declaration Button */}
            <div className="pt-1">
              <button
                type="button"
                onClick={handleSendDeclarationWhatsApp}
                className="w-full py-2.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 active:scale-98 text-emerald-800 font-bold text-xs rounded-[12px] flex items-center justify-center space-x-1.5 transition-all"
              >
                <Share2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>1-Tap WhatsApp Transfer Declaration to Seller</span>
              </button>
              <p className="text-[10px] text-[#8E8E93] text-center mt-1">
                Sends seller a legal ownership transfer message for timestamped confirmation.
              </p>
            </div>
          </div>

          {/* Form Actions */}
          <div className="pt-2 pb-6">
            <button
              type="submit"
              className="w-full py-3.5 bg-purple-600 hover:bg-purple-700 active:scale-98 text-white font-bold text-sm rounded-[14px] shadow-lg shadow-purple-600/25 transition-all flex items-center justify-center space-x-2"
            >
              <span>{isEditing ? 'Save Changes' : 'Complete Intake & Add to Stock'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
