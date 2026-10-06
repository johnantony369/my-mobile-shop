import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

describe('App Router Structure', () => {
  it('should define routes for /, /login, /onboarding, and /app in AppRouter.tsx', () => {
    const routerPath = path.resolve(__dirname, '../src/AppRouter.tsx');
    expect(fs.existsSync(routerPath)).toBe(true);
    const content = fs.readFileSync(routerPath, 'utf-8');

    expect(content).toContain('path="/"');
    expect(content).toContain('path="/login"');
    expect(content).toContain('path="/onboarding"');
    expect(content).toContain('path="/app"');
    expect(content).toContain('path="/track/:trackingId"');
  });

  it('should wrap application in BrowserRouter in main.tsx or AppRouter.tsx', () => {
    const mainPath = path.resolve(__dirname, '../src/main.tsx');
    const routerPath = path.resolve(__dirname, '../src/AppRouter.tsx');
    const mainContent = fs.readFileSync(mainPath, 'utf-8');
    const routerContent = fs.existsSync(routerPath) ? fs.readFileSync(routerPath, 'utf-8') : '';
    expect(mainContent + routerContent).toContain('BrowserRouter');
  });

  it('pulls cloud changes to restore existing accounts before deciding route', () => {
    const routerPath = path.resolve(__dirname, '../src/AppRouter.tsx');
    const content = fs.readFileSync(routerPath, 'utf-8');
    expect(content).toContain('pullCloudChanges');
    expect(content).toContain('checkedCloudUid');
  });

  it('LoginScreen pulls cloud changes on authentication before routing', () => {
    const loginPath = path.resolve(__dirname, '../src/screens/LoginScreen.tsx');
    const content = fs.readFileSync(loginPath, 'utf-8');
    expect(content).toContain('pullCloudChanges');
    expect(content).toContain('await pullCloudChanges(u.uid)');
  });
});
