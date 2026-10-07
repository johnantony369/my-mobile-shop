import { describe, it, expect, vi } from 'vitest';
import { deleteUserAccountAndData } from '../src/firebase/accountDeletion';

describe('Account Deletion Service', () => {
  it('clears cloud user profile and local storage on account deletion', async () => {
    const mockAuthUser = {
      uid: 'user_123',
      delete: vi.fn().mockResolvedValue(undefined),
    };
    const mockDeleteDoc = vi.fn().mockResolvedValue(undefined);
    const mockClearLocal = vi.fn().mockResolvedValue(undefined);

    const result = await deleteUserAccountAndData({
      user: mockAuthUser as any,
      deleteDocFn: mockDeleteDoc,
      clearLocalDbFn: mockClearLocal,
    });

    expect(result.success).toBe(true);
    expect(mockDeleteDoc).toHaveBeenCalled();
    expect(mockAuthUser.delete).toHaveBeenCalled();
    expect(mockClearLocal).toHaveBeenCalled();
  });

  it('handles re-authentication requirement gracefully', async () => {
    const authError = new Error('Requires recent login');
    (authError as any).code = 'auth/requires-recent-login';

    const mockAuthUser = {
      uid: 'user_123',
      delete: vi.fn().mockRejectedValue(authError),
    };
    const mockDeleteDoc = vi.fn().mockResolvedValue(undefined);
    const mockClearLocal = vi.fn().mockResolvedValue(undefined);

    const result = await deleteUserAccountAndData({
      user: mockAuthUser as any,
      deleteDocFn: mockDeleteDoc,
      clearLocalDbFn: mockClearLocal,
    });

    expect(result.success).toBe(false);
    expect(result.requiresRecentLogin).toBe(true);
    expect(mockClearLocal).not.toHaveBeenCalled();
  });
});

import { renderToString } from 'react-dom/server';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { DeleteAccountScreen } from '../src/screens/legal/DeleteAccountScreen';

describe('DeleteAccountScreen UI', () => {
  it('renders web account deletion page with forms and contact information', () => {
    const html = renderToString(
      <MemoryRouter>
        <DeleteAccountScreen />
      </MemoryRouter>
    );

    expect(html).toContain('Delete Account &amp; Associated Data');
    expect(html).toContain('Method 1: Immediate In-App Deletion');
    expect(html).toContain('Method 2: Web Request');
    expect(html).toContain('support@mymobileshop.online');
  });
});

