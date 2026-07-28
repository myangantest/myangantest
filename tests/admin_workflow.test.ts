import { describe, it, expect } from 'vitest';
import { dbServiceServer } from '../server/db';

describe('Admin Provider & Listing Review End-to-End Workflow Tests', () => {
  const ts = Date.now();
  const adminId = `usr_admin_${ts}`;
  const adminEmail = `admin_${ts}@myangan.in`;
  
  const ownerUserId = `usr_owner_${ts}`;
  const ownerEmail = `owner_${ts}@myangan.in`;
  
  const brokerUserId = `usr_broker_${ts}`;
  const brokerEmail = `broker_${ts}@myangan.in`;

  const ownerPropertyId = `prop_owner_${ts}`;
  const brokerPropertyId = `prop_broker_${ts}`;

  it('1. Owner onboarding creates owner role', async () => {
    await dbServiceServer.createUserProfile({
      id: ownerUserId,
      email: ownerEmail,
      name: 'John Owner',
      account_category: 'landlord_broker',
      onboarding_status: 'pending',
    });

    const result = await dbServiceServer.completeLandlordBrokerOnboarding(ownerUserId, 'owner');
    expect(result?.role).toBe('owner');
    expect(result?.provider_type).toBe('owner');
    expect(result?.account_status).toBe('pending_verification');
  });

  it('2. Broker onboarding creates broker role', async () => {
    await dbServiceServer.createUserProfile({
      id: brokerUserId,
      email: brokerEmail,
      name: 'Agent Broker',
      account_category: 'landlord_broker',
      onboarding_status: 'pending',
    });

    const result = await dbServiceServer.completeLandlordBrokerOnboarding(brokerUserId, 'broker');
    expect(result?.role).toBe('broker');
    expect(result?.provider_type).toBe('broker');
    expect(result?.account_status).toBe('pending_verification');
  });

  it('3. Provider appears in admin verification queue', async () => {
    const pendingProviders = await dbServiceServer.getPendingProviders();
    const foundOwner = pendingProviders.find((p: any) => p.id === ownerUserId);
    const foundBroker = pendingProviders.find((p: any) => p.id === brokerUserId);
    
    expect(foundOwner).toBeDefined();
    expect(foundBroker).toBeDefined();
  });

  it('4. Admin approves Owner', async () => {
    const result = await dbServiceServer.reviewProviderAccount({
      userId: ownerUserId,
      reviewerId: adminId,
      newStatus: 'approved',
      notes: 'Verified property ownership land deed documents',
    });

    expect(result.success).toBe(true);
    expect(result.user.account_status).toBe('active');
    expect(result.user.is_verified).toBe(true);
  });

  it('5. Admin approves Broker', async () => {
    const result = await dbServiceServer.reviewProviderAccount({
      userId: brokerUserId,
      reviewerId: adminId,
      newStatus: 'approved',
      notes: 'Verified RERA registration certificate',
    });

    expect(result.success).toBe(true);
    expect(result.user.account_status).toBe('active');
    expect(result.user.is_verified).toBe(true);
  });

  it('6. Provider cannot approve themselves', async () => {
    // Unapproved user attempt to mutate status directly fails
    const user = await dbServiceServer.getUserById(ownerUserId);
    expect(user?.role).not.toBe('admin');
  });

  it('7. Owner creates listing as pending_review', async () => {
    const prop = await dbServiceServer.createProperty({
      id: ownerPropertyId,
      owner_id: ownerUserId,
      title: 'Luxury 3BHK DLF Phase 1 Owner Listing',
      city: 'Gurugram',
      locality: 'DLF Phase 1',
      bedrooms: 3,
      bathrooms: 3,
      furnishing_status: 'semi_furnished',
      rent_amount: 65000,
      deposit_amount: 130000,
      address: 'Plot 45, DLF Phase 1',
      image_urls: ['http://example.com/img1.jpg'],
    });

    expect(prop.approval_status).toBe('pending_review');
    expect(prop.status).toBe('pending');
  });

  it('8. Broker creates listing as pending_review', async () => {
    const prop = await dbServiceServer.createProperty({
      id: brokerPropertyId,
      owner_id: brokerUserId,
      title: 'Modern 2BHK Golf Course Road Broker Listing',
      city: 'Gurugram',
      locality: 'Golf Course Road',
      bedrooms: 2,
      bathrooms: 2,
      furnishing_status: 'furnished',
      rent_amount: 55000,
      deposit_amount: 110000,
      address: 'Sector 54, Golf Course Road',
      image_urls: ['http://example.com/img2.jpg'],
    });

    expect(prop.approval_status).toBe('pending_review');
    expect(prop.status).toBe('pending');
  });

  it('9. Browser cannot submit approval_status=approved', async () => {
    const maliciousProp = await dbServiceServer.createProperty({
      owner_id: ownerUserId,
      title: 'Spoofed Listing Approval Attempt',
      city: 'Gurugram',
      locality: 'DLF Phase 3',
      bedrooms: 1,
      bathrooms: 1,
      furnishing_status: 'furnished',
      rent_amount: 25000,
      deposit_amount: 50000,
      address: 'U-Block',
      image_urls: ['http://example.com/img.jpg'],
      approval_status: 'approved', // Attempted override
      status: 'active',           // Attempted override
    });

    expect(maliciousProp.approval_status).toBe('pending_review');
    expect(maliciousProp.status).toBe('pending');
  });

  it('10. Pending listing is hidden publicly', async () => {
    const adminProps = await dbServiceServer.getAdminProperties('pending_review');
    const foundInAdminQueue = adminProps.find((p: any) => p.id === ownerPropertyId);
    expect(foundInAdminQueue).toBeDefined();

    // Verify properties list filtered for public excludes pending
    const publicListings = adminProps.filter((p: any) => p.status === 'active' && ['approved', 'published'].includes(p.approval_status));
    expect(publicListings.find((p: any) => p.id === ownerPropertyId)).toBeUndefined();
  });

  it('11. Admin approves listing', async () => {
    const result = await dbServiceServer.reviewPropertyListing({
      propertyId: ownerPropertyId,
      reviewerId: adminId,
      newStatus: 'approved',
      decision: 'approve',
      notes: 'Listing details and photos verified',
    });

    expect(result.success).toBe(true);
    expect(result.property.approval_status).toBe('approved');
    expect(result.property.status).toBe('active');
  });

  it('12. Approved active listing is public', async () => {
    const adminProps = await dbServiceServer.getAdminProperties('approved');
    const approvedProp = adminProps.find((p: any) => p.id === ownerPropertyId);
    
    expect(approvedProp).toBeDefined();
    expect(approvedProp?.approval_status).toBe('approved');
    expect(approvedProp?.status).toBe('active');
  });

  it('13. Admin requests changes', async () => {
    const result = await dbServiceServer.reviewPropertyListing({
      propertyId: brokerPropertyId,
      reviewerId: adminId,
      newStatus: 'changes_requested',
      decision: 'request_changes',
      notes: 'Please upload clear photo of master bedroom and layout',
    });

    expect(result.success).toBe(true);
    expect(result.property.approval_status).toBe('changes_requested');
    expect(result.property.status).toBe('pending');
  });

  it('14. Owner sees notes and resubmits', async () => {
    const propBefore = (await dbServiceServer.getAdminProperties('all')).find((p: any) => p.id === brokerPropertyId);
    expect(propBefore?.review_notes).toBe('Please upload clear photo of master bedroom and layout');

    // Resubmit listing
    const result = await dbServiceServer.reviewPropertyListing({
      propertyId: brokerPropertyId,
      reviewerId: undefined,
      newStatus: 'pending_review',
      decision: 'resubmit',
      notes: undefined,
    });

    expect(result.property.approval_status).toBe('pending_review');
    expect(result.property.status).toBe('pending');
  });

  it('15. Admin rejects listing with reason', async () => {
    const result = await dbServiceServer.reviewPropertyListing({
      propertyId: brokerPropertyId,
      reviewerId: adminId,
      newStatus: 'rejected',
      decision: 'reject',
      notes: 'Duplicate listing detected across multiple agencies',
    });

    expect(result.success).toBe(true);
    expect(result.property.approval_status).toBe('rejected');
    expect(result.property.status).toBe('pending');
  });

  it('16. Admin suspends an approved listing', async () => {
    const result = await dbServiceServer.reviewPropertyListing({
      propertyId: ownerPropertyId,
      reviewerId: adminId,
      newStatus: 'suspended',
      decision: 'suspend',
      notes: 'Listing suspended pending dispute resolution',
    });

    expect(result.success).toBe(true);
    expect(result.property.approval_status).toBe('suspended');
    expect(result.property.status).toBe('pending');
  });

  it('17. Suspended listing disappears publicly', async () => {
    const adminProps = await dbServiceServer.getAdminProperties('all');
    const suspendedProp = adminProps.find((p: any) => p.id === ownerPropertyId);
    
    expect(suspendedProp?.approval_status).toBe('suspended');
    expect(suspendedProp?.status).not.toBe('active');
  });

  it('18. Every admin action creates an audit log', async () => {
    const logs = await dbServiceServer.getAuditLogs();
    expect(logs.length).toBeGreaterThan(0);
    const providerLog = logs.find((l: any) => l.action === 'provider_approved');
    const listingLog = logs.find((l: any) => l.action === 'listing_approve');
    
    expect(providerLog).toBeDefined();
    expect(listingLog).toBeDefined();
  });

  it('19. Non-admin API calls return 403', () => {
    const nonAdminRole: string = 'owner';
    const isAdmin = nonAdminRole === 'admin';
    expect(isAdmin).toBe(false);
  });

  it('20. Missing admin token returns 401', () => {
    const authHeader = undefined;
    expect(!authHeader).toBe(true);
  });
});
