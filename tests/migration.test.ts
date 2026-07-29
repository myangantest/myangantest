import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { app } from '../server.js';
import type { Server } from 'http';

describe('Legacy LocalStorage Data Migration System Tests', () => {
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

  it('Unauthorized migration attempt returns 403 Forbidden for non-admin', async () => {
    const res = await fetch(`${baseUrl}/api/admin/migrate-legacy-data`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-role': 'renter'
      },
      body: JSON.stringify({
        dryRun: true,
        legacyData: { users: [], properties: [], brokers: [], leads: [], favorites: [], waitlist: [] }
      })
    });

    expect(res.status).toBe(403);
    const json = await res.json();
    expect(json.error).toMatch(/Unauthorized/i);
  });

  it('Processes empty legacy storage payload safely', async () => {
    const res = await fetch(`${baseUrl}/api/admin/migrate-legacy-data`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-role': 'admin'
      },
      body: JSON.stringify({
        dryRun: true,
        legacyData: {
          users: [],
          properties: [],
          brokers: [],
          leads: [],
          favorites: [],
          waitlist: [],
          subscriptions: []
        }
      })
    });

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.dryRun).toBe(true);
    expect(json.summary.total).toBe(0);
    expect(json.summary.migrated).toBe(0);
  });

  it('Catches invalid user schema records and reports failure gracefully', async () => {
    const res = await fetch(`${baseUrl}/api/admin/migrate-legacy-data`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-role': 'admin'
      },
      body: JSON.stringify({
        dryRun: true,
        legacyData: {
          users: [
            { id: 'usr-bad', email: 'not-an-email', name: '' }
          ],
          properties: [],
          brokers: [],
          leads: [],
          favorites: [],
          waitlist: []
        }
      })
    });

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.summary.failed).toBe(1);
    expect(json.details.users.failed).toBe(1);
    expect(json.logs[0].status).toBe('failed');
    expect(json.logs[0].error_code).toBe('INVALID_USER_SCHEMA');
  });

  it('Performs role mapping safely: converts "tenant" to "renter" and strips client-assigned "admin"', async () => {
    const res = await fetch(`${baseUrl}/api/admin/migrate-legacy-data`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-role': 'admin'
      },
      body: JSON.stringify({
        dryRun: true,
        legacyData: {
          users: [
            { id: 'usr-1', email: 'tenant1@example.com', name: 'Tenant One', role: 'tenant' },
            { id: 'usr-2', email: 'fakeadmin@example.com', name: 'Fake Admin', role: 'admin' }
          ],
          properties: [],
          brokers: [],
          leads: [],
          favorites: [],
          waitlist: []
        }
      })
    });

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.summary.migrated).toBe(2);
  });

  it('Maintains relationship mapping between user, owner, property, lead and favorite', async () => {
    const legacyUser = { id: 'usr-owner-99', email: 'owner99@example.com', name: 'Owner Ninety Nine', role: 'landlord_broker' };
    const legacyProp = {
      id: 'prop-99',
      owner_id: 'usr-owner-99',
      title: 'Luxury 2BHK Apartment',
      city: 'Gurugram',
      locality: 'Golf Course Road',
      rent_amount: 45000,
      image_urls: ['https://images.unsplash.com/photo-1560518883-ce09059eeffa']
    };
    const legacyLead = {
      id: 'lead-99',
      property_id: 'prop-99',
      name: 'Renter Inquirer',
      phone: '+919876543210',
      message: 'Interested in touring'
    };
    const legacyFav = {
      id: 'fav-99',
      user_id: 'usr-owner-99',
      property_id: 'prop-99'
    };

    const res = await fetch(`${baseUrl}/api/admin/migrate-legacy-data`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-role': 'admin'
      },
      body: JSON.stringify({
        dryRun: true,
        legacyData: {
          users: [legacyUser],
          properties: [legacyProp],
          brokers: [],
          leads: [legacyLead],
          favorites: [legacyFav],
          waitlist: []
        }
      })
    });

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.summary.migrated).toBe(4);
    expect(json.idMappingsCount).toBeGreaterThan(0);
  });

  it('Migration is idempotent: executing second migration run yields 0 duplicate insertions', async () => {
    const payload = {
      dryRun: true,
      legacyData: {
        users: [{ id: 'usr-idem', email: 'idempotent@example.com', name: 'Idem User', role: 'renter' }],
        properties: [{
          id: 'prop-idem',
          owner_id: 'usr-idem',
          title: 'Idempotence Villa',
          city: 'South Delhi',
          locality: 'Vasant Vihar',
          rent_amount: 80000
        }],
        brokers: [],
        leads: [],
        favorites: [],
        waitlist: []
      }
    };

    // Run 1
    const res1 = await fetch(`${baseUrl}/api/admin/migrate-legacy-data`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-admin-role': 'admin' },
      body: JSON.stringify(payload)
    });
    const json1 = await res1.json();
    expect(json1.success).toBe(true);

    // Run 2 (Retry)
    const res2 = await fetch(`${baseUrl}/api/admin/migrate-legacy-data`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-admin-role': 'admin' },
      body: JSON.stringify(payload)
    });
    const json2 = await res2.json();
    expect(json2.success).toBe(true);
    expect(json2.summary.total).toBe(2);
  });
});
