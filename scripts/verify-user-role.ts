import dotenv from 'dotenv';
dotenv.config();

import { getSupabaseAdminClient, getSupabaseClient } from '../server/db.js';

async function verifyUserRole() {
  const targetUserId = 'c2567a6a-7e53-4aea-9957-1eae3810919a';
  const supabase = getSupabaseAdminClient() || getSupabaseClient();
  
  if (!supabase) {
    console.error('❌ Error: Supabase client unavailable.');
    process.exit(1);
  }

  console.log(`\n================ INSPECTING PRODUCTION USER ${targetUserId} ================`);

  // Query profiles
  const { data: profile, error: pErr } = await supabase
    .from('profiles')
    .select('id, email, full_name, account_category, provider_type, account_status')
    .eq('id', targetUserId)
    .maybeSingle();

  if (pErr) {
    console.error('Error fetching profile:', pErr.message);
  } else {
    console.log('Profile Record:', profile);
  }

  // Query user_roles
  const { data: roles, error: rErr } = await supabase
    .from('user_roles')
    .select('id, user_id, role, created_at')
    .eq('user_id', targetUserId);

  if (rErr) {
    console.error('Error fetching user_roles:', rErr.message);
  } else {
    console.log('User Roles Record(s):', roles);
  }

  if (roles && roles.length === 1 && roles[0].role === 'owner') {
    console.log('\n✅ VERIFICATION CONFIRMED: target user c2567a6a-7e53-4aea-9957-1eae3810919a has exact role = "owner"');
  } else {
    console.error('\n❌ VERIFICATION FAILED: expected role = "owner" in user_roles');
  }

  process.exit(0);
}

verifyUserRole();
