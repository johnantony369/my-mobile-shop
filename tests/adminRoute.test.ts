import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

describe('Admin Route and Protection Configuration', () => {
  it('should declare route for /admin in AppRouter.tsx', () => {
    const routerPath = path.resolve(__dirname, '../src/AppRouter.tsx');
    expect(fs.existsSync(routerPath)).toBe(true);
    const content = fs.readFileSync(routerPath, 'utf-8');

    expect(content).toContain('path="/admin"');
    expect(content).toContain('AdminRouteWrapper');
  });

  it('should protect /admin with isSuperAdmin check and redirect unauthorized users', () => {
    const routerPath = path.resolve(__dirname, '../src/AppRouter.tsx');
    const content = fs.readFileSync(routerPath, 'utf-8');

    expect(content).toContain('isSuperAdmin');
    // Unauthenticated redirected to /login, unauthorized redirected to /app
    expect(content).toContain('<Navigate to="/login" replace />');
    expect(content).toContain('<Navigate to="/app" replace />');
  });

  it('should have dedicated full-page AdminScreen component', () => {
    const screenPath = path.resolve(__dirname, '../src/screens/AdminScreen.tsx');
    expect(fs.existsSync(screenPath)).toBe(true);
    const content = fs.readFileSync(screenPath, 'utf-8');

    // Should include back navigation to /app
    expect(content).toContain('navigate');
    expect(content).toContain('/app');
    expect(content).toContain('Superadmin');
  });

  it('SettingsScreen should navigate to /admin instead of opening modal', () => {
    const settingsPath = path.resolve(__dirname, '../src/screens/SettingsScreen.tsx');
    const content = fs.readFileSync(settingsPath, 'utf-8');

    expect(content).toContain("navigate('/admin')");
    expect(content).not.toContain('<AdminDashboardModal');
  });
});
