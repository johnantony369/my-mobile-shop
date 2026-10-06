import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Bill } from '../types';

export interface GenerateBillPDFOptions {
  bill: Bill;
  shopName: string;
  shopAddress?: string;
}

const formatPDFCurrency = (amount: number): string => {
  return `Rs. ${amount.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

export function generateBillPDF({ bill, shopName, shopAddress }: GenerateBillPDFOptions): jsPDF {
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

  // 1. Header: Shop Name & Address
  const name = shopName.trim() || 'My Mobile Shop';
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(30, 41, 59); // Slate-800
  doc.text(name, margin, cursorY + 4);
  cursorY += 7;

  if (shopAddress && shopAddress.trim()) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(100, 116, 139); // Slate-500
    const addressLines = doc.splitTextToSize(shopAddress.trim(), contentWidth);
    doc.text(addressLines, margin, cursorY + 3);
    cursorY += addressLines.length * 4 + 2;
  } else {
    cursorY += 2;
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
  doc.text(`INVOICE: ${bill.invoiceNo}`, margin, cursorY + 1);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105); // Slate-600
  const dateStr = `Date: ${bill.date}`;
  doc.text(dateStr, pageWidth - margin, cursorY + 1, { align: 'right' });
  cursorY += 6;

  if (bill.customerName || bill.customerPhone) {
    const custParts = [
      bill.customerName ? `Customer: ${bill.customerName}` : '',
      bill.customerPhone ? `Ph: ${bill.customerPhone}` : '',
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
  const labelX = totalsX - 32;

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
