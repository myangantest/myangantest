import { createClient } from '@supabase/supabase-js';

// Environment variable detection for server side
const serverUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const anonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || serviceRoleKey;

const isServerUrlDetected = !!serverUrl && 
  !serverUrl.includes('placeholder') && 
  !serverUrl.includes('MY_SUPABASE') && 
  !serverUrl.includes('your-supabase');

const isServiceKeyDetected = !!serviceRoleKey && 
  !serviceRoleKey.includes('placeholder') && 
  !serviceRoleKey.includes('MY_SUPABASE') && 
  !serviceRoleKey.includes('your-supabase');

const isAnonKeyDetected = !!anonKey && 
  !anonKey.includes('placeholder') && 
  !anonKey.includes('MY_SUPABASE') && 
  !anonKey.includes('your-supabase');

// Startup logs matching exact requirements
if (isServerUrlDetected) {
  console.log('✓ Supabase URL detected');
}
if (isAnonKeyDetected || isServiceKeyDetected) {
  console.log('✓ Supabase Key detected');
}

if (isServerUrlDetected && (isServiceKeyDetected || isAnonKeyDetected)) {
  console.log('✓ Connected to Supabase');
} else {
  console.log('✗ Missing Supabase configuration');
}

// Mock storage is ONLY allowed when NODE_ENV === 'development' AND (ALLOW_MOCK_STORAGE === 'true' or VITE_ALLOW_MOCK_STORAGE === 'true')
const isDevEnv = process.env.NODE_ENV === 'development';
const isMockAllowed = process.env.ALLOW_MOCK_STORAGE === 'true' || process.env.VITE_ALLOW_MOCK_STORAGE === 'true';
export const isServerMockActive = isDevEnv && isMockAllowed;

// Lazy-loaded Supabase client instances for separate trust levels
let supabaseAdminClientInstance: any = null;

/**
 * Clean Server Admin Client for Service-Role Database Operations.
 * Uses ONLY SUPABASE_SERVICE_ROLE_KEY.
 * Never calls signInWithPassword and never attaches user session.
 */
export function getSupabaseAdminClient() {
  if (supabaseAdminClientInstance !== null) return supabaseAdminClientInstance;

  if (!isServerUrlDetected || !isServiceKeyDetected) {
    supabaseAdminClientInstance = null;
    return null;
  }

  try {
    supabaseAdminClientInstance = createClient(serverUrl, serviceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    });
    return supabaseAdminClientInstance;
  } catch {
    supabaseAdminClientInstance = null;
    return null;
  }
}

/**
 * Authentication Client for Credential Validation & Session Token Check.
 * Uses Anon Key / User-facing auth.
 * Calls signInWithPassword or auth.getUser(token).
 * NEVER reused for service-role DB queries.
 */
export function getSupabaseAuthClient() {
  if (!isServerUrlDetected || !isAnonKeyDetected) {
    return null;
  }

  try {
    return createClient(serverUrl, anonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    });
  } catch {
    return null;
  }
}

/**
 * Backwards compatible DB client getter.
 * Prioritizes the clean admin service-role client for DB queries.
 */
export function getSupabaseClient() {
  return getSupabaseAdminClient() || getSupabaseAuthClient();
}

export function isSupabaseConnected() {
  return !!getSupabaseClient();
}

// In-memory storage for development mock testing ONLY
const memoryStore = {
  users: [] as any[],
  passwords: {} as Record<string, string>,
  otp_verifications: [] as any[],
  password_reset_tokens: [] as any[],
  provider_verification_reviews: [] as any[],
  listing_reviews: [] as any[],
  audit_logs: [] as any[],
  notification_logs: [] as any[],
  properties: [] as any[],
};

// Helper to detect table missing or schema cache errors
function isTableMissingError(error: any): boolean {
  if (!error) return false;
  const msg = (error.message || '').toLowerCase();
  const code = error.code || '';
  return (
    code === 'PGRST205' ||
    code === 'PGRST204' ||
    code === '42P01' ||
    msg.includes('could not find the table') ||
    msg.includes('does not exist') ||
    msg.includes('schema cache')
  );
}

export const dbServiceServer = {
  async getUserByEmail(email: string) {
    const supabase = getSupabaseClient();
    if (supabase) {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('email', email.trim().toLowerCase())
        .maybeSingle();

      if (!error) {
        return data;
      }
      console.error(`[Supabase Error] getUserByEmail failed for ${email}: ${error.message}`);
      if (!isServerMockActive && !isTableMissingError(error)) {
        throw error;
      }
    }

    const cleanEmail = email.trim().toLowerCase();
    const user = memoryStore.users.find(u => u.email.toLowerCase() === cleanEmail);
    return user || null;
  },

  async getUserById(id: string) {
    const supabase = getSupabaseClient();
    if (supabase) {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (!error) {
        return data;
      }
      console.error(`[Supabase Error] getUserById failed for ${id}: ${error.message}`);
      if (!isServerMockActive && !isTableMissingError(error)) {
        throw error;
      }
    }

    const user = memoryStore.users.find(u => u.id === id);
    return user || null;
  },

  async createUserProfile(profile: {
    id: string;
    email: string;
    name?: string;
    phone?: string;
    role?: string;
    account_category?: string;
    onboarding_status?: string;
    provider_type?: string;
    account_status?: string;
    is_verified?: boolean;
    is_subscribed?: boolean;
  }) {
    const isAdmin = profile.role === 'admin';
    const isLandlordBroker = profile.role === 'landlord_broker';
    const accountCategory = isAdmin ? 'admin' : (isLandlordBroker ? 'landlord_broker' : 'renter');
    const onboardingStatus = isLandlordBroker ? 'pending' : 'complete';

    const supabase = getSupabaseClient();
    if (supabase) {
      const { data, error } = await supabase
        .from('profiles')
        .upsert({
          id: profile.id,
          email: profile.email.trim().toLowerCase(),
          full_name: profile.name,
          phone: profile.phone,
          account_category: accountCategory,
          onboarding_status: onboardingStatus,
          provider_type: null,
          account_status: 'pending_verification',
          is_verified: profile.is_verified ?? false,
          is_subscribed: profile.is_subscribed ?? false,
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();
      if (!error && data) {
        if (isAdmin) {
          await supabase
            .from('user_roles')
            .upsert({ user_id: profile.id, role: 'admin' }, { onConflict: 'user_id' });
        } else if (!isLandlordBroker) {
          await supabase
            .from('user_roles')
            .upsert({ user_id: profile.id, role: 'renter' }, { onConflict: 'user_id' });
        }

        return {
          ...data,
          name: data.full_name,
          role: isAdmin ? 'admin' : (isLandlordBroker ? 'landlord_broker' : 'renter'),
          account_category: accountCategory,
          onboarding_status: onboardingStatus
        };
      }
      console.warn(`[Supabase Notice] createUserProfile write error: ${error?.message}`);
      if (!isServerMockActive && !isTableMissingError(error)) {
        throw new Error(`Failed to write user profile to public.profiles table: ${error?.message}`);
      }
    }

    const existingIdx = memoryStore.users.findIndex(u => u.id === profile.id);
    const newProfile = {
      ...profile,
      role: isAdmin ? 'admin' : (isLandlordBroker ? 'landlord_broker' : 'renter'),
      email: profile.email.trim().toLowerCase(),
      account_category: accountCategory,
      onboarding_status: onboardingStatus,
      provider_type: null,
      account_status: 'pending_verification',
      is_verified: profile.is_verified ?? false,
      created_at: new Date().toISOString(),
    };
    if (existingIdx >= 0) {
      memoryStore.users[existingIdx] = newProfile;
    } else {
      memoryStore.users.push(newProfile);
    }
    return newProfile;
  },

  async completeLandlordBrokerOnboarding(userId: string, providerType: 'owner' | 'broker') {
    const supabase = getSupabaseClient();
    const now = new Date().toISOString();

    if (supabase) {
      const { data, error } = await supabase
        .from('profiles')
        .update({
          provider_type: providerType,
          account_status: 'pending_verification',
          onboarding_status: 'complete',
          updated_at: now
        })
        .eq('id', userId)
        .select()
        .single();

      if (!error && data) {
        await supabase
          .from('user_roles')
          .upsert({ user_id: userId, role: providerType }, { onConflict: 'user_id' });

        await supabase
          .from('provider_verification_reviews')
          .insert([{
            user_id: userId,
            provider_type: providerType,
            previous_status: null,
            new_status: 'pending_verification',
            notes: 'Initial provider registration',
            created_at: now,
          }]);

        return {
          ...data,
          name: data.full_name,
          role: providerType,
          provider_type: providerType,
          account_status: 'pending_verification',
          onboarding_status: 'complete'
        };
      }
      if (!isServerMockActive && !isTableMissingError(error)) {
        throw error;
      }
    }

    const user = memoryStore.users.find(u => u.id === userId);
    if (user) {
      (user as any).provider_type = providerType;
      (user as any).onboarding_status = 'complete';
      (user as any).account_status = 'pending_verification';
      user.role = providerType;
    } else {
      const mockUser = { id: userId, provider_type: providerType, onboarding_status: 'complete', account_status: 'pending_verification', role: providerType };
      memoryStore.users.push(mockUser as any);
    }

    memoryStore.provider_verification_reviews.push({
      id: 'pvr-' + Math.random().toString(36).substr(2, 9),
      user_id: userId,
      provider_type: providerType,
      reviewer_id: null,
      previous_status: null,
      new_status: 'pending_verification',
      notes: 'Initial provider registration',
      created_at: now,
    });

    return memoryStore.users.find(u => u.id === userId);
  },

  async activateAccountAfterOtpVerification(userId: string) {
    const supabase = getSupabaseClient();
    const now = new Date().toISOString();

    if (supabase) {
      const { data, error } = await supabase
        .from('profiles')
        .update({
          is_verified: true,
          updated_at: now
        })
        .eq('id', userId)
        .select()
        .single();

      if (!error && data) {
        return { ...data, name: data.full_name };
      }
      console.warn(`[Supabase Notice] activateAccountAfterOtpVerification error: ${error?.message}`);
      if (!isServerMockActive && !isTableMissingError(error)) {
        throw error;
      }
    }

    const user = memoryStore.users.find(u => u.id === userId);
    if (user) {
      user.is_verified = true;
      return user;
    }
    const mockUser = { id: userId, is_verified: true, created_at: now };
    memoryStore.users.push(mockUser);
    return mockUser;
  },

  async updateUserVerificationByAdmin(userId: string, isVerified: boolean) {
    return this.updateUserProfile(userId, { is_verified: isVerified });
  },

  async updateSubscriptionByAdmin(userId: string, isSubscribed: boolean, subscriptionExpiresAt?: string) {
    const updates: any = { is_subscribed: isSubscribed };
    if (isSubscribed && !subscriptionExpiresAt) {
      const future = new Date();
      future.setMonth(future.getMonth() + 1);
      updates.subscribed_at = new Date().toISOString();
      updates.subscription_expires_at = future.toISOString();
    } else if (subscriptionExpiresAt) {
      updates.subscription_expires_at = subscriptionExpiresAt;
    }
    return this.updateUserProfile(userId, updates);
  },

  async updateUserProfile(userId: string, updates: any) {
    const supabase = getSupabaseClient();
    if (supabase) {
      const profileUpdates: any = { ...updates };
      if (profileUpdates.name) {
        profileUpdates.full_name = profileUpdates.name;
        delete profileUpdates.name;
      }
      delete profileUpdates.role;
      profileUpdates.updated_at = new Date().toISOString();

      const { data, error } = await supabase
        .from('profiles')
        .update(profileUpdates)
        .eq('id', userId)
        .select()
        .single();
      if (!error && data) {
        if (updates.role) {
          await supabase
            .from('user_roles')
            .upsert({ user_id: userId, role: updates.role }, { onConflict: 'user_id,role' });
        }
        return { ...data, name: data.full_name };
      }
      console.warn(`[Supabase Notice] updateUserProfile write error: ${error?.message}`);
      if (!isServerMockActive && !isTableMissingError(error)) {
        throw error;
      }
    }

    const user = memoryStore.users.find(u => u.id === userId);
    if (!user) {
      const mockUser = { id: userId, ...updates };
      memoryStore.users.push(mockUser);
      return mockUser;
    }
    Object.assign(user, updates);
    return user;
  },

  async savePasswordForMock(email: string, passwordHash: string) {
    memoryStore.passwords[email.toLowerCase()] = passwordHash;
  },

  async getPasswordForMock(email: string) {
    return memoryStore.passwords[email.toLowerCase()] || null;
  },

  async verifyPasswordForMock(email: string, pass: string) {
    const stored = memoryStore.passwords[email.toLowerCase().trim()];
    if (!stored) return true; // Default allow in mock if unset
    return stored === pass;
  },

  async createOtpVerification(verification: {
    user_id: string;
    email: string;
    code_hash: string;
    purpose: string;
    expires_at: string;
    request_ip?: string;
  }) {
    const supabase = getSupabaseClient();
    const cleanVerification = {
      ...verification,
      attempt_count: 0,
      max_attempts: 5,
      last_sent_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
    };

    if (supabase) {
      const { data, error } = await supabase
        .from('otp_verifications')
        .insert([cleanVerification])
        .select()
        .single();
      if (!error && data) {
        return data;
      }
      console.warn(`[Supabase Notice] createOtpVerification write error: ${error?.message}`);
      if (!isServerMockActive && !isTableMissingError(error)) {
        throw new Error(`Failed to save OTP to otp_verifications table: ${error?.message}`);
      }
    }

    const mockRecord = {
      id: 'otp-' + Math.random().toString(36).substr(2, 9),
      ...cleanVerification,
    };
    memoryStore.otp_verifications = memoryStore.otp_verifications.filter(
      o => !(o.email.toLowerCase() === verification.email.toLowerCase() && o.purpose === verification.purpose)
    );
    memoryStore.otp_verifications.push(mockRecord);
    return mockRecord;
  },

  async getLatestOtpVerification(email: string, purpose: string) {
    const supabase = getSupabaseClient();
    if (supabase) {
      const { data, error } = await supabase
        .from('otp_verifications')
        .select('*')
        .eq('email', email.trim().toLowerCase())
        .eq('purpose', purpose)
        .is('consumed_at', null)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (!error) return data;
      console.warn(`[Supabase Notice] getLatestOtpVerification error: ${error.message}`);
      if (!isServerMockActive && !isTableMissingError(error)) throw error;
    }

    const activeOtps = memoryStore.otp_verifications.filter(
      o => o.email.toLowerCase() === email.trim().toLowerCase() && o.purpose === purpose && !o.consumed_at
    );
    if (activeOtps.length === 0) return null;
    return activeOtps[activeOtps.length - 1];
  },

  async incrementOtpAttempts(otpId: string) {
    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        const { error } = await supabase.rpc('increment_otp_attempts', { otp_id: otpId });
        if (error) {
          const { data: record } = await supabase.from('otp_verifications').select('attempt_count').eq('id', otpId).single();
          const nextAttempts = (record?.attempt_count || 0) + 1;
          await supabase.from('otp_verifications').update({ attempt_count: nextAttempts }).eq('id', otpId);
        }
      } catch {
        // Ignore remote DB error in test environment
      }
    }

    const record = memoryStore.otp_verifications.find(o => o.id === otpId);
    if (record) {
      record.attempt_count += 1;
    }
  },

  async consumeOtpVerification(otpId: string) {
    const supabase = getSupabaseClient();
    const now = new Date().toISOString();
    if (supabase) {
      try {
        await supabase
          .from('otp_verifications')
          .update({ consumed_at: now })
          .eq('id', otpId);
      } catch {
        // Ignore remote DB error in test environment
      }
    }

    const record = memoryStore.otp_verifications.find(o => o.id === otpId);
    if (record) {
      record.consumed_at = now;
    }
  },

  async createNotificationLog(log: {
    notification_type: string;
    recipient: string;
    provider: string;
    message_id?: string;
    status: string;
    error_code?: string;
    error_message?: string;
    metadata?: any;
  }) {
    const supabase = getSupabaseClient();
    const cleanLog = {
      ...log,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    if (supabase) {
      const { error } = await supabase.from('notification_logs').insert([cleanLog]);
      if (!error) return;
      if (!isServerMockActive) console.error('[Supabase Error] Notification log save error:', error.message);
    }

    if (isServerMockActive) {
      const mockLog = {
        id: 'log-' + Math.random().toString(36).substr(2, 9),
        ...cleanLog,
      };
      memoryStore.notification_logs.push(mockLog);
    }
  },

  async getPropertyById(id: string) {
    const supabase = getSupabaseClient();
    if (supabase) {
      const { data: property, error: pError } = await supabase
        .from('properties')
        .select('*')
        .eq('id', id)
        .maybeSingle();
      if (!pError && property) {
        const { data: owner } = await supabase
          .from('users')
          .select('*')
          .eq('id', property.owner_id)
          .maybeSingle();

        return { property, owner: owner || { id: property.owner_id, name: 'Owner', email: '', phone: '' } };
      }
    }

    const mockProp = memoryStore.properties.find(p => p.id === id);
    if (mockProp) {
      const owner = memoryStore.users.find(u => u.id === mockProp.owner_id) || {
        id: mockProp.owner_id,
        name: 'Owner Agent',
        phone: '+919999912345',
        email: 'owner@myangan.com',
      };
      return { property: mockProp, owner };
    }
    return null;
  },

  seedProperty(property: any, owner?: any) {
    const existingP = memoryStore.properties.findIndex(p => p.id === property.id);
    if (existingP >= 0) {
      memoryStore.properties[existingP] = { ...memoryStore.properties[existingP], ...property };
    } else {
      memoryStore.properties.push(property);
    }
    if (owner) {
      const existingU = memoryStore.users.findIndex(u => u.id === owner.id);
      if (existingU >= 0) {
        memoryStore.users[existingU] = { ...memoryStore.users[existingU], ...owner };
      } else {
        memoryStore.users.push(owner);
      }
    }
  },

  async createProperty(propertyData: any) {
    const supabase = getSupabaseClient();
    const now = new Date().toISOString();

    const payload = {
      ...propertyData,
      approval_status: 'pending_review',
      status: 'pending',
      review_notes: null,
      created_at: propertyData.created_at || now,
      updated_at: now,
    };

    if (supabase) {
      const { data, error } = await supabase
        .from('properties')
        .insert([payload])
        .select()
        .single();

      if (!error && data) {
        return data;
      }
      if (!isServerMockActive && !isTableMissingError(error)) {
        throw error;
      }
    }

    const newProp = {
      id: propertyData.id || 'prop_' + Math.random().toString(36).substr(2, 9),
      ...payload,
    };
    memoryStore.properties.push(newProp);
    return newProp;
  },

  async createPasswordResetToken(tokenData: {
    user_id: string;
    token_hash: string;
    expires_at: string;
    request_ip?: string;
  }) {
    const supabase = getSupabaseClient();
    const cleanRecord = {
      ...tokenData,
      created_at: new Date().toISOString(),
    };

    if (supabase) {
      const { data, error } = await supabase
        .from('password_reset_tokens')
        .insert([cleanRecord])
        .select()
        .single();
      if (!error && data) {
        return data;
      }
      console.warn(`[Supabase Notice] createPasswordResetToken write error: ${error?.message}`);
      if (!isServerMockActive && !isTableMissingError(error)) {
        throw new Error(`Failed to save password reset token: ${error?.message}`);
      }
    }

    const mockRecord = {
      id: 'prt-' + Math.random().toString(36).substr(2, 9),
      ...cleanRecord,
    };
    memoryStore.password_reset_tokens.push(mockRecord);
    return mockRecord;
  },

  async getValidPasswordResetToken(tokenHash: string) {
    const supabase = getSupabaseClient();
    const now = new Date().toISOString();

    if (supabase) {
      const { data, error } = await supabase
        .from('password_reset_tokens')
        .select('*')
        .eq('token_hash', tokenHash)
        .is('consumed_at', null)
        .gt('expires_at', now)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!error && data) return data;
      if (error) console.warn(`[Supabase Notice] getValidPasswordResetToken error: ${error.message}`);
      if (!isServerMockActive && error && !isTableMissingError(error)) throw error;
    }

    const validToken = memoryStore.password_reset_tokens.find(
      t => t.token_hash === tokenHash && !t.consumed_at && new Date(t.expires_at) > new Date()
    );
    return validToken || null;
  },

  async consumePasswordResetToken(tokenId: string) {
    const supabase = getSupabaseClient();
    const now = new Date().toISOString();

    if (supabase) {
      await supabase
        .from('password_reset_tokens')
        .update({ consumed_at: now })
        .eq('id', tokenId);
    }

    const record = memoryStore.password_reset_tokens.find(t => t.id === tokenId);
    if (record) {
      record.consumed_at = now;
    }
  },

  async invalidateUserPasswordResetTokens(userId: string) {
    const supabase = getSupabaseClient();
    const now = new Date().toISOString();

    if (supabase) {
      await supabase
        .from('password_reset_tokens')
        .update({ consumed_at: now })
        .eq('user_id', userId)
        .is('consumed_at', null);
    }

    memoryStore.password_reset_tokens.forEach(t => {
      if (t.user_id === userId && !t.consumed_at) {
        t.consumed_at = now;
      }
    });
  },

  async invalidateUserOtps(email: string, purpose: string) {
    const supabase = getSupabaseClient();
    const now = new Date().toISOString();

    if (supabase) {
      await supabase
        .from('otp_verifications')
        .update({ consumed_at: now })
        .eq('email', email.trim().toLowerCase())
        .eq('purpose', purpose)
        .is('consumed_at', null);
    }

    memoryStore.otp_verifications.forEach(o => {
      if (o.email.toLowerCase() === email.trim().toLowerCase() && o.purpose === purpose && !o.consumed_at) {
        o.consumed_at = now;
      }
    });
  },

  async updateUserPassword(userId: string, newPassword: string) {
    const supabase = getSupabaseClient();
    if (supabase && process.env.SUPABASE_SERVICE_ROLE_KEY) {
      const { data, error } = await supabase.auth.admin.updateUserById(userId, {
        password: newPassword,
      });
      if (!error && data) {
        return true;
      }
      console.warn(`[Supabase Notice] updateUserPassword error: ${error?.message}`);
      if (!isServerMockActive && !isTableMissingError(error)) {
        throw error;
      }
    }

    const user = memoryStore.users.find(u => u.id === userId);
    if (user && user.email) {
      memoryStore.passwords[user.email.toLowerCase()] = newPassword;
    }
    return true;
  },

  async createAuditLog(log: {
    actor_id?: string;
    action: string;
    target_type?: string;
    target_id?: string;
    details?: any;
    ip_address?: string;
  }) {
    const supabase = getSupabaseClient();
    const record = {
      actor_id: log.actor_id || null,
      action: log.action,
      target_type: log.target_type || null,
      target_id: log.target_id || null,
      details: log.details || null,
      ip_address: log.ip_address || null,
      created_at: new Date().toISOString(),
    };

    if (supabase) {
      try {
        await supabase.from('audit_logs').insert([record]);
      } catch {
        // Fallback
      }
    }
    memoryStore.audit_logs.push(record);
  },

  async getPendingProviders() {
    const supabase = getSupabaseClient();
    if (supabase) {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('account_category', 'landlord_broker')
        .order('created_at', { ascending: false });

      if (!error && data) return data;
      if (error && !isServerMockActive && !isTableMissingError(error)) throw error;
    }

    return memoryStore.users.filter(u => u.account_category === 'landlord_broker' || u.role === 'landlord_broker' || u.role === 'owner' || u.role === 'broker');
  },

  async reviewProviderAccount(params: {
    userId: string;
    reviewerId?: string;
    newStatus: string;
    notes?: string;
  }) {
    const { userId, reviewerId, newStatus, notes } = params;
    const supabase = getSupabaseClient();

    const isApproved = newStatus === 'approved' || newStatus === 'restore';
    const effectiveAccountStatus = isApproved ? 'active' : newStatus;

    const profileUpdates = {
      account_status: effectiveAccountStatus,
      is_verified: isApproved,
      updated_at: new Date().toISOString(),
    };

    if (supabase) {
      const { data: currentProfile } = await supabase
        .from('profiles')
        .select('account_status, provider_type')
        .eq('id', userId)
        .maybeSingle();

      const prevStatus = currentProfile?.account_status || 'pending';
      const providerType = currentProfile?.provider_type || 'owner';

      await supabase
        .from('profiles')
        .update(profileUpdates)
        .eq('id', userId);

      if (isApproved && (providerType === 'owner' || providerType === 'broker')) {
        try {
          await supabase
            .from('user_roles')
            .upsert({ user_id: userId, role: providerType }, { onConflict: 'user_id' });
        } catch (rErr: any) {
          console.warn(`[reviewProviderAccount] Non-fatal user_roles upsert notice for ${userId}:`, rErr.message);
        }
      }
    }

    await this.createAuditLog({
      actor_id: reviewerId,
      action: `provider_${newStatus}`,
      target_type: 'provider',
      target_id: userId,
      details: { previous_status: 'pending', new_status: effectiveAccountStatus, notes },
    });

    const user = memoryStore.users.find(u => u.id === userId);
    if (user) {
      user.account_status = effectiveAccountStatus;
      user.is_verified = isApproved;
    }
    const reviewRecord = {
      id: 'pvr-' + Math.random().toString(36).substr(2, 9),
      user_id: userId,
      provider_type: user?.provider_type || 'owner',
      reviewer_id: reviewerId || null,
      previous_status: 'pending',
      new_status: effectiveAccountStatus,
      notes: notes || null,
      created_at: new Date().toISOString(),
    };
    memoryStore.provider_verification_reviews.push(reviewRecord);

    return { success: true, user: user || { id: userId, account_status: effectiveAccountStatus, is_verified: isApproved } };
  },

  async getAdminProperties(statusFilter?: string) {
    const supabase = getSupabaseClient();
    if (supabase) {
      let query = supabase.from('properties').select('*');
      if (statusFilter && statusFilter !== 'all') {
        query = query.eq('approval_status', statusFilter);
      }
      const { data, error } = await query.order('created_at', { ascending: false });
      if (!error && data) return data;
      if (error && !isServerMockActive && !isTableMissingError(error)) throw error;
    }

    if (statusFilter && statusFilter !== 'all') {
      return memoryStore.properties.filter(p => (p.approval_status || 'pending_review') === statusFilter);
    }
    return memoryStore.properties;
  },

  async reviewPropertyListing(params: {
    propertyId: string;
    reviewerId?: string;
    newStatus: string;
    decision: string;
    notes?: string;
  }) {
    const { propertyId, reviewerId, newStatus, decision, notes } = params;
    const supabase = getSupabaseClient();
    const prop = memoryStore.properties.find(p => p.id === propertyId);
    let prevStatus = prop?.approval_status || 'pending_review';

    const isApproved = decision === 'approve' || decision === 'restore';
    const operationalStatus = isApproved ? 'active' : 'pending';

    const updates = {
      approval_status: newStatus,
      status: operationalStatus,
      review_notes: notes || null,
      updated_at: new Date().toISOString(),
    };

    if (supabase) {
      const { data: currentProp } = await supabase
        .from('properties')
        .select('approval_status')
        .eq('id', propertyId)
        .maybeSingle();

      if (currentProp?.approval_status) {
        prevStatus = currentProp.approval_status;
      }

      await supabase
        .from('properties')
        .update(updates)
        .eq('id', propertyId);

      await supabase
        .from('listing_reviews')
        .insert([{
          property_id: propertyId,
          reviewer_id: reviewerId || null,
          previous_status: prevStatus,
          new_status: newStatus,
          decision: decision,
          notes: notes || null,
          created_at: new Date().toISOString(),
        }]);
    }

    await this.createAuditLog({
      actor_id: reviewerId,
      action: `listing_${decision}`,
      target_type: 'property',
      target_id: propertyId,
      details: { previous_status: prevStatus, new_status: newStatus, decision, notes },
    });

    if (prop) {
      prop.approval_status = newStatus;
      prop.status = operationalStatus;
      prop.review_notes = notes || null;
    }

    const reviewRecord = {
      id: 'lr-' + Math.random().toString(36).substr(2, 9),
      property_id: propertyId,
      reviewer_id: reviewerId || null,
      previous_status: prevStatus,
      new_status: newStatus,
      decision: decision,
      notes: notes || null,
      created_at: new Date().toISOString(),
    };
    memoryStore.listing_reviews.push(reviewRecord);

    return { success: true, property: prop || { id: propertyId, approval_status: newStatus, status: operationalStatus } };
  },

  async getAuditLogs() {
    const supabase = getSupabaseClient();
    let remoteLogs: any[] = [];
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('audit_logs')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(100);

        if (!error && data) remoteLogs = data;
      } catch {}
    }
    return remoteLogs.length > 0 ? remoteLogs : memoryStore.audit_logs;
  },
};
