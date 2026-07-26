import { describe, it, expect } from 'vitest';
import { safeJsonParse } from '../src/lib/db';
import { seoPageService } from '../src/lib/seoData';

describe('Unit Tests - Utility Helpers & Safe Parsers', () => {
  it('safeJsonParse returns fallback when input is invalid, empty, or non-string', () => {
    expect(safeJsonParse(null, 'default')).toBe('default');
    expect(safeJsonParse('', 123)).toBe(123);
    expect(safeJsonParse('   ', { empty: true })).toEqual({ empty: true });
    expect(safeJsonParse('{invalid_json', 'fallback')).toBe('fallback');
  });

  it('safeJsonParse correctly parses valid JSON objects and arrays', () => {
    expect(safeJsonParse('{"status":"ok"}', {})).toEqual({ status: 'ok' });
    expect(safeJsonParse('[1,2,3]', [])).toEqual([1, 2, 3]);
  });

  it('SEO Page Service returns pages and handles lookup by slug', () => {
    const allPages = seoPageService.getAll();
    expect(Array.isArray(allPages)).toBe(true);
    expect(allPages.length).toBeGreaterThanOrEqual(15);

    const pgPage = seoPageService.getBySlug('pg-for-rent');
    expect(pgPage).toBeDefined();
    expect(pgPage?.title).toContain('PG');
    expect(pgPage?.faqContent?.length).toBeGreaterThanOrEqual(2);

    const competitorPage = seoPageService.getBySlug('alternatives/nobroker');
    expect(competitorPage).toBeDefined();
    expect(competitorPage?.pageType).toBe('comparison');
  });
});
