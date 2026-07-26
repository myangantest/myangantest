/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect } from 'vitest';
import { getSanitizedVerificationStatusLabel } from '../server/operations';

describe('Phase 3 Operational Modules Unit Tests', () => {
  it('getSanitizedVerificationStatusLabel maps approved status to compliant wording', () => {
    const label = getSanitizedVerificationStatusLabel('approved');
    expect(label).toBe('Verification completed by MyAngan review');
    expect(label).not.toContain('government verified');
    expect(label).not.toContain('title guaranteed');
    expect(label).not.toContain('legally clear');
  });

  it('getSanitizedVerificationStatusLabel maps submitted and under review statuses cleanly', () => {
    expect(getSanitizedVerificationStatusLabel('submitted')).toBe('Documents submitted');
    expect(getSanitizedVerificationStatusLabel('under_review')).toBe('Verification under review');
    expect(getSanitizedVerificationStatusLabel('not_submitted')).toBe('Verification not submitted');
  });
});
