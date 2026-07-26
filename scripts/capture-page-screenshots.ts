import { chromium } from 'playwright';
import path from 'path';

async function captureScreenshots() {
  console.log('[Playwright Visual QA] Launching Chromium browser...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();

  const outputDir = 'C:\\Users\\Ankit\\.gemini\\antigravity-ide\\brain\\730f0708-d63e-447e-8de4-30e902bc2bf9';

  const routes = [
    { url: 'http://localhost:3000/', filename: 'page_homepage.png' },
    { url: 'http://localhost:3000/properties', filename: 'page_properties.png' },
    { url: 'http://localhost:3000/dashboard', filename: 'page_dashboard.png' },
    { url: 'http://localhost:3000/alternatives/nobroker', filename: 'page_competitor.png' },
  ];

  for (const r of routes) {
    try {
      console.log(`[Playwright Visual QA] Navigating to ${r.url}...`);
      await page.goto(r.url, { waitUntil: 'networkidle', timeout: 10000 });
      const fullPath = path.join(outputDir, r.filename);
      await page.screenshot({ path: fullPath, fullPage: false });
      console.log(`[Playwright Visual QA] Captured ${r.filename}`);
    } catch (err: any) {
      console.warn(`[Playwright Warning] Error capturing ${r.url}:`, err.message);
    }
  }

  await browser.close();
  console.log('[Playwright Visual QA] Complete!');
}

captureScreenshots().catch(console.error);
