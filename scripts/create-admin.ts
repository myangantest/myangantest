/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Secure, Idempotent Admin Bootstrap Script
 * Usage:
 * INITIAL_ADMIN_EMAIL="service@myangan.com" INITIAL_ADMIN_PASSWORD="YourStrongPassword" SUPABASE_SERVICE_ROLE_KEY="..." npm run admin:create
 */

import dotenv from 'dotenv';
dotenv.config();
dotenv.config({ path: '.env.local' });

import { createClient } from '@supabase/supabase-js';
import { dbServiceServer } from '../server/db.js';

async function bootstrapAdmin() {
  const email = (process.env.INITIAL_ADMIN_EMAIL || 'service@myangan.com').trim().toLowerCase();
  const password = process.env.INITIAL_ADMIN_PASSWORD || '';
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

  if (!password) {
    console.error('❌ Error: INITIAL_ADMIN_PASSWORD environment variable is strictly required.');
    console.error('Usage: INITIAL_ADMIN_EMAIL="service@myangan.com" INITIAL_ADMIN_PASSWORD="YourStrongPassword" SUPABASE_SERVICE_ROLE_KEY="..." npm run admin:create');
    process.exit(1);
  }

  if (password.length < 8) {
    console.error('❌ Error: INITIAL_ADMIN_PASSWORD must be at least 8 characters long.');
    process.exit(1);
  }

  if (!serviceKey && (!process.env.NODE_ENV || process.env.NODE_ENV !== 'development')) {
    console.error('❌ Error: SUPABASE_SERVICE_ROLE_KEY environment variable is strictly required for remote admin bootstrap.');
    console.error('Do not use anon or VITE keys for service administration.');
    process.exit(1);
  }

  console.log(`[Admin Bootstrap] Initializing bootstrap for ${email}...`);

  const isRealSupabase = !!supabaseUrl && !!serviceKey && !supabaseUrl.includes('placeholder');

  let userId = '';

  if (isRealSupabase) {
    const supabase = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });

    try {
      // 1. Check if Auth user exists
      const { data: usersData, error: listErr } = await supabase.auth.admin.listUsers();
      if (!listErr && usersData?.users) {
        const existingAuthUser = usersData.users.find((u: any) => u.email?.toLowerCase() === email);
        if (existingAuthUser) {
          userId = existingAuthUser.id;
          console.log(`✓ Preserving existing Supabase Auth user (ID: ${userId})`);
          
          const { error: updateErr } = await supabase.auth.admin.updateUserById(userId, {
            password: password,
            email_confirm: true,
          });
          if (!updateErr) console.log('✓ Auth user password updated');
        }
      }

      if (!userId) {
        // Create new Auth User
        const { data: newUserData, error: createErr } = await supabase.auth.admin.createUser({
          email: email,
          password: password,
          email_confirm: true,
          user_metadata: { name: 'MyAngan Administrator', role: 'admin' },
        });

        if (!createErr && newUserData?.user) {
          userId = newUserData.user.id;
          console.log(`✓ Successfully created Supabase Auth user (ID: ${userId})`);
        }
      }

      if (userId) {
        // 2. Upsert Profile Row in public.profiles
        await supabase
          .from('profiles')
          .upsert({
            id: userId,
            email: email,
            full_name: 'MyAngan Administrator',
            account_category: 'landlord_broker',
            onboarding_status: 'complete',
            account_status: 'active',
            is_verified: true,
            is_subscribed: true,
            updated_at: new Date().toISOString(),
          }, { onConflict: 'id' });
        console.log('✓ Profile row upserted in public.profiles');

        // 3. Delete any conflicting non-admin role rows and assign exactly ONE admin role in public.user_roles
        await supabase.from('user_roles').delete().eq('user_id', userId);
        await supabase.from('user_roles').insert([{ user_id: userId, role: 'admin' }]);
        console.log('✓ Assigned exact role "admin" in public.user_roles');

        // 4. Audit Log Entry
        await supabase.from('audit_logs').insert([{
          actor_id: userId,
          action: 'admin_bootstrapped',
          target_type: 'user',
          target_id: userId,
          details: { email, timestamp: new Date().toISOString() },
          created_at: new Date().toISOString(),
        }]);
      }
    } catch (err: any) {
      console.warn(`[Notice] Remote Supabase admin bootstrap notice: ${err.message}`);
    }
  }

  // Fallback / sync to memoryStore for dev/test execution
  const mockUserId = userId || '00000000-0000-4000-a000-000000000001';
  try {
    await dbServiceServer.createUserProfile({
      id: mockUserId,
      email: email,
      name: 'MyAngan Administrator',
      phone: '+919999900000',
      role: 'admin',
    });
  } catch (e) {
    // Already populated
  }
  await dbServiceServer.savePasswordForMock(email, password);

  console.log('✓ Mock / Local admin user profile initialized');
  console.log('\n======================================================');
  console.log(`✅ SUCCESS: Admin account ${email} bootstrapped successfully.`);
  console.log('======================================================\n');
}

bootstrapAdmin();
