import { describe, it, expect } from 'vitest';
import { dbServiceServer } from '../server/db';

describe('OTP Verification & Security Authorization Unit Tests', () => {
  const testEmail = `test_otp_${Date.now()}@myangan.in`;
  const testUserId = `user_otp_${Date.now()}`;
  let otpRecordId: string;

  it('1. Prepares user profile and creates OTP verification record without exposing secrets', async () => {
    const profile = await dbServiceServer.createUserProfile({
      id: testUserId,
      email: testEmail,
      name: 'OTP Test User',
      phone: '9876543210',
      role: 'renter',
      is_verified: false
    });
    expect(profile).toBeDefined();
    expect(profile.is_verified).toBe(false);

    const otp = await dbServiceServer.createOtpVerification({
      user_id: testUserId,
      email: testEmail,
      code_hash: 'a665a45920422f9d417e4867efdc4fb8a04a1f3fff1fa07e998e86f7f7a27ae3', // hash of 123456
      purpose: 'registration_otp',
      expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString()
    });
    expect(otp).toBeDefined();
    expect(otp.id).toBeDefined();
    otpRecordId = otp.id;
  });

  it('2. Fetching active OTP returns unconsumed record for matching email and purpose', async () => {
    const active = await dbServiceServer.getLatestOtpVerification(testEmail, 'registration_otp');
    expect(active).toBeDefined();
    expect(active.user_id).toBe(testUserId);
  });

  it('3. OTP for non-matching email returns null', async () => {
    const active = await dbServiceServer.getLatestOtpVerification('wrong_email@myangan.in', 'registration_otp');
    expect(active).toBeNull();
  });

  it('4. Server-side activateAccountAfterOtpVerification sets only is_verified: true', async () => {
    const activated = await dbServiceServer.activateAccountAfterOtpVerification(testUserId);
    expect(activated).toBeDefined();
    expect(activated.is_verified).toBe(true);
    // Does not grant subscription or admin role
    expect(activated.is_subscribed).toBeFalsy();
    expect(activated.role).not.toBe('admin');
  });

  it('5. Consumed OTP is marked as consumed', async () => {
    await dbServiceServer.consumeOtpVerification(otpRecordId);
    const active = await dbServiceServer.getLatestOtpVerification(testEmail, 'registration_otp');
    expect(active).toBeNull();
  });

  it('6. Incrementing OTP attempts increases attempt count', async () => {
    const newOtp = await dbServiceServer.createOtpVerification({
      user_id: testUserId,
      email: testEmail,
      code_hash: 'dummy_hash',
      purpose: 'registration_otp',
      expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString()
    });
    await dbServiceServer.incrementOtpAttempts(newOtp.id);
    const active = await dbServiceServer.getLatestOtpVerification(testEmail, 'registration_otp');
    expect(active.attempt_count).toBeGreaterThanOrEqual(1);
  });
});
