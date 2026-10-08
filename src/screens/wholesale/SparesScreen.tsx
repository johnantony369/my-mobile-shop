import React from 'react';
import { Language } from '../../types';

export interface SparesScreenProps {
  language: Language;
  shopName?: string;
  isReadOnly?: boolean;
  isActivated?: boolean;
}

export const SparesScreen: React.FC<SparesScreenProps> = () => {
  return (
    <div className="p-4 space-y-4">
      <h1 className="text-xl font-bold text-black">Spares Catalog</h1>
      <p className="text-xs text-[#8E8E93]">Pre-loaded smartphone models &amp; spare parts catalog.</p>
    </div>
  );
};
