import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { ClientsScreen } from '../src/screens/wholesale/ClientsScreen';
import { AddEditClientModal } from '../src/components/wholesale/AddEditClientModal';
import { RecordPaymentModal } from '../src/components/wholesale/RecordPaymentModal';
import { AddCreditSaleModal } from '../src/components/wholesale/AddCreditSaleModal';
import { ClientLedgerDrawer } from '../src/components/wholesale/ClientLedgerDrawer';
import { WholesaleClient } from '../src/types/wholesale';

describe('ClientsScreen UI & Modals', () => {
  const dummyClient: WholesaleClient = {
    cloudId: 'client-1',
    shopName: 'Galaxy Repair Center',
    contactPerson: 'Rahul Verma',
    phone: '9876543210',
    address: 'Shop 12, Ghaffar Market',
    creditLimit: 50000,
    currentCreditBalance: 12500,
    createdAt: Date.now(),
  };

  it('renders credit metrics, neutral search, and action buttons', () => {
    const html = renderToString(<ClientsScreen language="en" shopName="Test Spares" />);
    expect(html).toContain('Total Credit Due');
    expect(html).toContain('Active Clients');
    expect(html).toContain('Search client shop, technician, or phone...');
    expect(html).toContain('+ Add Client');
    expect(html.toLowerCase()).not.toContain('udhar');
    expect(html.toLowerCase()).not.toContain('khata');
  });

  it('renders AddEditClientModal with strict neutral placeholders', () => {
    const html = renderToString(
      <AddEditClientModal
        isOpen={true}
        onClose={() => {}}
        onSave={async () => {}}
      />
    );
    expect(html).toContain('placeholder="Enter client shop name"');
    expect(html).toContain('placeholder="Enter technician name"');
    expect(html).toContain('placeholder="Enter 10-digit mobile number"');
    expect(html).toContain('placeholder="Enter market area or address"');
    expect(html).toContain('placeholder="Enter credit limit (optional)"');
    expect(html.toLowerCase()).not.toContain('udhar');
    expect(html.toLowerCase()).not.toContain('khata');
  });

  it('renders RecordPaymentModal with neutral placeholders', () => {
    const html = renderToString(
      <RecordPaymentModal
        isOpen={true}
        client={dummyClient}
        onClose={() => {}}
        onSave={async () => {}}
      />
    );
    expect(html).toContain('Record Payment Received');
    expect(html).toContain('placeholder="Enter payment amount"');
    expect(html).toContain('placeholder="Enter payment reference / note (optional)"');
    expect(html.toLowerCase()).not.toContain('udhar');
    expect(html.toLowerCase()).not.toContain('khata');
  });

  it('renders AddCreditSaleModal with neutral placeholders', () => {
    const html = renderToString(
      <AddCreditSaleModal
        isOpen={true}
        client={dummyClient}
        onClose={() => {}}
        onSave={async () => {}}
      />
    );
    expect(html).toContain('Add Credit Sale');
    expect(html).toContain('placeholder="Enter credit sale amount"');
    expect(html).toContain('placeholder="Enter bill description / parts taken"');
    expect(html.toLowerCase()).not.toContain('udhar');
    expect(html.toLowerCase()).not.toContain('khata');
  });

  it('renders ClientLedgerDrawer with credit balance and action buttons', () => {
    const html = renderToString(
      <ClientLedgerDrawer
        isOpen={true}
        client={dummyClient}
        shopName="Metro Spares"
        onClose={() => {}}
        onClientUpdated={() => {}}
      />
    );
    expect(html).toContain('Galaxy Repair Center');
    expect(html).toContain('Credit Due');
    expect(html).toContain('Credit Sale');
    expect(html).toContain('Payment');
    expect(html).toContain('Statement');
    expect(html.toLowerCase()).not.toContain('udhar');
    expect(html.toLowerCase()).not.toContain('khata');
  });
});
