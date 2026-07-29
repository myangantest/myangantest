import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { app } from '../server.js';
import type { Server } from 'http';

describe('API Integration Endpoint Tests', () => {
  let server: Server;
  let baseUrl: string;

  beforeAll(async () => {
    return new Promise<void>((resolve) => {
      server = app.listen(0, () => {
        const port = (server.address() as any).port;
        baseUrl = `http://127.0.0.1:${port}`;
        resolve();
      });
    });
  });

  afterAll(async () => {
    if (server) server.close();
  });

  it('GET /api/health returns 200 OK and status ok', async () => {
    const res = await fetch(`${baseUrl}/api/health`);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.status).toBe('ok');
  });

  it('POST /api/auth/register returns 400 for empty or missing mandatory fields', async () => {
    const res = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: '', name: '', role: 'renter' })
    });
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBeDefined();
  });

  it('POST /api/auth/verify-otp returns error status for non-existent or invalid OTP code', async () => {
    const res = await fetch(`${baseUrl}/api/auth/verify-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'nonexistent@myangan.in', code: '000000' })
    });
    expect([400, 500]).toContain(res.status);
    const json = await res.json();
    expect(json.error).toBeDefined();
  });

  it('POST /api/auth/resend-otp returns error status for un-registered user email', async () => {
    const res = await fetch(`${baseUrl}/api/auth/resend-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'unregistered9999@myangan.in' })
    });
    expect([400, 404, 500]).toContain(res.status);
    const json = await res.json();
    expect(json.error).toBeDefined();
  });
});
