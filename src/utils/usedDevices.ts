import { UsedDevice } from '../types';
import { formatINR } from '../i18n';

/**
 * Validates a 15-digit IMEI number using the Luhn checksum algorithm.
 */
export function isValidIMEI(imei: string): boolean {
  if (!imei || typeof imei !== 'string') return false;
  const clean = imei.trim();
  if (!/^\d{15}$/.test(clean)) return false;

  let sum = 0;
  for (let i = 0; i < 15; i++) {
    let digit = parseInt(clean.charAt(i), 10);
    // In IMEI (1-indexed 1..15), even positions (index 1, 3, 5, 7, 9, 11, 13) are doubled
    if (i % 2 === 1) {
      digit *= 2;
      if (digit > 9) {
        digit -= 9;
      }
    }
    sum += digit;
  }

  return sum % 10 === 0;
}

export interface EMICalculationResult {
  loanAmount: number;
  monthlyEMI: number;
  totalInterest: number;
  totalPayable: number;
}

/**
 * Calculates standard reducing-balance monthly EMI and loan breakdown.
 */
export function calculateEMI(
  price: number,
  downPayment: number,
  tenureMonths: number,
  annualInterestRate: number
): EMICalculationResult {
  const loanAmount = Math.max(0, price - (downPayment || 0));

  if (loanAmount <= 0 || tenureMonths <= 0) {
    return {
      loanAmount: 0,
      monthlyEMI: 0,
      totalInterest: 0,
      totalPayable: downPayment || 0,
    };
  }

  if (annualInterestRate <= 0) {
    const monthlyEMI = Math.round(loanAmount / tenureMonths);
    return {
      loanAmount,
      monthlyEMI,
      totalInterest: 0,
      totalPayable: (downPayment || 0) + loanAmount,
    };
  }

  const monthlyRate = (annualInterestRate / 12) / 100;
  const factor = Math.pow(1 + monthlyRate, tenureMonths);
  const monthlyEMI = Math.round((loanAmount * monthlyRate * factor) / (factor - 1));
  const totalInterest = Math.max(0, Math.round(monthlyEMI * tenureMonths - loanAmount));
  const totalPayable = (downPayment || 0) + (monthlyEMI * tenureMonths);

  return {
    loanAmount,
    monthlyEMI,
    totalInterest,
    totalPayable,
  };
}

export function getDeviceCategoryLabel(category?: string): string {
  switch (category) {
    case 'laptop': return 'Laptop';
    case 'tablet': return 'Tablet';
    case 'smartwatch': return 'Watch';
    case 'earbuds': return 'Audio';
    case 'other': return 'Gadget';
    case 'phone':
    default:
      return 'Phone';
  }
}

/**
 * Generates a legally protective seller ownership transfer declaration for WhatsApp.
 */
export function formatWhatsAppDeclaration(
  device: {
    brand: string;
    model: string;
    deviceCategory?: string;
    imei?: string;
    serialNumber?: string;
    purchasePrice: number;
    purchaseDate: string;
    sellerName: string;
    sellerGovtIdType?: string;
    sellerGovtIdNumber?: string;
  },
  shopName: string
): string {
  const idStr = device.sellerGovtIdType && device.sellerGovtIdNumber
    ? ` (${device.sellerGovtIdType}: ${device.sellerGovtIdNumber})`
    : '';

  const idText = device.imei
    ? `• IMEI: ${device.imei}\n`
    : device.serialNumber
    ? `• Serial No: ${device.serialNumber}\n`
    : '';

  return (
    `*DEVICE SALE & OWNERSHIP TRANSFER DECLARATION*\n\n` +
    `I, *${device.sellerName}*${idStr}, declare that I am the sole and lawful owner of the following device:\n\n` +
    `• Device: ${device.brand} ${device.model}\n` +
    idText +
    `• Agreed Sale Amount: ${formatINR(device.purchasePrice)}\n` +
    `• Date of Sale: ${device.purchaseDate}\n\n` +
    `I confirm that I have sold this device to *${shopName}* in sound working condition. I hereby declare that this device is not stolen, not lost, and is free of any police report, loan default, or finance lock.\n\n` +
    `_Please reply "CONFIRMED" or "YES" to acknowledge this transfer._`
  );
}

/**
 * Formats active in-stock used phones and gadgets into a clean WhatsApp broadcast catalog.
 */
export function formatWhatsAppStockCatalog(
  devices: UsedDevice[],
  shopName: string,
  shopPhone?: string,
  shopAddress?: string
): string {
  const inStock = devices.filter((d) => d.status === 'in_stock' && !d.deletedAt && d.syncStatus !== 'deleted');

  let text = `*PRE-OWNED STOCK — ${shopName}*\n`;
  text += `Tested & 100% Genuine with Store Warranty\n\n`;

  if (inStock.length === 0) {
    text += `Currently all pre-owned stock is sold out. New stock arriving soon!\n\n`;
  } else {
    inStock.forEach((device, index) => {
      text += `${index + 1}. *${device.brand} ${device.model}*\n`;
      const specs = [];
      if (device.storage) specs.push(device.storage);
      if (device.color) specs.push(device.color);
      if (specs.length > 0) text += `   • ${specs.join(' | ')}\n`;
      if (device.accessories && device.accessories.length > 0) {
        text += `   • With: ${device.accessories.join(', ')}\n`;
      }
      text += `   • Price: *${formatINR(device.sellingPrice || device.purchasePrice)}*\n\n`;
    });
  }

  text += `Visit our shop to test before you buy.\n`;
  if (shopAddress) text += `Address: ${shopAddress}\n`;
  if (shopPhone) text += `Call/WhatsApp: ${shopPhone}\n`;

  return text.trim();
}

/**
 * Formats a quick WhatsApp spec card for a single used device inquiry.
 */
export function formatWhatsAppDeviceQuotation(
  device: UsedDevice,
  shopName: string,
  shopPhone?: string
): string {
  let text = `*${device.brand} ${device.model}* — Available at *${shopName}*\n\n`;
  if (device.storage) text += `Storage: ${device.storage}\n`;
  if (device.color) text += `Color: ${device.color}\n`;
  if (device.accessories && device.accessories.length > 0) {
    text += `Includes: ${device.accessories.join(', ')}\n`;
  }
  text += `Price: *${formatINR(device.sellingPrice || device.purchasePrice)}*\n\n`;
  text += `Fully verified & tested with testing warranty.\n`;
  if (shopPhone) text += `Call/WhatsApp: ${shopPhone}`;

  return text.trim();
}

/**
 * Formats an EMI quotation breakdown for WhatsApp sharing.
 */
export function formatWhatsAppEMIQuote(
  calc: { price: number; downPayment: number; tenureMonths: number; monthlyEMI: number },
  shopName: string
): string {
  return (
    `*PHONE FINANCING / EMI QUOTATION*\n` +
    `Store: *${shopName}*\n\n` +
    `• Device Price: ${formatINR(calc.price)}\n` +
    `• Down Payment: ${formatINR(calc.downPayment)}\n` +
    `• Loan Tenure: ${calc.tenureMonths} months\n` +
    `• Estimated EMI: *${formatINR(calc.monthlyEMI)} / month*\n\n` +
    `_Finance approval subject to ID & documentation._`
  );
}
