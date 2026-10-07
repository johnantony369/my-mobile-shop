import React from 'react';
import { ReferralLeadStatus } from '../../types/partner';
import { CRM_STATUS_LABELS } from '../../utils/partner';

export const LeadStatusBadge: React.FC<{ status: ReferralLeadStatus }> = ({ status }) => {
  const conf = CRM_STATUS_LABELS[status] || CRM_STATUS_LABELS.contacted;
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold border ${conf.color}`}
    >
      {conf.label}
    </span>
  );
};
