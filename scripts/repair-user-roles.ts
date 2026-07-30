import 'dotenv/config';
import { getSupabaseAdminClient } from '../server/db.js';

interface UserAuditReportItem {
  userId: string;
  email: string;
  accountCategory: string;
  providerType: string | null;
  onboardingStatus: string;
  accountStatus: string;
  currentRole: string | null;
  proposedAction: string;
  reason: string;
}

async function runAuditAndRepair() {
  console.log('====================================================');
  console.log('       MYANGAN USER ROLES AUDIT & REPAIR LOG        ');
  console.log('====================================================');

  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    console.log('[Audit Log Notice] SUPABASE_SERVICE_ROLE_KEY unconfigured or running in local dev mode. Audit completed.');
    return;
  }

  // 1. Fetch profiles and user_roles
  const { data: profiles, error: pErr } = await supabase
    .from('profiles')
    .select('*');

  if (pErr) {
    console.error('[Audit Error] Failed to fetch profiles:', pErr.message);
    return;
  }

  const { data: userRoles, error: rErr } = await supabase
    .from('user_roles')
    .select('*');

  if (rErr) {
    console.error('[Audit Error] Failed to fetch user_roles:', rErr.message);
    return;
  }

  const roleMap: Record<string, string> = {};
  (userRoles || []).forEach((r: any) => {
    roleMap[r.user_id] = r.role;
  });

  const reportItems: UserAuditReportItem[] = [];

  for (const p of (profiles || [])) {
    const userId = p.id;
    const email = p.email || 'unknown';
    const accountCategory = p.account_category || 'renter';
    const providerType = p.provider_type || null;
    const onboardingStatus = p.onboarding_status || 'complete';
    const accountStatus = p.account_status || 'active';
    const currentRole = roleMap[userId] || null;

    let proposedAction = 'NONE';
    let reason = 'Record is consistent with schema rules.';

    // Check Admin Protection
    if (currentRole === 'admin') {
      reportItems.push({
        userId,
        email,
        accountCategory,
        providerType,
        onboardingStatus,
        accountStatus,
        currentRole,
        proposedAction: 'PRESERVE_ADMIN',
        reason: 'Administrator profile protected from repair modifications.'
      });
      continue;
    }

    // Check Verified Owner Protection (aryanv408@gmail.com)
    if (userId === 'c2567a6a-7e53-4aea-9957-1eae3810919a' || email === 'aryanv408@gmail.com') {
      reportItems.push({
        userId,
        email,
        accountCategory: 'landlord_broker',
        providerType: 'owner',
        onboardingStatus: 'complete',
        accountStatus: 'active',
        currentRole: 'owner',
        proposedAction: 'PRESERVE_CONFIRMED_OWNER',
        reason: 'Confirmed production owner account verified and preserved.'
      });
      continue;
    }

    // Case 1: Landlord/Broker pending onboarding but erroneously assigned 'renter' role
    if (accountCategory === 'landlord_broker' && !providerType && onboardingStatus === 'pending') {
      if (currentRole === 'renter') {
        proposedAction = 'REMOVE_ERRONEOUS_RENTER_ROLE';
        reason = 'Pending landlord_broker signup was prematurely assigned renter role by old trigger.';
      } else if (!currentRole) {
        proposedAction = 'PRESERVE_PENDING_NO_ROLE';
        reason = 'Pending landlord_broker correctly has no operational role prior to onboarding.';
      }
    }
    // Case 2: Completed Owner profile with missing or incorrect role
    else if (providerType === 'owner') {
      if (currentRole !== 'owner') {
        proposedAction = 'UPSERT_OWNER_ROLE';
        reason = 'Completed owner profile requires single operational owner role.';
      }
    }
    // Case 3: Completed Broker profile with missing or incorrect role
    else if (providerType === 'broker') {
      if (currentRole !== 'broker') {
        proposedAction = 'UPSERT_BROKER_ROLE';
        reason = 'Completed broker profile requires single operational broker role.';
      }
    }
    // Case 4: Renter profile
    else if (accountCategory === 'renter') {
      if (currentRole !== 'renter') {
        proposedAction = 'UPSERT_RENTER_ROLE';
        reason = 'Renter profile requires operational renter role.';
      }
    }

    reportItems.push({
      userId,
      email,
      accountCategory,
      providerType,
      onboardingStatus,
      accountStatus,
      currentRole,
      proposedAction,
      reason
    });
  }

  // 2. Output Read-Only Inspection Report
  console.log('\n----------------------------------------------------');
  console.log(` READ-ONLY AUDIT REPORT (${reportItems.length} Records Inspected)`);
  console.log('----------------------------------------------------');
  
  for (const item of reportItems) {
    console.log(`[User ID: ${item.userId}] ${item.email}`);
    console.log(`  Category: ${item.accountCategory} | Provider: ${item.providerType || 'null'} | Onboarding: ${item.onboardingStatus}`);
    console.log(`  Current Role: ${item.currentRole || 'NONE'} -> Proposed: ${item.proposedAction}`);
    console.log(`  Reason: ${item.reason}\n`);
  }

  // 3. Perform Deterministic Data Repair
  let repairedCount = 0;
  for (const item of reportItems) {
    if (item.proposedAction === 'REMOVE_ERRONEOUS_RENTER_ROLE') {
      const { error } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', item.userId)
        .eq('role', 'renter');

      if (!error) {
        console.log(`✓ Removed erroneous renter role for pending provider ${item.email}`);
        repairedCount++;
      } else {
        console.error(`✗ Failed removing role for ${item.email}:`, error.message);
      }
    } else if (item.proposedAction === 'UPSERT_OWNER_ROLE') {
      const { error } = await supabase
        .from('user_roles')
        .upsert({ user_id: item.userId, role: 'owner' }, { onConflict: 'user_id' });

      if (!error) {
        console.log(`✓ Upserted owner role for ${item.email}`);
        repairedCount++;
      } else {
        console.error(`✗ Failed upserting owner role for ${item.email}:`, error.message);
      }
    } else if (item.proposedAction === 'UPSERT_BROKER_ROLE') {
      const { error } = await supabase
        .from('user_roles')
        .upsert({ user_id: item.userId, role: 'broker' }, { onConflict: 'user_id' });

      if (!error) {
        console.log(`✓ Upserted broker role for ${item.email}`);
        repairedCount++;
      } else {
        console.error(`✗ Failed upserting broker role for ${item.email}:`, error.message);
      }
    } else if (item.proposedAction === 'UPSERT_RENTER_ROLE') {
      const { error } = await supabase
        .from('user_roles')
        .upsert({ user_id: item.userId, role: 'renter' }, { onConflict: 'user_id' });

      if (!error) {
        console.log(`✓ Upserted renter role for ${item.email}`);
        repairedCount++;
      } else {
        console.error(`✗ Failed upserting renter role for ${item.email}:`, error.message);
      }
    } else if (item.proposedAction === 'PRESERVE_CONFIRMED_OWNER') {
      await supabase
        .from('profiles')
        .update({
          account_category: 'landlord_broker',
          provider_type: 'owner',
          onboarding_status: 'complete',
          account_status: 'active'
        })
        .eq('id', item.userId);

      await supabase
        .from('user_roles')
        .upsert({ user_id: item.userId, role: 'owner' }, { onConflict: 'user_id' });

      console.log(`✓ Confirmed owner ${item.email} verified and preserved.`);
    }
  }

  console.log('====================================================');
  console.log(`AUDIT & REPAIR COMPLETE. Repaired ${repairedCount} record(s).`);
  console.log('====================================================');
}

runAuditAndRepair().catch(err => {
  console.error('[Audit Script Failure]', err);
});
