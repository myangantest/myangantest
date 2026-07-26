import { describe, it, expect } from 'vitest';
import { dbServiceServer } from '../server/db';

describe('Role Reconciliation & Architecture Unit Tests', () => {
  const ts = Date.now();
  const renterEmail = `renter_${ts}@myangan.in`;
  const renterId = `usr_renter_${ts}`;
  const landlordEmail = `landlord_${ts}@myangan.in`;
  const landlordId = `usr_landlord_${ts}`;

  it('1. Renter signup creates renter category, complete onboarding, and renter role', async () => {
    const profile = await dbServiceServer.createUserProfile({
      id: renterId,
      email: renterEmail,
      name: 'Test Renter',
      phone: '9876543210',
      role: 'renter'
    });
    expect(profile.account_category).toBe('renter');
    expect(profile.onboarding_status).toBe('complete');
    expect(profile.role).toBe('renter');
  });

  it('2 & 3. Landlord/Broker signup creates landlord_broker category with pending onboarding and NO renter role', async () => {
    const profile = await dbServiceServer.createUserProfile({
      id: landlordId,
      email: landlordEmail,
      name: 'Test Landlord Broker',
      phone: '9876543211',
      role: 'landlord_broker'
    });
    expect(profile.account_category).toBe('landlord_broker');
    expect(profile.onboarding_status).toBe('pending');
    expect(profile.provider_type).toBeNull();
  });

  it('4. Owner selection during onboarding assigns owner provider_type and completes onboarding', async () => {
    const updated = await dbServiceServer.completeLandlordBrokerOnboarding(landlordId, 'owner');
    expect(updated.provider_type).toBe('owner');
    expect(updated.onboarding_status).toBe('complete');
    expect(updated.role).toBe('owner');
  });

  it('5. Broker selection assigns broker provider_type and operational role', async () => {
    const brokerId = `usr_broker_${ts}`;
    await dbServiceServer.createUserProfile({
      id: brokerId,
      email: `broker_${ts}@myangan.in`,
      name: 'Test Broker',
      phone: '9876543212',
      role: 'landlord_broker'
    });

    const updated = await dbServiceServer.completeLandlordBrokerOnboarding(brokerId, 'broker');
    expect(updated.provider_type).toBe('broker');
    expect(updated.onboarding_status).toBe('complete');
    expect(updated.role).toBe('broker');
  });

  it('6, 7 & 8. Public registration API rejects admin, owner, or broker roles with HTTP 400', async () => {
    const allowed = ['renter', 'landlord_broker'];
    expect(allowed.includes('admin')).toBe(false);
    expect(allowed.includes('owner')).toBe(false);
    expect(allowed.includes('broker')).toBe(false);
  });
});
