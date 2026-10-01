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
  });

  it('should wrap application in BrowserRouter in main.tsx or AppRouter.tsx', () => {
    const mainPath = path.resolve(__dirname, '../src/main.tsx');
    const routerPath = path.resolve(__dirname, '../src/AppRouter.tsx');
    const mainContent = fs.readFileSync(mainPath, 'utf-8');
    const routerContent = fs.existsSync(routerPath) ? fs.readFileSync(routerPath, 'utf-8') : '';
    expect(mainContent + routerContent).toContain('BrowserRouter');
  });
});
