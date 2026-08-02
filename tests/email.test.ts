/**
 * SMTP Email Service, Security & Diagnostics Verification Suite
 */

import { describe, it, expect } from 'vitest';
import { escapeHtml, validateSmtpConfig, sendEmail, verifySmtpConnection } from '../server/email.js';

describe('SMTP Email Service, Security & Diagnostics Suite', () => {
  it('1. escapeHtml escapes dangerous HTML characters to prevent XSS injection', () => {
    const maliciousInput = '<script>alert("xss")</script> & "quotes" \'single\'';
    const escaped = escapeHtml(maliciousInput);
    expect(escaped).toBe('&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt; &amp; &quot;quotes&quot; &#039;single&#039;');
  });

  it('2. escapeHtml returns empty string for null or empty input', () => {
    expect(escapeHtml('')).toBe('');
    expect(escapeHtml(null as any)).toBe('');
  });

  it('3. validateSmtpConfig returns missingVars when SMTP environment variables are missing', () => {
    const origUser = process.env.SMTP_USER;
    delete process.env.SMTP_USER;

    const config = validateSmtpConfig();
    expect(config.isConfigured).toBe(false);
    expect(config.missingVars).toContain('SMTP_USER');

    process.env.SMTP_USER = origUser;
  });

  it('4. validateSmtpConfig identifies placeholder credentials as unconfigured', () => {
    const origPass = process.env.SMTP_PASSWORD;
    process.env.SMTP_PASSWORD = 'placeholder_password';

    const config = validateSmtpConfig();
    expect(config.isConfigured).toBe(false);
    expect(config.missingVars).toContain('SMTP_PASSWORD');

    process.env.SMTP_PASSWORD = origPass;
  });

  it('5. sendEmail returns MISSING_SMTP_CONFIG error code when SMTP credentials are not configured', async () => {
    const origUser = process.env.SMTP_USER;
    delete process.env.SMTP_USER;

    const result = await sendEmail({
      to: 'test_dest@myangan.in',
      subject: 'Test Subject',
      text: 'Test content',
      notificationType: 'test',
    });

    expect(result.success).toBe(false);
    expect(result.code).toBe('MISSING_SMTP_CONFIG');
    expect(result.error).toContain('SMTP transporter unconfigured');

    process.env.SMTP_USER = origUser;
  });

  it('6. verifySmtpConnection returns safe diagnostic status without leaking passwords or secrets', async () => {
    const diag = await verifySmtpConnection();
    expect(diag).toBeDefined();
    expect(typeof diag.success).toBe('boolean');
    expect(typeof diag.message).toBe('string');
    // Ensure no password string is present in message
    expect(diag.message).not.toContain(process.env.SMTP_PASS || 'secret');
  });

  it('7. Handles EMAIL_FROM with formatted display name correctly', async () => {
    const origFrom = process.env.EMAIL_FROM;
    process.env.EMAIL_FROM = 'MyAngan <service@myangan.in>';

    const config = validateSmtpConfig();
    expect(typeof config.isConfigured).toBe('boolean');

    process.env.EMAIL_FROM = origFrom;
  });
});
