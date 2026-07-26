/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect } from 'vitest';
import { escapeHtml, validateSmtpConfig } from '../server/email';

describe('Phase 2 Email Service & Security Unit Tests', () => {
  it('escapeHtml escapes dangerous HTML characters to prevent XSS injection', () => {
    const maliciousInput = '<script>alert("xss")</script> & "quotes" \'single\'';
    const escaped = escapeHtml(maliciousInput);
    expect(escaped).toBe('&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt; &amp; &quot;quotes&quot; &#039;single&#039;');
  });

  it('escapeHtml returns empty string for null or empty input', () => {
    expect(escapeHtml('')).toBe('');
    expect(escapeHtml(null as any)).toBe('');
  });

  it('validateSmtpConfig identifies unconfigured SMTP credentials correctly', () => {
    const config = validateSmtpConfig();
    expect(typeof config.isConfigured).toBe('boolean');
    expect(typeof config.details).toBe('string');
  });
});
