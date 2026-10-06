import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { SUPERADMIN_EMAIL } from '../src/utils/admin';

describe('Firestore Security Rules File', () => {
  const rulesPath = path.resolve(__dirname, '../firestore.rules');
  const rulesContent = fs.readFileSync(rulesPath, 'utf-8');

  it('exists and uses rules_version 2', () => {
    expect(fs.existsSync(rulesPath)).toBe(true);
    expect(rulesContent).toContain("rules_version = '2'");
  });

  it('defines isSuperAdmin checking request.auth.token.email against SUPERADMIN_EMAIL', () => {
    expect(rulesContent).toContain(`request.auth.token.email == '${SUPERADMIN_EMAIL}'`);
  });

  it('allows owner or superadmin access to /users/{userId}/{document=**}', () => {
    expect(rulesContent).toMatch(/match \/users\/\{userId\}\/\{document=\*\*\}\s*\{[\s\S]*?allow read, write: if[\s\S]*?request\.auth\.uid == userId[\s\S]*?isSuperAdmin\(\)/);
  });

  it('allows owner or superadmin access to /accounts/{userId} enabling collection list and updates', () => {
    expect(rulesContent).toMatch(/match \/accounts\/\{userId\}\s*\{[\s\S]*?allow read, write: if[\s\S]*?request\.auth\.uid == userId[\s\S]*?isSuperAdmin\(\)/);
  });

  it('allows public read and authenticated write to /public_repairs/{trackingId}', () => {
    expect(rulesContent).toMatch(/match \/public_repairs\/\{trackingId\}\s*\{[\s\S]*?allow read: if true;[\s\S]*?allow write: if request\.auth != null/);
  });
});
