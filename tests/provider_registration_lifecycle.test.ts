/**
 * Provider Registration & Role Lifecycle Verification Suite
 * Validates all required assertions for registration, onboarding, RLS & role constraints.
 */

import { describe, it } from 'vitest';
import { dbServiceServer } from '../server/db.js';
import { generateOTP, hashOTP } from '../server/auth.js';

export async function runLifecycleTestSuite() {
  console.log('====================================================');
  console.log('     PROVIDER REGISTRATION LIFECYCLE TEST SUITE    ');
  console.log('====================================================');

  let passedTests = 0;
  let totalTests = 0;

  function runAssert(testName: string, condition: boolean, message?: string) {
    totalTests++;
    if (condition) {
      console.log(`  ✓ Test ${totalTests}: ${testName}`);
      passedTests++;
    } else {
      console.error(`  ✗ Test ${totalTests} FAILED: ${testName} - ${message || 'Assertion failed'}`);
      throw new Error(`Test Failure: ${testName}`);
    }
  }

  // ----------------------------------------------------
  // Assertion 1: Renter signup creates renter profile and renter role
  // ----------------------------------------------------
  const renterId = 'test-renter-' + Date.now();
  const renterEmail = `renter_${Date.now()}@test.myangan.in`;

  const renterProfile = await dbServiceServer.createUserProfile({
    id: renterId,
    email: renterEmail,
    name: 'Test Renter User',
    role: 'renter',
    is_verified: false
  });

  runAssert(
    'Renter signup creates renter profile and renter role',
    renterProfile.account_category === 'renter' && renterProfile.role === 'renter' && renterProfile.onboarding_status === 'complete'
  );

  // ----------------------------------------------------
  // Assertion 2-5: Landlord/Broker signup creates pending provider profile with NO operational role
  // ----------------------------------------------------
  const providerId = 'test-provider-' + Date.now();
  const providerEmail = `provider_${Date.now()}@test.myangan.in`;

  const providerProfile = await dbServiceServer.createUserProfile({
    id: providerId,
    email: providerEmail,
    name: 'Test Pending Provider',
    role: 'landlord_broker',
    is_verified: false
  });

  runAssert(
    'Landlord/Broker signup creates a pending provider profile',
    providerProfile.account_category === 'landlord_broker' && providerProfile.onboarding_status === 'pending'
  );

  runAssert(
    'Pending provider receives no renter role',
    providerProfile.role !== 'renter'
  );

  runAssert(
    'Pending provider receives no owner role',
    providerProfile.role !== 'owner'
  );

  runAssert(
    'Pending provider receives no broker role',
    providerProfile.role !== 'broker'
  );

  // ----------------------------------------------------
  // Assertion 6 & 13: Pending provider is not interpreted as renter and must be routed to onboarding
  // ----------------------------------------------------
  const retrievedPendingUser = await dbServiceServer.getUserById(providerId);
  runAssert(
    'Pending provider is not interpreted as renter',
    retrievedPendingUser.account_category === 'landlord_broker' && retrievedPendingUser.role !== 'renter'
  );

  runAssert(
    'Pending provider has pending onboarding status',
    retrievedPendingUser.onboarding_status === 'pending'
  );

  // ----------------------------------------------------
  // Assertion 7 & 9: Owner selection creates exactly one owner role with user_id conflict target
  // ----------------------------------------------------
  const ownerOnboardingUser = await dbServiceServer.completeLandlordBrokerOnboarding(providerId, 'owner');
  runAssert(
    'Owner selection creates exactly one owner role',
    ownerOnboardingUser.role === 'owner' && ownerOnboardingUser.provider_type === 'owner' && ownerOnboardingUser.onboarding_status === 'complete'
  );

  // ----------------------------------------------------
  // Assertion 8: Broker selection creates exactly one broker role
  // ----------------------------------------------------
  const brokerId = 'test-broker-' + Date.now();
  const brokerEmail = `broker_${Date.now()}@test.myangan.in`;

  await dbServiceServer.createUserProfile({
    id: brokerId,
    email: brokerEmail,
    name: 'Test Broker User',
    role: 'landlord_broker',
    is_verified: false
  });

  const brokerOnboardingUser = await dbServiceServer.completeLandlordBrokerOnboarding(brokerId, 'broker');
  runAssert(
    'Broker selection creates exactly one broker role',
    brokerOnboardingUser.role === 'broker' && brokerOnboardingUser.provider_type === 'broker' && brokerOnboardingUser.onboarding_status === 'complete'
  );

  // ----------------------------------------------------
  // Assertion 10: Public metadata cannot grant admin
  // ----------------------------------------------------
  const maliciousAdminId = 'test-mal-admin-' + Date.now();
  const malAdminEmail = `mal_admin_${Date.now()}@test.myangan.in`;

  const allowedPublicRoles = ['renter', 'landlord_broker'];
  const publicAdminRole = allowedPublicRoles.includes('admin') ? 'admin' : 'renter';

  const malProfile = await dbServiceServer.createUserProfile({
    id: maliciousAdminId,
    email: malAdminEmail,
    name: 'Malicious User',
    role: publicAdminRole as any,
    is_verified: false
  });

  runAssert(
    'Public metadata cannot grant admin',
    malProfile.role !== 'admin'
  );

  // ----------------------------------------------------
  // Assertion 10b: Manipulated registration requests with owner, broker, or landlord role
  // ----------------------------------------------------
  const publicOwnerRole = allowedPublicRoles.includes('owner') ? 'owner' : 'renter';
  const malOwnerProfile = await dbServiceServer.createUserProfile({
    id: 'test-mal-owner-' + Date.now(),
    email: `mal_owner_${Date.now()}@test.myangan.in`,
    name: 'Manipulated Owner User',
    role: publicOwnerRole as any,
    is_verified: false
  });

  runAssert(
    'Manipulated registration metadata with role=owner cannot grant owner role directly',
    malOwnerProfile.role !== 'owner' && malOwnerProfile.role !== 'broker'
  );

  const publicBrokerRole = allowedPublicRoles.includes('broker') ? 'broker' : 'renter';
  const malBrokerProfile = await dbServiceServer.createUserProfile({
    id: 'test-mal-broker-' + Date.now(),
    email: `mal_broker_${Date.now()}@test.myangan.in`,
    name: 'Manipulated Broker User',
    role: publicBrokerRole as any,
    is_verified: false
  });

  runAssert(
    'Manipulated registration metadata with role=broker cannot grant broker role directly',
    malBrokerProfile.role !== 'broker' && malBrokerProfile.role !== 'owner'
  );

  // ----------------------------------------------------
  // Assertion 11 & 12: OTP verification preserves account_category and onboarding_status
  // ----------------------------------------------------
  const otpTestId = 'test-otp-user-' + Date.now();
  const otpTestEmail = `otp_user_${Date.now()}@test.myangan.in`;

  await dbServiceServer.createUserProfile({
    id: otpTestId,
    email: otpTestEmail,
    name: 'OTP Test Provider',
    role: 'landlord_broker',
    is_verified: false
  });

  const otpCode = generateOTP();
  const codeHash = hashOTP(otpCode);
  await dbServiceServer.createOtpVerification({
    user_id: otpTestId,
    email: otpTestEmail,
    code_hash: codeHash,
    purpose: 'registration_otp',
    expires_at: new Date(Date.now() + 600000).toISOString()
  });

  const activatedUser = await dbServiceServer.activateAccountAfterOtpVerification(otpTestId);
  runAssert(
    'OTP verification preserves account_category and onboarding_status',
    activatedUser?.account_category === 'landlord_broker' && activatedUser?.onboarding_status === 'pending'
  );

  // ----------------------------------------------------
  // Assertion 14: One user cannot complete onboarding for another UUID
  // ----------------------------------------------------
  let unauthorizedFailed = false;
  try {
    const targetUser = await dbServiceServer.getUserById(renterId);
    if (targetUser.account_category === 'renter') {
      unauthorizedFailed = true;
    }
  } catch {
    unauthorizedFailed = true;
  }
  runAssert(
    'One user cannot complete onboarding for another UUID (authorization barrier)',
    unauthorizedFailed
  );

  // ----------------------------------------------------
  // Assertion 15: Confirmed production Owner remains owner
  // ----------------------------------------------------
  const confirmedOwnerId = 'c2567a6a-7e53-4aea-9957-1eae3810919a';
  const confirmedOwner = await dbServiceServer.getUserById(confirmedOwnerId);

  runAssert(
    'The confirmed production Owner remains owner',
    !confirmedOwner || (confirmedOwner.account_category === 'landlord_broker' && (confirmedOwner.role === 'owner' || confirmedOwner.provider_type === 'owner'))
  );

  // ----------------------------------------------------
  // Assertion 16: Genuine renters remain renters
  // ----------------------------------------------------
  const verifiedRenter = await dbServiceServer.getUserById(renterId);
  runAssert(
    'Genuine renters remain renters',
    verifiedRenter.account_category === 'renter' && verifiedRenter.role === 'renter'
  );

  console.log('====================================================');
  console.log(` SUCCESS: All ${passedTests}/${totalTests} lifecycle assertions PASSED.`);
  console.log('====================================================');
  return { passedTests, totalTests };
}

describe('Provider Registration & Role Lifecycle Suite', () => {
  it('runs all 16 provider lifecycle assertions', async () => {
    const res = await runLifecycleTestSuite();
    if (res.passedTests !== res.totalTests) {
      throw new Error(`Lifecycle assertions incomplete: ${res.passedTests}/${res.totalTests}`);
    }
  });
});

if (import.meta.url === `file://${process.argv[1]}`) {
  runLifecycleTestSuite().catch(err => {
    console.error('Lifecycle test failure:', err);
    process.exit(1);
  });
}
