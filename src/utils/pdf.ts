import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Bill } from '../types';

export interface GenerateBillPDFOptions {
  bill: Bill;
  shopName: string;
  shopAddress?: string;
  shopPhone?: string;
  shopLogo?: string;
}

const formatPDFCurrency = (amount: number): string => {
  return `Rs. ${amount.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

export function generateBillPDF({ bill, shopName, shopAddress, shopPhone, shopLogo }: GenerateBillPDFOptions): jsPDF {
  // A5 format: 148mm x 210mm in portrait
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a5',
  });

  const margin = 12;
  const pageWidth = doc.internal.pageSize.getWidth();
  const contentWidth = pageWidth - margin * 2;
  let cursorY = margin;

  // 1. Header: Shop Name, Phone, Address & Logo
  if (shopLogo && shopLogo.startsWith('data:image')) {
    try {
      doc.addImage(shopLogo, 'JPEG', pageWidth - margin - 18, margin, 18, 18);
    } catch {
      // Graceful fallback if image cannot be decoded
    }
  }

  const name = shopName.trim() || 'My Mobile Shop';
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(30, 41, 59); // Slate-800
  doc.text(name, margin, cursorY + 4);
  cursorY += 7;

  if (shopPhone && shopPhone.trim()) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(71, 85, 105);
    doc.text(`WhatsApp / Tel: +91 ${shopPhone.trim()}`, margin, cursorY + 2);
    cursorY += 4.5;
  }

  if (shopAddress && shopAddress.trim()) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(100, 116, 139); // Slate-500
    const textWidth = shopLogo ? contentWidth - 22 : contentWidth;
    const addressLines = doc.splitTextToSize(shopAddress.trim(), textWidth);
    doc.text(addressLines, margin, cursorY + 2);
    cursorY += addressLines.length * 4 + 2;
  } else {
    cursorY += 2;
  }

  if (bill.isGst && bill.shopGstin) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(30, 41, 59);
    doc.text(`GSTIN: ${bill.shopGstin.trim().toUpperCase()}`, margin, cursorY + 2);
    cursorY += 4.5;
  }

  // Divider line
  doc.setDrawColor(226, 232, 240); // Slate-200
  doc.setLineWidth(0.4);
  doc.line(margin, cursorY, margin + contentWidth, cursorY);
  cursorY += 5;

  // 2. Invoice Meta Row (Invoice #, Date, Customer info)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42); // Slate-900
  const invoiceLabel = bill.isGst ? `TAX INVOICE: ${bill.invoiceNo}` : `INVOICE: ${bill.invoiceNo}`;
  doc.text(invoiceLabel, margin, cursorY + 1);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105); // Slate-600
  const dateStr = `Date: ${bill.date}`;
  doc.text(dateStr, pageWidth - margin, cursorY + 1, { align: 'right' });
  cursorY += 6;

  if (bill.customerName || bill.customerPhone || (bill.isGst && bill.customerGstin)) {
    const custParts = [
      bill.customerName ? `Customer: ${bill.customerName}` : '',
      bill.customerPhone ? `Ph: ${bill.customerPhone}` : '',
      bill.isGst && bill.customerGstin ? `GSTIN: ${bill.customerGstin.toUpperCase()}` : '',
    ].filter(Boolean);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(71, 85, 105);
    doc.text(custParts.join(' | '), margin, cursorY);
    cursorY += 5;
  }

  // 3. Items Table using autoTable
  const tableData = bill.items.map((it, idx) => [
    String(idx + 1),
    it.name,
    String(it.qty),
    formatPDFCurrency(it.price),
    formatPDFCurrency(it.qty * it.price),
  ]);

  autoTable(doc, {
    startY: cursorY + 1,
    margin: { left: margin, right: margin },
    head: [['#', 'Item / Description', 'Qty', 'Rate', 'Amount']],
    body: tableData,
    theme: 'plain',
    headStyles: {
      fillColor: [241, 245, 249], // Slate-100
      textColor: [51, 65, 85], // Slate-700
      fontSize: 8,
      fontStyle: 'bold',
      halign: 'left',
    },
    bodyStyles: {
      fontSize: 8,
      textColor: [30, 41, 59],
    },
    columnStyles: {
      0: { cellWidth: 8, halign: 'center' },
      1: { cellWidth: 'auto', halign: 'left' },
      2: { cellWidth: 12, halign: 'center' },
      3: { cellWidth: 26, halign: 'right' },
      4: { cellWidth: 28, halign: 'right' },
    },
    styles: {
      lineColor: [226, 232, 240],
      lineWidth: 0.2,
      cellPadding: 2.2,
    },
  });

  const finalY = (doc as any).lastAutoTable ? (doc as any).lastAutoTable.finalY + 5 : cursorY + 30;
  cursorY = finalY;

  // 4. Totals & Payment Summary (Right aligned totals block)
  const totalsX = pageWidth - margin;
  const labelX = totalsX - 34;

  doc.setFontSize(8.5);

  if (bill.discount > 0) {
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text('Subtotal:', labelX, cursorY, { align: 'right' });
    doc.setTextColor(30, 41, 59);
    doc.text(formatPDFCurrency(bill.subtotal), totalsX, cursorY, { align: 'right' });
    cursorY += 4.5;

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(220, 38, 38); // Red
    doc.text('Discount:', labelX, cursorY, { align: 'right' });
    doc.text(`-${formatPDFCurrency(bill.discount)}`, totalsX, cursorY, { align: 'right' });
    cursorY += 4.5;
  }

  if (bill.isGst) {
    const rate = bill.gstRate ?? 18;
    const halfRate = rate / 2;

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text('Taxable Value:', labelX, cursorY, { align: 'right' });
    doc.setTextColor(30, 41, 59);
    doc.text(formatPDFCurrency(bill.taxableAmount ?? bill.total), totalsX, cursorY, { align: 'right' });
    cursorY += 4.5;

    doc.setTextColor(100, 116, 139);
    doc.text(`CGST (${halfRate}%):`, labelX, cursorY, { align: 'right' });
    doc.setTextColor(30, 41, 59);
    doc.text(formatPDFCurrency(bill.cgstAmount ?? 0), totalsX, cursorY, { align: 'right' });
    cursorY += 4.5;

    doc.setTextColor(100, 116, 139);
    doc.text(`SGST (${halfRate}%):`, labelX, cursorY, { align: 'right' });
    doc.setTextColor(30, 41, 59);
    doc.text(formatPDFCurrency(bill.sgstAmount ?? 0), totalsX, cursorY, { align: 'right' });
    cursorY += 4.5;
  }

  // Grand Total highlight box
  doc.setFillColor(248, 250, 252); // Slate-50
  doc.setDrawColor(203, 213, 225); // Slate-300
  doc.setLineWidth(0.3);
  const totalBoxWidth = 56;
  const totalBoxX = pageWidth - margin - totalBoxWidth;
  doc.roundedRect(totalBoxX, cursorY - 1, totalBoxWidth, 9, 1.5, 1.5, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);
  doc.text('Total:', totalBoxX + 3, cursorY + 5);
  doc.text(formatPDFCurrency(bill.total), totalsX - 3, cursorY + 5, { align: 'right' });

  // Payment Status (Left of Totals or below)
  cursorY += 14;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  const paymentBadge = `Payment Mode: ${bill.paymentMethod.toUpperCase()}`;
  doc.text(paymentBadge, margin, cursorY);

  // 5. Footer
  cursorY += 12;
  doc.setDrawColor(241, 245, 249);
  doc.line(margin, cursorY, margin + contentWidth, cursorY);
  cursorY += 4;

  doc.setFont('helvetica', 'italic');
  doc.setFontSize(7.5);
  doc.setTextColor(148, 163, 184); // Slate-400
  doc.text('Thank you for your business! Visit again.', pageWidth / 2, cursorY, { align: 'center' });

  return doc;
}

export function downloadBillPDF(options: GenerateBillPDFOptions): void {
  const doc = generateBillPDF(options);
  const filename = `${options.bill.invoiceNo || 'Bill'}.pdf`;
  if (typeof doc.save === 'function') {
    doc.save(filename);
  }
}

export function getBillPDFBlob(options: GenerateBillPDFOptions): Blob {
  const doc = generateBillPDF(options);
  return doc.output('blob');
}

export async function shareBillPDF(options: GenerateBillPDFOptions): Promise<boolean> {
  const doc = generateBillPDF(options);
  const invoiceTitle = options.bill.invoiceNo || 'Bill';
  const filename = `${invoiceTitle}.pdf`;
  const blob = doc.output('blob');

  // Check Web Share API Level 2 (files support)
  const file = new File([blob], filename, { type: 'application/pdf' });
  if (typeof navigator !== 'undefined' && navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({
        title: `${options.shopName || 'Shop'} - ${invoiceTitle}`,
        text: `Invoice ${invoiceTitle} from ${options.shopName || 'Shop'}`,
        files: [file],
      });
      return true;
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') {
        return false;
      }
    }
  }

  // Fallback if file sharing not supported or failed: download the PDF directly
  if (typeof doc.save === 'function') {
    doc.save(filename);
  }
  return true;
}
