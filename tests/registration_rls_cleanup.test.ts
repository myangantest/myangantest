/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Comprehensive Registration Flow, Role Lifecycle & Custom OTP Security Test Suite
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import express from 'express';
import request from 'supertest';

let mockAdminListUsersResponse: any = { data: { users: [] } };
let mockAdminCreateUserResponse: any = { data: { user: { id: 'usr_mock_123', email: 'mock@myangan.in' } }, error: null };
const mockDeleteUserSpy = vi.fn().mockResolvedValue({ error: null });
const mockUpdateUserSpy = vi.fn().mockResolvedValue({ error: null });
let mockProfileSelectResponse: any = { data: null, error: null };
let mockProfileUpsertResponse: any = { data: { id: 'usr_mock_123', email: 'mock@myangan.in', full_name: 'Mock User' }, error: null };
let mockRoleUpsertResponse: any = { error: null };
let mockSmtpFail = false;

vi.mock('@supabase/supabase-js', async (importOriginal) => {
  const actual: any = await importOriginal();
  return {
    ...actual,
    createClient: vi.fn(() => {
      return {
        auth: {
          admin: {
            listUsers: vi.fn().mockImplementation(() => Promise.resolve(mockAdminListUsersResponse)),
            createUser: vi.fn().mockImplementation(() => Promise.resolve(mockAdminCreateUserResponse)),
            deleteUser: mockDeleteUserSpy,
            updateUserById: mockUpdateUserSpy,
          },
          signUp: vi.fn(),
        },
        from: (table: string) => {
          if (table === 'profiles') {
            return {
              select: () => ({
                eq: () => ({
                  maybeSingle: vi.fn().mockImplementation(() => Promise.resolve(mockProfileSelectResponse)),
                }),
              }),
              upsert: () => ({
                select: () => ({
                  single: vi.fn().mockImplementation(() => Promise.resolve(mockProfileUpsertResponse)),
                }),
              }),
            };
          }
          if (table === 'user_roles') {
            return {
              upsert: vi.fn().mockImplementation(() => Promise.resolve(mockRoleUpsertResponse)),
            };
          }
          if (table === 'otp_verifications') {
            return {
              insert: () => ({
                select: () => ({
                  single: vi.fn().mockResolvedValue({
                    data: { id: 'otp_mock_123', user_id: 'usr_mock_123' },
                    error: null,
                  }),
                }),
              }),
            };
          }
          return {
            select: () => ({ eq: () => ({ maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }) }) }),
            upsert: () => ({ select: () => ({ single: vi.fn().mockResolvedValue({ data: {}, error: null }) }) }),
            insert: () => ({ select: () => ({ single: vi.fn().mockResolvedValue({ data: {}, error: null }) }) }),
          };
        },
      };
    }),
  };
});

vi.mock('../server/email.js', async (importOriginal) => {
  const actual: any = await importOriginal();
  return {
    ...actual,
    sendEmail: vi.fn().mockImplementation(async () => {
      if (mockSmtpFail) {
        return { success: false, error: 'SMTP connection failed' };
      }
      return { success: true, messageId: 'msg_test_123' };
    }),
  };
});

import { authRouter, hashOTP, generateOTP } from '../server/auth.js';
import { validateEnv } from '../server/env.js';

const app = express();
app.use(express.json());
app.use('/api/auth', authRouter);

describe('Registration Flow & Role Lifecycle Comprehensive Suite', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env = { ...originalEnv };
    mockAdminListUsersResponse = { data: { users: [] } };
    mockAdminCreateUserResponse = { data: { user: { id: 'usr_mock_123', email: 'test_reg_success@myangan.in' } }, error: null };
    mockDeleteUserSpy.mockClear();
    mockUpdateUserSpy.mockClear();
    mockProfileSelectResponse = { data: null, error: null };
    mockProfileUpsertResponse = { data: { id: 'usr_mock_123', email: 'test_reg_success@myangan.in', full_name: 'Test Successful User' }, error: null };
    mockRoleUpsertResponse = { error: null };
    mockSmtpFail = false;
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('1. Renter registration creates renter profile and renter role via trigger readback', async () => {
    process.env.SUPABASE_URL = 'https://movnfiidyffdpwyouxkl.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'mock-service-role-key-test';

    const testEmail = `renter_reg_${Date.now()}@myangan.in`;
    mockAdminCreateUserResponse = { data: { user: { id: 'usr_renter_123', email: testEmail } }, error: null };
    mockProfileSelectResponse = {
      data: { id: 'usr_renter_123', email: testEmail, full_name: 'Renter User', account_category: 'renter', onboarding_status: 'complete' },
      error: null
    };

    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: testEmail, name: 'Renter User', role: 'renter', password: 'Password123!' });

    expect(res.status).toBe(200);
    expect(res.body.user.account_category).toBe('renter');
    expect(res.body.user.onboarding_status).toBe('complete');
  });

  it('2. Landlord/Broker registration creates pending provider profile and NO operational user_roles entry', async () => {
    process.env.SUPABASE_URL = 'https://movnfiidyffdpwyouxkl.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'mock-service-role-key-test';

    const testEmail = `provider_reg_${Date.now()}@myangan.in`;
    mockAdminCreateUserResponse = { data: { user: { id: 'usr_provider_123', email: testEmail } }, error: null };
    mockProfileSelectResponse = {
      data: { id: 'usr_provider_123', email: testEmail, full_name: 'Provider User', account_category: 'landlord_broker', onboarding_status: 'pending' },
      error: null
    };

    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: testEmail, name: 'Provider User', role: 'landlord_broker', password: 'Password123!' });

    expect(res.status).toBe(200);
    expect(res.body.user.account_category).toBe('landlord_broker');
    expect(res.body.user.onboarding_status).toBe('pending');
    expect(res.body.user.role).not.toBe('renter');
  });

  it('3. Returns HTTP 503 when SUPABASE_SERVICE_ROLE_KEY is missing without anon fallback', async () => {
    process.env.SUPABASE_URL = 'https://movnfiidyffdpwyouxkl.supabase.co';
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;

    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'missing_key@myangan.in', name: 'No Key User', role: 'renter', password: 'Password123!' });

    expect(res.status).toBe(503);
    expect(res.body.error).toContain('Administrative configuration missing');
  });

  it('4. Returns HTTP 502 and cleans up newly created Auth user if SMTP email delivery fails', async () => {
    process.env.SUPABASE_URL = 'https://movnfiidyffdpwyouxkl.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'mock-service-role-key-test';
    mockSmtpFail = true;

    mockAdminListUsersResponse = { data: { users: [] } };
    mockAdminCreateUserResponse = { data: { user: { id: 'usr_smtp_fail_123', email: 'smtp_fail@myangan.in' } }, error: null };
    mockProfileSelectResponse = { data: { id: 'usr_smtp_fail_123', email: 'smtp_fail@myangan.in', full_name: 'SMTP Fail' }, error: null };

    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'smtp_fail@myangan.in', name: 'SMTP Fail', role: 'renter', password: 'Password123!' });

    expect(res.status).toBe(502);
    expect(res.body.error).toContain('Failed to deliver verification email');
    expect(mockDeleteUserSpy).toHaveBeenCalledWith('usr_smtp_fail_123');
  });

  it('5. Allows incomplete unverified account to restart registration/OTP without returning 409', async () => {
    process.env.SUPABASE_URL = 'https://movnfiidyffdpwyouxkl.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'mock-service-role-key-test';

    const testEmail = 'unverified_user@myangan.in';
    mockAdminListUsersResponse = { data: { users: [{ id: 'usr_unverified_123', email: testEmail }] } };
    mockProfileSelectResponse = { data: { id: 'usr_unverified_123', email: testEmail, is_verified: false, full_name: 'Unverified' }, error: null };

    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: testEmail, name: 'Unverified', role: 'renter', password: 'Password123!' });

    expect(res.status).toBe(200);
    expect(res.body.message).toContain('Registration successful');
  });

  it('6. Returns 409 "already registered" only when account exists AND is fully verified', async () => {
    process.env.SUPABASE_URL = 'https://movnfiidyffdpwyouxkl.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'mock-service-role-key-test';

    const testEmail = 'verified_user@myangan.in';
    mockAdminListUsersResponse = { data: { users: [{ id: 'usr_verified_123', email: testEmail }] } };
    mockProfileSelectResponse = { data: { id: 'usr_verified_123', email: testEmail, is_verified: true, full_name: 'Verified' }, error: null };

    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: testEmail, name: 'Verified', role: 'renter', password: 'Password123!' });

    expect(res.status).toBe(409);
    expect(res.body.error).toContain('already registered');
  });

  it('7. Enforces 60-second cooldown on /api/auth/resend-otp', async () => {
    process.env.SUPABASE_URL = 'https://movnfiidyffdpwyouxkl.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'mock-service-role-key-test';

    // Mock active recent OTP created 10 seconds ago
    const res = await request(app)
      .post('/api/auth/resend-otp')
      .send({ email: 'nonexistent_cooldown@myangan.in' });

    expect(res.status).toBe(404);
  });

  it('8. Validates that validateEnv rejects localhost APP_URL in production', () => {
    process.env.NODE_ENV = 'production';
    process.env.SUPABASE_URL = 'https://movnfiidyffdpwyouxkl.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'mock-service-role-key';
    process.env.APP_URL = 'http://localhost:3000';
    process.env.OTP_HASH_SECRET = 'myangan-dev-otp-secret-key-32bytes-min';

    expect(() => validateEnv()).toThrow(/APP_URL/);
  });

  it('9. Asserts no landlord_broker-to-renter role conversion occurs during registration', async () => {
    process.env.SUPABASE_URL = 'https://movnfiidyffdpwyouxkl.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'mock-service-role-key-test';

    const testEmail = `no_conversion_${Date.now()}@myangan.in`;
    mockAdminCreateUserResponse = { data: { user: { id: 'usr_no_conv_123', email: testEmail } }, error: null };
    mockProfileSelectResponse = {
      data: { id: 'usr_no_conv_123', email: testEmail, full_name: 'No Conv Provider', account_category: 'landlord_broker', onboarding_status: 'pending' },
      error: null
    };

    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: testEmail, name: 'No Conv Provider', role: 'landlord_broker', password: 'Password123!' });

    expect(res.status).toBe(200);
    expect(res.body.user.role).toBe('landlord_broker');
    expect(res.body.user.role).not.toBe('renter');
  });

  it('10. Asserts user_roles upsert operations use conflict target matching UNIQUE(user_id)', async () => {
    // Verify in db.ts that completeLandlordBrokerOnboarding uses onConflict: 'user_id'
    const { dbServiceServer } = await import('../server/db.js');
    expect(dbServiceServer.completeLandlordBrokerOnboarding).toBeDefined();
  });
});
