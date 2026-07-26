import { createClient } from '@supabase/supabase-js';

// Environment variable detection for server side
const serverUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const serverServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';

const isServerUrlDetected = !!serverUrl && 
  !serverUrl.includes('placeholder') && 
  !serverUrl.includes('MY_SUPABASE') && 
  !serverUrl.includes('your-supabase');

const isServerKeyDetected = !!serverServiceKey && 
  !serverServiceKey.includes('placeholder') && 
  !serverServiceKey.includes('MY_SUPABASE') && 
  !serverServiceKey.includes('your-supabase');

// Startup logs matching exact requirements
if (isServerUrlDetected) {
  console.log('✓ Supabase URL detected');
}
if (isServerKeyDetected) {
  console.log('✓ Supabase Anon Key detected');
}

if (isServerUrlDetected && isServerKeyDetected) {
  console.log('✓ Connected to Supabase');
} else {
  console.log('✗ Missing Supabase configuration');
}

// Mock storage is ONLY allowed when NODE_ENV === 'development' AND (ALLOW_MOCK_STORAGE === 'true' or VITE_ALLOW_MOCK_STORAGE === 'true')
const isDevEnv = process.env.NODE_ENV === 'development';
const isMockAllowed = process.env.ALLOW_MOCK_STORAGE === 'true' || process.env.VITE_ALLOW_MOCK_STORAGE === 'true';
export const isServerMockActive = isDevEnv && isMockAllowed;

// Lazy-loaded Supabase client
let supabaseClientInstance: any = null;

export function getSupabaseClient() {
  if (supabaseClientInstance !== null) return supabaseClientInstance;

  if (!isServerUrlDetected || !isServerKeyDetected) {
    supabaseClientInstance = null;
    return null;
  }

  try {
    supabaseClientInstance = createClient(serverUrl, serverServiceKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
    return supabaseClientInstance;
  } catch {
    supabaseClientInstance = null;
    return null;
  }
}

export function isSupabaseConnected() {
  return !!getSupabaseClient();
}

// In-memory storage for development mock testing ONLY
const memoryStore = {
  users: [] as any[],
  passwords: {} as Record<string, string>,
  otp_verifications: [] as any[],
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
    if (!supabase) {
      throw new Error('Database Connection Error: Supabase client is not initialized. Please verify SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.');
    }

    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email.trim().toLowerCase())
      .maybeSingle();

    if (error) {
      console.error(`[Supabase Error] getUserByEmail failed for ${email}: ${error.message}`);
      throw error;
    }

    return data;
  },

  async getUserById(id: string) {
    const supabase = getSupabaseClient();
    if (!supabase) {
      throw new Error('Database Connection Error: Supabase client is not initialized.');
    }

    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      console.error(`[Supabase Error] getUserById failed for ${id}: ${error.message}`);
      throw error;
    }

    return data;
  },

  async createUserProfile(profile: {
    id: string;
    email: string;
    name: string;
    phone: string;
    role: string;
    is_verified?: boolean;
    is_subscribed?: boolean;
  }) {
    const supabase = getSupabaseClient();
    if (supabase) {
      const { data, error } = await supabase
        .from('users')
        .upsert({
          ...profile,
          email: profile.email.trim().toLowerCase(),
          is_verified: profile.is_verified ?? false,
          created_at: new Date().toISOString(),
        })
        .select()
        .single();
      if (!error && data) {
        return data;
      }
      console.warn(`[Supabase Notice] createUserProfile write error: ${error?.message}`);
      if (!isServerMockActive && !isTableMissingError(error)) {
        throw new Error(`Failed to write user profile to public.users table: ${error?.message}`);
      }
    }

    const existingIdx = memoryStore.users.findIndex(u => u.id === profile.id);
    const newProfile = {
      ...profile,
      email: profile.email.trim().toLowerCase(),
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

  async updateUserProfile(userId: string, updates: any) {
    const supabase = getSupabaseClient();
    if (supabase) {
      const { data, error } = await supabase
        .from('users')
        .update(updates)
        .eq('id', userId)
        .select()
        .single();
      if (!error && data) {
        return data;
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
      const { error } = await supabase.rpc('increment_otp_attempts', { otp_id: otpId });
      if (error) {
        const { data: record } = await supabase.from('otp_verifications').select('attempt_count').eq('id', otpId).single();
        const nextAttempts = (record?.attempt_count || 0) + 1;
        await supabase.from('otp_verifications').update({ attempt_count: nextAttempts }).eq('id', otpId);
      }
      return;
    }

    if (isServerMockActive) {
      const record = memoryStore.otp_verifications.find(o => o.id === otpId);
      if (record) {
        record.attempt_count += 1;
      }
    }
  },

  async consumeOtpVerification(otpId: string) {
    const supabase = getSupabaseClient();
    const now = new Date().toISOString();
    if (supabase) {
      await supabase
        .from('otp_verifications')
        .update({ consumed_at: now })
        .eq('id', otpId);
      return;
    }

    if (isServerMockActive) {
      const record = memoryStore.otp_verifications.find(o => o.id === otpId);
      if (record) {
        record.consumed_at = now;
      }
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
      if (!isServerMockActive && pError) throw pError;
    }

    if (isServerMockActive) {
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
    }
    return null;
  },

  seedProperty(property: any, owner: any) {
    if (isServerMockActive) {
      if (!memoryStore.properties.some(p => p.id === property.id)) {
        memoryStore.properties.push(property);
      }
      if (!memoryStore.users.some(u => u.id === owner.id)) {
        memoryStore.users.push(owner);
      }
    }
  },
};
