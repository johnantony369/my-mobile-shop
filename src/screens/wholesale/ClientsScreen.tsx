import React from 'react';
import { Language } from '../../types';

export interface ClientsScreenProps {
  language: Language;
  shopName?: string;
  shopPhone?: string;
  isReadOnly?: boolean;
  isActivated?: boolean;
}

export const ClientsScreen: React.FC<ClientsScreenProps> = () => {
  return (
    <div className="p-4 space-y-4">
      <h1 className="text-xl font-bold text-black">Clients &amp; Credit</h1>
      <p className="text-xs text-[#8E8E93]">Manage retail repair shop clients and credit ledgers.</p>
    </div>
  );
};
