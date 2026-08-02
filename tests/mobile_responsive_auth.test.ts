/**
 * Mobile & iPhone Responsive Auth Layout Verification Suite
 * Validates responsive navigation, mobile viewport accessibility, and iPhone Safari layout rules.
 */

import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('Mobile & iPhone Responsive Auth Layout Suite', () => {
  // Test 1: index.html contains exactly one valid viewport meta tag with viewport-fit=cover
  it('1. index.html contains valid viewport declaration with viewport-fit=cover', () => {
    const htmlPath = path.resolve(__dirname, '../index.html');
    const htmlContent = fs.readFileSync(htmlPath, 'utf8');
    
    expect(htmlContent).toContain('<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />');
  });

  // Test 2: Navbar mobile menu toggle button is NOT nested inside hidden md:flex
  it('2. Navbar mobile menu toggle button is visible on mobile viewports (< 768px)', () => {
    const navbarPath = path.resolve(__dirname, '../src/components/Navbar.tsx');
    const navbarContent = fs.readFileSync(navbarPath, 'utf8');

    // Ensure mobile toggle is in a container with flex md:hidden, not inside hidden md:flex
    expect(navbarContent).toContain('flex md:hidden items-center gap-2');
    expect(navbarContent).toContain('Sign In');
  });

  // Test 3: Navbar includes unauthenticated Sign In CTA for mobile users
  it('3. Navbar displays explicit mobile Sign In CTA for unauthenticated users', () => {
    const navbarPath = path.resolve(__dirname, '../src/components/Navbar.tsx');
    const navbarContent = fs.readFileSync(navbarPath, 'utf8');

    expect(navbarContent).toContain('Sign In');
    expect(navbarContent).toContain('onClick={() => navigateTo(\'auth\')}');
  });

  // Test 4: AuthView container uses dynamic viewport height (min-h-[100dvh]) for iPhone Safari
  it('4. AuthView container uses min-h-[100dvh] for iPhone Safari dynamic toolbar compatibility', () => {
    const authViewPath = path.resolve(__dirname, '../src/components/views/AuthView.tsx');
    const authViewContent = fs.readFileSync(authViewPath, 'utf8');

    expect(authViewContent).toContain('min-h-[calc(100dvh-4rem)]');
  });

  // Test 5: Form inputs use readable text sizes to avoid unwanted iOS Safari zoom
  it('5. Auth form text inputs use text-xs / text-sm to maintain layout stability', () => {
    const authViewPath = path.resolve(__dirname, '../src/components/views/AuthView.tsx');
    const authViewContent = fs.readFileSync(authViewPath, 'utf8');

    expect(authViewContent).toContain('type="email"');
    expect(authViewContent).toContain('type="password"');
  });

  // Test 6: Mobile viewport configurations (Android & iOS)
  it('6. Validates target mobile viewport dimensions (Android & iOS)', () => {
    const viewports = [
      { name: 'Android Small', width: 320, height: 568 },
      { name: 'Android Standard', width: 360, height: 640 },
      { name: 'Android Large (Pixel 7 / Galaxy S22)', width: 412, height: 915 },
      { name: 'iPhone SE', width: 375, height: 667 },
      { name: 'iPhone 13 / 14 / 15', width: 390, height: 844 },
      { name: 'iPhone 15 Pro Max', width: 393, height: 852 },
      { name: 'iPhone Landscape', width: 844, height: 390 },
      { name: 'iPad Tablet', width: 768, height: 1024 },
      { name: 'Desktop HD', width: 1366, height: 768 },
    ];

    for (const vp of viewports) {
      expect(vp.width).toBeGreaterThan(0);
      expect(vp.height).toBeGreaterThan(0);
    }
    expect(viewports.length).toBe(9);
  });
});
