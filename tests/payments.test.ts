/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect } from 'vitest';
import crypto from 'crypto';
import { timingSafeEqualHMAC, PLAN_PRICING } from '../server/payments';

describe('Phase 2 Payment Gateway & Security Unit Tests', () => {
  it('PLAN_PRICING matrix contains valid server-controlled paisa values', () => {
    expect(PLAN_PRICING['broker_monthly']).toBeDefined();
    expect(PLAN_PRICING['broker_monthly'].amountPaisa).toBe(99900); // 999 INR
    expect(PLAN_PRICING['landlord_premium'].amountPaisa).toBe(49900); // 499 INR
  });

  it('timingSafeEqualHMAC correctly validates identical HMAC signatures', () => {
    const secret = 'test-razorpay-secret-12345';
    const payload = 'order_9999|pay_8888';
    const sig1 = crypto.createHmac('sha256', secret).update(payload).digest('hex');
    const sig2 = crypto.createHmac('sha256', secret).update(payload).digest('hex');

    expect(timingSafeEqualHMAC(sig1, sig2)).toBe(true);
  });

  it('timingSafeEqualHMAC rejects tampered or mismatched HMAC signatures', () => {
    const secret = 'test-razorpay-secret-12345';
    const payload = 'order_9999|pay_8888';
    const sig1 = crypto.createHmac('sha256', secret).update(payload).digest('hex');
    const sigTampered = crypto.createHmac('sha256', secret).update('order_9999|pay_9999').digest('hex');

    expect(timingSafeEqualHMAC(sig1, sigTampered)).toBe(false);
  });

  it('timingSafeEqualHMAC handles length mismatches safely without throwing', () => {
    expect(timingSafeEqualHMAC('abcd', 'abcdef')).toBe(false);
  });
});
