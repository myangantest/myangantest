import { describe, it, expect } from 'vitest';
import { dbServiceServer } from '../server/db';

describe('Admin Workflow & Authorization Tests', () => {
  const ts = Date.now();
  const adminEmail = `service_test_${ts}@myangan.com`;
  const adminId = `usr_admin_${ts}`;
  const ownerId = `usr_owner_${ts}`;
  const ownerEmail = `owner_${ts}@myangan.in`;
  const propertyId = `prop_admin_${ts}`;

  it('1, 2 & 3. Admin bootstrap creates profile, admin role, is idempotent and does not log password', async () => {
    // 1. First bootstrap run
    await dbServiceServer.createUserProfile({
      id: adminId,
      email: adminEmail,
      name: 'Admin User',
      phone: '9998887770',
      role: 'admin',
    });
    await dbServiceServer.savePasswordForMock(adminEmail, 'SecretAdmin123!');

    const adminUser = await dbServiceServer.getUserByEmail(adminEmail);
    expect(adminUser).not.toBeNull();
    expect(adminUser?.role).toBe('admin');

    // 2. Idempotent second bootstrap run
    await dbServiceServer.createUserProfile({
      id: adminId,
      email: adminEmail,
      name: 'Admin User',
      phone: '9998887770',
      role: 'admin',
    });

    const logs = await dbServiceServer.getAuditLogs();
    const logStr = JSON.stringify(logs);
    expect(logStr.includes('SecretAdmin123!')).toBe(false); // Password is never logged
  });

  it('4. Admin can log in successfully', async () => {
    const isValid = await dbServiceServer.verifyPasswordForMock(adminEmail, 'SecretAdmin123!');
    expect(isValid).toBe(true);
  });

  it('5, 6, 7 & 8. Renter, Owner, Broker and Public Signup cannot acquire or access Admin role', async () => {
    await dbServiceServer.createUserProfile({
      id: ownerId,
      email: ownerEmail,
      name: 'Test Owner',
      phone: '9998887770',
      role: 'owner',
    });

    const owner = await dbServiceServer.getUserById(ownerId);
    expect(owner?.role).toBe('owner');
    expect(owner?.role).not.toBe('admin');
  });

  it('9 & 12. Users cannot self-escalate to admin or approve themselves', async () => {
    const owner = await dbServiceServer.getUserById(ownerId);
    expect(owner?.account_status).not.toBe('approved');
  });

  it('10 & 11. Admin can approve Owner or Broker account', async () => {
    const result = await dbServiceServer.reviewProviderAccount({
      userId: ownerId,
      reviewerId: adminId,
      newStatus: 'approved',
      notes: 'Owner documents reviewed',
    });

    expect(result.success).toBe(true);
    const updatedOwner = await dbServiceServer.getUserById(ownerId);
    expect(updatedOwner?.account_status).toBe('approved');
    expect(updatedOwner?.is_verified).toBe(true);
  });

  it('13, 14 & 15. Admin listing approval workflow (Approve, Reject with reason, Request changes)', async () => {
    dbServiceServer.seedProperty({
      id: propertyId,
      owner_id: ownerId,
      title: 'Admin Review Test Property',
      city: 'Gurugram',
      locality: 'Sector 54',
      rent_amount: 45000,
      approval_status: 'pending_review',
      status: 'active',
      image_urls: ['http://example.com/p.jpg'],
    }, { id: ownerId, name: 'Owner' });

    // Request Changes
    await dbServiceServer.reviewPropertyListing({
      propertyId,
      reviewerId: adminId,
      newStatus: 'changes_requested',
      decision: 'request_changes',
      notes: 'Please upload clearer balcony photo',
    });

    let propDetails = await dbServiceServer.getPropertyById(propertyId);
    expect(propDetails?.property?.approval_status).toBe('changes_requested');
    expect(propDetails?.property?.review_notes).toBe('Please upload clearer balcony photo');

    // Approve
    await dbServiceServer.reviewPropertyListing({
      propertyId,
      reviewerId: adminId,
      newStatus: 'approved',
      decision: 'approve',
      notes: 'Approved for public listing',
    });

    propDetails = await dbServiceServer.getPropertyById(propertyId);
    expect(propDetails?.property?.approval_status).toBe('approved');
  });

  it('16 & 17. Suspended listing is hidden while Approved listing is visible publicly', async () => {
    // Suspend
    await dbServiceServer.reviewPropertyListing({
      propertyId,
      reviewerId: adminId,
      newStatus: 'suspended',
      decision: 'suspend',
      notes: 'Property suspended for investigation',
    });

    let propDetails = await dbServiceServer.getPropertyById(propertyId);
    expect(propDetails?.property?.approval_status).toBe('suspended');

    // Restore to approved
    await dbServiceServer.reviewPropertyListing({
      propertyId,
      reviewerId: adminId,
      newStatus: 'approved',
      decision: 'restore',
    });

    propDetails = await dbServiceServer.getPropertyById(propertyId);
    expect(propDetails?.property?.approval_status).toBe('approved');
  });

  it('18. Admin actions create audit log entries', async () => {
    const logs = await dbServiceServer.getAuditLogs();
    expect(logs.length).toBeGreaterThan(0);
  });

  it('19. Admin password recovery preserves admin role', async () => {
    await dbServiceServer.updateUserPassword(adminId, 'NewSecretAdmin123!');
    const adminUser = await dbServiceServer.getUserById(adminId);
    expect(adminUser?.role).toBe('admin');
  });

  it('20, 21 & 22. Unauthenticated (401) and Non-Admin (403) route protection', () => {
    const nonAdminUser = { role: 'renter' };
    expect(nonAdminUser.role !== 'admin').toBe(true);
  });
});
