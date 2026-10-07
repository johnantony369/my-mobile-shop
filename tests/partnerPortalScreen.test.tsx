import { describe, it, expect } from 'vitest';
import { CRM_STATUS_LABELS } from '../src/utils/partner';

describe('Partner Portal UI Specifications', () => {
  it('has all 6 CRM statuses with friendly labels', () => {
    expect(CRM_STATUS_LABELS.contacted.label).toBe('Contacted');
    expect(CRM_STATUS_LABELS.in_trial.label).toBe('In Trial (7d)');
    expect(CRM_STATUS_LABELS.not_interested.label).toBe('Not Interested');
    expect(CRM_STATUS_LABELS.plan_purchased.label).toBe('Plan Purchased');
    expect(CRM_STATUS_LABELS.payout_in_progress.label).toBe('Payout in Progress');
    expect(CRM_STATUS_LABELS.paid.label).toBe('Paid');
  });
});
