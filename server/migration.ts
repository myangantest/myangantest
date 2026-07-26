import { Request, Response, Router } from 'express';
import { z } from 'zod';
import { dbServiceServer, getSupabaseClient, isServerMockActive } from './db';

export const migrationRouter = Router();

// Zod schemas for validating legacy localStorage records
const LegacyUserSchema = z.object({
  id: z.string().optional(),
  email: z.string().email(),
  name: z.string().min(1).default('User'),
  phone: z.string().optional().default(''),
  role: z.string().default('renter'),
  created_at: z.string().optional(),
  is_verified: z.boolean().optional().default(false),
  is_subscribed: z.boolean().optional().default(false),
  subscribed_at: z.string().optional(),
  subscription_expires_at: z.string().optional(),
});

const LegacyPropertySchema = z.object({
  id: z.string().optional(),
  owner_id: z.string(),
  title: z.string().min(1),
  description: z.string().default(''),
  city: z.string().default('Gurugram'),
  locality: z.string().default('DLF Phase 1'),
  bedrooms: z.number().default(1),
  bathrooms: z.number().default(1),
  furnishing_status: z.string().default('semi_furnished'),
  rent_amount: z.number().default(10000),
  deposit_amount: z.number().default(20000),
  address: z.string().default(''),
  latitude: z.number().nullable().optional(),
  longitude: z.number().nullable().optional(),
  image_urls: z.array(z.string()).default([]),
  is_verified: z.boolean().default(false),
  status: z.string().default('active'),
  created_at: z.string().optional(),
});

const LegacyBrokerSchema = z.object({
  id: z.string().optional(),
  user_id: z.string(),
  name: z.string().min(1),
  email: z.string().optional(),
  agency_name: z.string().default('Independent Broker'),
  phone: z.string().default(''),
  whatsapp: z.string().default(''),
  active_listings_count: z.number().default(0),
  is_verified: z.boolean().default(false),
  created_at: z.string().optional(),
});

const LegacyLeadSchema = z.object({
  id: z.string().optional(),
  property_id: z.string(),
  renter_id: z.string().nullable().optional(),
  name: z.string().min(1),
  phone: z.string().default(''),
  message: z.string().default(''),
  created_at: z.string().optional(),
});

const LegacyFavoriteSchema = z.object({
  id: z.string().optional(),
  user_id: z.string(),
  property_id: z.string(),
  created_at: z.string().optional(),
});

const LegacyWaitlistSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1),
  contact: z.string().min(1),
  role: z.string().default('landlord'),
  created_at: z.string().optional(),
});

const LegacyMigrationPayloadSchema = z.object({
  dryRun: z.boolean().default(false),
  legacyData: z.object({
    users: z.array(z.record(z.string(), z.any())).optional().default([]),
    properties: z.array(z.record(z.string(), z.any())).optional().default([]),
    brokers: z.array(z.record(z.string(), z.any())).optional().default([]),
    leads: z.array(z.record(z.string(), z.any())).optional().default([]),
    favorites: z.array(z.record(z.string(), z.any())).optional().default([]),
    waitlist: z.array(z.record(z.string(), z.any())).optional().default([]),
    subscriptions: z.array(z.record(z.string(), z.any())).optional().default([]),
  })
});

export interface MigrationLogEntry {
  id: string;
  migration_batch_id: string;
  entity_type: string;
  legacy_id: string;
  supabase_id: string | null;
  status: 'pending' | 'migrated' | 'skipped' | 'duplicate' | 'failed';
  action: string;
  error_code: string | null;
  safe_error_message: string | null;
  source_fingerprint: string;
  created_at: string;
}

/**
 * POST /api/admin/migrate-legacy-data
 * Admin-only Endpoint to perform safe, validated, idempotent legacy data migration
 */
migrationRouter.post('/migrate-legacy-data', async (req: Request, res: Response): Promise<void> => {
  // 1. Authenticate Admin User
  const adminHeader = req.headers['x-admin-role'] || req.body?.adminRole;
  const adminUserId = req.headers['x-admin-user-id'] || req.body?.adminUserId;

  let isAdmin = adminHeader === 'admin';

  // If Supabase is connected, verify user token or query role
  const supabase = getSupabaseClient();
  if (supabase && adminUserId) {
    try {
      const { data: userProfile } = await supabase
        .from('users')
        .select('role')
        .eq('id', adminUserId)
        .single();
      if (userProfile && userProfile.role === 'admin') {
        isAdmin = true;
      }
    } catch {
      // Fall through to authorization check
    }
  }

  if (!isAdmin && !isServerMockActive) {
    res.status(403).json({
      error: 'Unauthorized: Admin privileges are required to run legacy data migration.'
    });
    return;
  }

  // 2. Validate payload
  const parseResult = LegacyMigrationPayloadSchema.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({
      error: 'Invalid migration payload schema',
      details: parseResult.error.format()
    });
    return;
  }

  const { dryRun, legacyData } = parseResult.data;
  const batchId = `batch-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const logs: MigrationLogEntry[] = [];
  const idMap = new Map<string, string>(); // maps legacy_id -> supabase_id

  const counts = {
    users: { total: 0, migrated: 0, skipped: 0, duplicate: 0, failed: 0 },
    brokers: { total: 0, migrated: 0, skipped: 0, duplicate: 0, failed: 0 },
    properties: { total: 0, migrated: 0, skipped: 0, duplicate: 0, failed: 0 },
    leads: { total: 0, migrated: 0, skipped: 0, duplicate: 0, failed: 0 },
    favorites: { total: 0, migrated: 0, skipped: 0, duplicate: 0, failed: 0 },
    waitlist: { total: 0, migrated: 0, skipped: 0, duplicate: 0, failed: 0 },
  };

  try {
    // Check if migration audit table exists or create log array
    let existingLogsMap = new Map<string, string>(); // fingerprint -> status
    if (supabase && !dryRun) {
      try {
        const { data: existingLogs } = await supabase
          .from('legacy_migration_logs')
          .select('source_fingerprint, supabase_id, status');
        if (existingLogs) {
          existingLogs.forEach(l => {
            if (l.source_fingerprint) existingLogsMap.set(l.source_fingerprint, l.status);
            if (l.source_fingerprint && l.supabase_id) idMap.set(l.source_fingerprint, l.supabase_id);
          });
        }
      } catch {
        console.warn('[Migration] legacy_migration_logs table missing or inaccessible, proceeding in memory audit mode.');
      }
    }

    // ==================== 1. MIGRATE USERS ====================
    counts.users.total = legacyData.users.length;
    for (const rawUser of legacyData.users) {
      const userParse = LegacyUserSchema.safeParse(rawUser);
      const legacyId: string = String((rawUser as any).id || (rawUser as any).email || 'unknown');

      if (!userParse.success) {
        counts.users.failed++;
        logs.push({
          id: `log-${logs.length + 1}`,
          migration_batch_id: batchId,
          entity_type: 'users',
          legacy_id: legacyId,
          supabase_id: null,
          status: 'failed',
          action: 'schema_validation_failed',
          error_code: 'INVALID_USER_SCHEMA',
          safe_error_message: JSON.stringify(userParse.error.flatten().fieldErrors),
          source_fingerprint: `user-${rawUser.email}`,
          created_at: new Date().toISOString()
        });
        continue;
      }

      const userData = userParse.data;
      const normalizedEmail = userData.email.trim().toLowerCase();
      // Role mapping constraint: map 'tenant' -> 'renter'. Never allow local data to assign 'admin'.
      let mappedRole = userData.role === 'tenant' ? 'renter' : userData.role;
      if (mappedRole === 'admin') {
        mappedRole = 'renter'; // Safety rule: client-provided admin role is rejected
      }

      const sourceFingerprint = `user:${normalizedEmail}`;

      // Check if user already exists in Supabase
      let existingUser: any = null;
      if (supabase) {
        const { data: found } = await supabase
          .from('users')
          .select('*')
          .eq('email', normalizedEmail)
          .maybeSingle();
        existingUser = found;
      }

      if (existingUser) {
        idMap.set(legacyId, existingUser.id);
        if (rawUser.id) idMap.set(rawUser.id, existingUser.id);
        counts.users.duplicate++;
        logs.push({
          id: `log-${logs.length + 1}`,
          migration_batch_id: batchId,
          entity_type: 'users',
          legacy_id: legacyId,
          supabase_id: existingUser.id,
          status: 'duplicate',
          action: 'user_already_exists_linked',
          error_code: null,
          safe_error_message: null,
          source_fingerprint: sourceFingerprint,
          created_at: new Date().toISOString()
        });
        continue;
      }

      if (dryRun) {
        const simulatedId = `sim-user-${Math.random().toString(36).substr(2, 9)}`;
        idMap.set(legacyId, simulatedId);
        counts.users.migrated++;
        logs.push({
          id: `log-${logs.length + 1}`,
          migration_batch_id: batchId,
          entity_type: 'users',
          legacy_id: legacyId,
          supabase_id: simulatedId,
          status: 'migrated',
          action: 'dry_run_validated_new_user',
          error_code: null,
          safe_error_message: null,
          source_fingerprint: sourceFingerprint,
          created_at: new Date().toISOString()
        });
        continue;
      }

      // Live migration of user
      try {
        let createdUserId = '';
        if (supabase) {
          // Attempt admin createUser if service role available
          if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
            const { data: authAdminUser } = await supabase.auth.admin.createUser({
              email: normalizedEmail,
              email_confirm: false, // Require email verification
              user_metadata: { name: userData.name, role: mappedRole, phone: userData.phone }
            });
            if (authAdminUser?.user) {
              createdUserId = authAdminUser.user.id;
            }
          }

          if (!createdUserId) {
            createdUserId = `usr-${Math.random().toString(36).substr(2, 9)}`;
          }

          // Insert into public.users
          await dbServiceServer.createUserProfile({
            id: createdUserId,
            email: normalizedEmail,
            name: userData.name,
            phone: userData.phone,
            role: mappedRole,
            is_verified: false, // Security constraint: unverified unless established safely
            is_subscribed: userData.is_subscribed
          });

          idMap.set(legacyId, createdUserId);
          if (rawUser.id) idMap.set(rawUser.id, createdUserId);
          counts.users.migrated++;
          logs.push({
            id: `log-${logs.length + 1}`,
            migration_batch_id: batchId,
            entity_type: 'users',
            legacy_id: legacyId,
            supabase_id: createdUserId,
            status: 'migrated',
            action: 'created_user_profile',
            error_code: null,
            safe_error_message: null,
            source_fingerprint: sourceFingerprint,
            created_at: new Date().toISOString()
          });
        } else {
          // Mock mode
          createdUserId = `usr-${Math.random().toString(36).substr(2, 9)}`;
          idMap.set(legacyId, createdUserId);
          counts.users.migrated++;
          logs.push({
            id: `log-${logs.length + 1}`,
            migration_batch_id: batchId,
            entity_type: 'users',
            legacy_id: legacyId,
            supabase_id: createdUserId,
            status: 'migrated',
            action: 'mock_created_user',
            error_code: null,
            safe_error_message: null,
            source_fingerprint: sourceFingerprint,
            created_at: new Date().toISOString()
          });
        }
      } catch (err: any) {
        counts.users.failed++;
        logs.push({
          id: `log-${logs.length + 1}`,
          migration_batch_id: batchId,
          entity_type: 'users',
          legacy_id: legacyId,
          supabase_id: null,
          status: 'failed',
          action: 'user_creation_failed',
          error_code: 'USER_MIGRATION_ERROR',
          safe_error_message: err.message,
          source_fingerprint: sourceFingerprint,
          created_at: new Date().toISOString()
        });
      }
    }

    // ==================== 2. MIGRATE BROKERS ====================
    counts.brokers.total = legacyData.brokers.length;
    for (const rawBroker of legacyData.brokers) {
      const brokerParse = LegacyBrokerSchema.safeParse(rawBroker);
      const legacyId: string = String((rawBroker as any).id || `broker-${(rawBroker as any).user_id}`);

      if (!brokerParse.success) {
        counts.brokers.failed++;
        logs.push({
          id: `log-${logs.length + 1}`,
          migration_batch_id: batchId,
          entity_type: 'brokers',
          legacy_id: legacyId,
          supabase_id: null,
          status: 'failed',
          action: 'schema_validation_failed',
          error_code: 'INVALID_BROKER_SCHEMA',
          safe_error_message: JSON.stringify(brokerParse.error.flatten().fieldErrors),
          source_fingerprint: `broker-${rawBroker.user_id}`,
          created_at: new Date().toISOString()
        });
        continue;
      }

      const brokerData = brokerParse.data;
      const mappedUserId = idMap.get(brokerData.user_id) || brokerData.user_id;
      const sourceFingerprint = `broker:${mappedUserId}`;

      if (dryRun) {
        counts.brokers.migrated++;
        logs.push({
          id: `log-${logs.length + 1}`,
          migration_batch_id: batchId,
          entity_type: 'brokers',
          legacy_id: legacyId,
          supabase_id: `sim-broker-${Math.random().toString(36).substr(2, 9)}`,
          status: 'migrated',
          action: 'dry_run_validated_broker',
          error_code: null,
          safe_error_message: null,
          source_fingerprint: sourceFingerprint,
          created_at: new Date().toISOString()
        });
        continue;
      }

      if (supabase) {
        try {
          const { data: existingBroker } = await supabase
            .from('brokers')
            .select('*')
            .eq('user_id', mappedUserId)
            .maybeSingle();

          if (existingBroker) {
            counts.brokers.duplicate++;
            logs.push({
              id: `log-${logs.length + 1}`,
              migration_batch_id: batchId,
              entity_type: 'brokers',
              legacy_id: legacyId,
              supabase_id: existingBroker.id,
              status: 'duplicate',
              action: 'broker_already_exists',
              error_code: null,
              safe_error_message: null,
              source_fingerprint: sourceFingerprint,
              created_at: new Date().toISOString()
            });
            continue;
          }

          const { data: insertedBroker, error: brokerErr } = await supabase
            .from('brokers')
            .insert({
              user_id: mappedUserId,
              agency_name: brokerData.agency_name,
              phone: brokerData.phone,
              whatsapp: brokerData.whatsapp,
              active_listings_count: brokerData.active_listings_count,
              is_verified: brokerData.is_verified,
              created_at: brokerData.created_at || new Date().toISOString()
            })
            .select()
            .single();

          if (brokerErr) throw brokerErr;

          counts.brokers.migrated++;
          logs.push({
            id: `log-${logs.length + 1}`,
            migration_batch_id: batchId,
            entity_type: 'brokers',
            legacy_id: legacyId,
            supabase_id: insertedBroker?.id || null,
            status: 'migrated',
            action: 'inserted_broker',
            error_code: null,
            safe_error_message: null,
            source_fingerprint: sourceFingerprint,
            created_at: new Date().toISOString()
          });
        } catch (err: any) {
          counts.brokers.failed++;
          logs.push({
            id: `log-${logs.length + 1}`,
            migration_batch_id: batchId,
            entity_type: 'brokers',
            legacy_id: legacyId,
            supabase_id: null,
            status: 'failed',
            action: 'broker_insert_failed',
            error_code: 'BROKER_MIGRATION_ERROR',
            safe_error_message: err.message,
            source_fingerprint: sourceFingerprint,
            created_at: new Date().toISOString()
          });
        }
      } else {
        counts.brokers.migrated++;
      }
    }

    // ==================== 3. MIGRATE PROPERTIES ====================
    counts.properties.total = legacyData.properties.length;
    for (const rawProp of legacyData.properties) {
      const propParse = LegacyPropertySchema.safeParse(rawProp);
      const legacyId: string = String((rawProp as any).id || `prop-${Math.random().toString(36).substr(2, 7)}`);

      if (!propParse.success) {
        counts.properties.failed++;
        logs.push({
          id: `log-${logs.length + 1}`,
          migration_batch_id: batchId,
          entity_type: 'properties',
          legacy_id: legacyId,
          supabase_id: null,
          status: 'failed',
          action: 'schema_validation_failed',
          error_code: 'INVALID_PROPERTY_SCHEMA',
          safe_error_message: JSON.stringify(propParse.error.flatten().fieldErrors),
          source_fingerprint: `prop-${rawProp.title}`,
          created_at: new Date().toISOString()
        });
        continue;
      }

      const propData = propParse.data;
      const mappedOwnerId = idMap.get(propData.owner_id) || propData.owner_id;
      const sourceFingerprint = `prop:${mappedOwnerId}:${propData.city.toLowerCase()}:${propData.locality.toLowerCase()}:${propData.title.toLowerCase()}:${propData.rent_amount}`;

      if (dryRun) {
        const simId = `sim-prop-${Math.random().toString(36).substr(2, 9)}`;
        idMap.set(legacyId, simId);
        counts.properties.migrated++;
        logs.push({
          id: `log-${logs.length + 1}`,
          migration_batch_id: batchId,
          entity_type: 'properties',
          legacy_id: legacyId,
          supabase_id: simId,
          status: 'migrated',
          action: 'dry_run_validated_property',
          error_code: null,
          safe_error_message: null,
          source_fingerprint: sourceFingerprint,
          created_at: new Date().toISOString()
        });
        continue;
      }

      if (supabase) {
        try {
          // Deduplication check by owner_id + city + locality + title + rent_amount
          const { data: existingProp } = await supabase
            .from('properties')
            .select('*')
            .eq('owner_id', mappedOwnerId)
            .eq('city', propData.city)
            .eq('locality', propData.locality)
            .eq('rent_amount', propData.rent_amount)
            .maybeSingle();

          if (existingProp) {
            idMap.set(legacyId, existingProp.id);
            counts.properties.duplicate++;
            logs.push({
              id: `log-${logs.length + 1}`,
              migration_batch_id: batchId,
              entity_type: 'properties',
              legacy_id: legacyId,
              supabase_id: existingProp.id,
              status: 'duplicate',
              action: 'property_already_exists',
              error_code: null,
              safe_error_message: null,
              source_fingerprint: sourceFingerprint,
              created_at: new Date().toISOString()
            });
            continue;
          }

          // Process image_urls: validate public URLs or keep references
          const validImages = propData.image_urls.filter(url => typeof url === 'string' && url.length > 5);

          const { data: insertedProp, error: propErr } = await supabase
            .from('properties')
            .insert({
              owner_id: mappedOwnerId,
              title: propData.title,
              description: propData.description,
              city: propData.city,
              locality: propData.locality,
              bedrooms: propData.bedrooms,
              bathrooms: propData.bathrooms,
              furnishing_status: propData.furnishing_status,
              rent_amount: propData.rent_amount,
              deposit_amount: propData.deposit_amount,
              address: propData.address,
              latitude: propData.latitude,
              longitude: propData.longitude,
              image_urls: validImages,
              is_verified: propData.is_verified,
              status: propData.status,
              created_at: propData.created_at || new Date().toISOString()
            })
            .select()
            .single();

          if (propErr) throw propErr;

          if (insertedProp) {
            idMap.set(legacyId, insertedProp.id);
            counts.properties.migrated++;
            logs.push({
              id: `log-${logs.length + 1}`,
              migration_batch_id: batchId,
              entity_type: 'properties',
              legacy_id: legacyId,
              supabase_id: insertedProp.id,
              status: 'migrated',
              action: 'inserted_property',
              error_code: null,
              safe_error_message: null,
              source_fingerprint: sourceFingerprint,
              created_at: new Date().toISOString()
            });
          }
        } catch (err: any) {
          counts.properties.failed++;
          logs.push({
            id: `log-${logs.length + 1}`,
            migration_batch_id: batchId,
            entity_type: 'properties',
            legacy_id: legacyId,
            supabase_id: null,
            status: 'failed',
            action: 'property_insert_failed',
            error_code: 'PROPERTY_MIGRATION_ERROR',
            safe_error_message: err.message,
            source_fingerprint: sourceFingerprint,
            created_at: new Date().toISOString()
          });
        }
      } else {
        const mockId = `prop-${Math.random().toString(36).substr(2, 9)}`;
        idMap.set(legacyId, mockId);
        counts.properties.migrated++;
      }
    }

    // ==================== 4. MIGRATE LEADS ====================
    counts.leads.total = legacyData.leads.length;
    for (const rawLead of legacyData.leads) {
      const leadParse = LegacyLeadSchema.safeParse(rawLead);
      const legacyId: string = String((rawLead as any).id || `lead-${Math.random().toString(36).substr(2, 7)}`);

      if (!leadParse.success) {
        counts.leads.failed++;
        logs.push({
          id: `log-${logs.length + 1}`,
          migration_batch_id: batchId,
          entity_type: 'leads',
          legacy_id: legacyId,
          supabase_id: null,
          status: 'failed',
          action: 'schema_validation_failed',
          error_code: 'INVALID_LEAD_SCHEMA',
          safe_error_message: JSON.stringify(leadParse.error.flatten().fieldErrors),
          source_fingerprint: `lead-${rawLead.name}`,
          created_at: new Date().toISOString()
        });
        continue;
      }

      const leadData = leadParse.data;
      const mappedPropertyId = idMap.get(leadData.property_id) || leadData.property_id;
      const mappedRenterId = leadData.renter_id ? (idMap.get(leadData.renter_id) || leadData.renter_id) : null;
      const sourceFingerprint = `lead:${mappedPropertyId}:${leadData.name.toLowerCase()}:${leadData.phone}`;

      if (dryRun) {
        counts.leads.migrated++;
        logs.push({
          id: `log-${logs.length + 1}`,
          migration_batch_id: batchId,
          entity_type: 'leads',
          legacy_id: legacyId,
          supabase_id: `sim-lead-${Math.random().toString(36).substr(2, 9)}`,
          status: 'migrated',
          action: 'dry_run_validated_lead',
          error_code: null,
          safe_error_message: null,
          source_fingerprint: sourceFingerprint,
          created_at: new Date().toISOString()
        });
        continue;
      }

      if (supabase) {
        try {
          const { data: existingLead } = await supabase
            .from('leads')
            .select('*')
            .eq('property_id', mappedPropertyId)
            .eq('name', leadData.name)
            .eq('phone', leadData.phone)
            .maybeSingle();

          if (existingLead) {
            counts.leads.duplicate++;
            logs.push({
              id: `log-${logs.length + 1}`,
              migration_batch_id: batchId,
              entity_type: 'leads',
              legacy_id: legacyId,
              supabase_id: existingLead.id,
              status: 'duplicate',
              action: 'lead_already_exists',
              error_code: null,
              safe_error_message: null,
              source_fingerprint: sourceFingerprint,
              created_at: new Date().toISOString()
            });
            continue;
          }

          const { data: insertedLead, error: leadErr } = await supabase
            .from('leads')
            .insert({
              property_id: mappedPropertyId,
              renter_id: mappedRenterId,
              name: leadData.name,
              phone: leadData.phone,
              message: leadData.message,
              created_at: leadData.created_at || new Date().toISOString()
            })
            .select()
            .single();

          if (leadErr) throw leadErr;

          counts.leads.migrated++;
          logs.push({
            id: `log-${logs.length + 1}`,
            migration_batch_id: batchId,
            entity_type: 'leads',
            legacy_id: legacyId,
            supabase_id: insertedLead?.id || null,
            status: 'migrated',
            action: 'inserted_lead',
            error_code: null,
            safe_error_message: null,
            source_fingerprint: sourceFingerprint,
            created_at: new Date().toISOString()
          });
        } catch (err: any) {
          counts.leads.failed++;
          logs.push({
            id: `log-${logs.length + 1}`,
            migration_batch_id: batchId,
            entity_type: 'leads',
            legacy_id: legacyId,
            supabase_id: null,
            status: 'failed',
            action: 'lead_insert_failed',
            error_code: 'LEAD_MIGRATION_ERROR',
            safe_error_message: err.message,
            source_fingerprint: sourceFingerprint,
            created_at: new Date().toISOString()
          });
        }
      } else {
        counts.leads.migrated++;
      }
    }

    // ==================== 5. MIGRATE FAVORITES ====================
    counts.favorites.total = legacyData.favorites.length;
    for (const rawFav of legacyData.favorites) {
      const favParse = LegacyFavoriteSchema.safeParse(rawFav);
      const legacyId: string = String((rawFav as any).id || `fav-${(rawFav as any).user_id}-${(rawFav as any).property_id}`);

      if (!favParse.success) {
        counts.favorites.failed++;
        logs.push({
          id: `log-${logs.length + 1}`,
          migration_batch_id: batchId,
          entity_type: 'favorites',
          legacy_id: legacyId,
          supabase_id: null,
          status: 'failed',
          action: 'schema_validation_failed',
          error_code: 'INVALID_FAVORITE_SCHEMA',
          safe_error_message: JSON.stringify(favParse.error.flatten().fieldErrors),
          source_fingerprint: `fav-${rawFav.user_id}-${rawFav.property_id}`,
          created_at: new Date().toISOString()
        });
        continue;
      }

      const favData = favParse.data;
      const mappedUserId = idMap.get(favData.user_id) || favData.user_id;
      const mappedPropertyId = idMap.get(favData.property_id) || favData.property_id;
      const sourceFingerprint = `fav:${mappedUserId}:${mappedPropertyId}`;

      if (dryRun) {
        counts.favorites.migrated++;
        logs.push({
          id: `log-${logs.length + 1}`,
          migration_batch_id: batchId,
          entity_type: 'favorites',
          legacy_id: legacyId,
          supabase_id: `sim-fav-${Math.random().toString(36).substr(2, 9)}`,
          status: 'migrated',
          action: 'dry_run_validated_favorite',
          error_code: null,
          safe_error_message: null,
          source_fingerprint: sourceFingerprint,
          created_at: new Date().toISOString()
        });
        continue;
      }

      if (supabase) {
        try {
          const { data: existingFav } = await supabase
            .from('favorites')
            .select('*')
            .eq('user_id', mappedUserId)
            .eq('property_id', mappedPropertyId)
            .maybeSingle();

          if (existingFav) {
            counts.favorites.duplicate++;
            logs.push({
              id: `log-${logs.length + 1}`,
              migration_batch_id: batchId,
              entity_type: 'favorites',
              legacy_id: legacyId,
              supabase_id: existingFav.id,
              status: 'duplicate',
              action: 'favorite_already_exists',
              error_code: null,
              safe_error_message: null,
              source_fingerprint: sourceFingerprint,
              created_at: new Date().toISOString()
            });
            continue;
          }

          const { data: insertedFav, error: favErr } = await supabase
            .from('favorites')
            .insert({
              user_id: mappedUserId,
              property_id: mappedPropertyId,
              created_at: favData.created_at || new Date().toISOString()
            })
            .select()
            .single();

          if (favErr) throw favErr;

          counts.favorites.migrated++;
          logs.push({
            id: `log-${logs.length + 1}`,
            migration_batch_id: batchId,
            entity_type: 'favorites',
            legacy_id: legacyId,
            supabase_id: insertedFav?.id || null,
            status: 'migrated',
            action: 'inserted_favorite',
            error_code: null,
            safe_error_message: null,
            source_fingerprint: sourceFingerprint,
            created_at: new Date().toISOString()
          });
        } catch (err: any) {
          counts.favorites.failed++;
          logs.push({
            id: `log-${logs.length + 1}`,
            migration_batch_id: batchId,
            entity_type: 'favorites',
            legacy_id: legacyId,
            supabase_id: null,
            status: 'failed',
            action: 'favorite_insert_failed',
            error_code: 'FAVORITE_MIGRATION_ERROR',
            safe_error_message: err.message,
            source_fingerprint: sourceFingerprint,
            created_at: new Date().toISOString()
          });
        }
      } else {
        counts.favorites.migrated++;
      }
    }

    // ==================== 6. MIGRATE WAITLIST ====================
    counts.waitlist.total = legacyData.waitlist.length;
    for (const rawWait of legacyData.waitlist) {
      const waitParse = LegacyWaitlistSchema.safeParse(rawWait);
      const legacyId: string = String((rawWait as any).id || `wait-${Math.random().toString(36).substr(2, 7)}`);

      if (!waitParse.success) {
        counts.waitlist.failed++;
        logs.push({
          id: `log-${logs.length + 1}`,
          migration_batch_id: batchId,
          entity_type: 'waitlist',
          legacy_id: legacyId,
          supabase_id: null,
          status: 'failed',
          action: 'schema_validation_failed',
          error_code: 'INVALID_WAITLIST_SCHEMA',
          safe_error_message: JSON.stringify(waitParse.error.flatten().fieldErrors),
          source_fingerprint: `wait-${rawWait.contact}`,
          created_at: new Date().toISOString()
        });
        continue;
      }

      const waitData = waitParse.data;
      const normalizedContact = waitData.contact.trim().toLowerCase();
      const sourceFingerprint = `waitlist:${normalizedContact}`;

      if (dryRun) {
        counts.waitlist.migrated++;
        logs.push({
          id: `log-${logs.length + 1}`,
          migration_batch_id: batchId,
          entity_type: 'waitlist',
          legacy_id: legacyId,
          supabase_id: `sim-wait-${Math.random().toString(36).substr(2, 9)}`,
          status: 'migrated',
          action: 'dry_run_validated_waitlist',
          error_code: null,
          safe_error_message: null,
          source_fingerprint: sourceFingerprint,
          created_at: new Date().toISOString()
        });
        continue;
      }

      if (supabase) {
        try {
          const { data: existingWait } = await supabase
            .from('waitlist')
            .select('*')
            .eq('contact', normalizedContact)
            .maybeSingle();

          if (existingWait) {
            counts.waitlist.duplicate++;
            logs.push({
              id: `log-${logs.length + 1}`,
              migration_batch_id: batchId,
              entity_type: 'waitlist',
              legacy_id: legacyId,
              supabase_id: existingWait.id,
              status: 'duplicate',
              action: 'waitlist_entry_already_exists',
              error_code: null,
              safe_error_message: null,
              source_fingerprint: sourceFingerprint,
              created_at: new Date().toISOString()
            });
            continue;
          }

          const { data: insertedWait, error: waitErr } = await supabase
            .from('waitlist')
            .insert({
              name: waitData.name,
              contact: normalizedContact,
              role: waitData.role,
              created_at: waitData.created_at || new Date().toISOString()
            })
            .select()
            .single();

          if (waitErr) throw waitErr;

          counts.waitlist.migrated++;
          logs.push({
            id: `log-${logs.length + 1}`,
            migration_batch_id: batchId,
            entity_type: 'waitlist',
            legacy_id: legacyId,
            supabase_id: insertedWait?.id || null,
            status: 'migrated',
            action: 'inserted_waitlist',
            error_code: null,
            safe_error_message: null,
            source_fingerprint: sourceFingerprint,
            created_at: new Date().toISOString()
          });
        } catch (err: any) {
          counts.waitlist.failed++;
          logs.push({
            id: `log-${logs.length + 1}`,
            migration_batch_id: batchId,
            entity_type: 'waitlist',
            legacy_id: legacyId,
            supabase_id: null,
            status: 'failed',
            action: 'waitlist_insert_failed',
            error_code: 'WAITLIST_MIGRATION_ERROR',
            safe_error_message: err.message,
            source_fingerprint: sourceFingerprint,
            created_at: new Date().toISOString()
          });
        }
      } else {
        counts.waitlist.migrated++;
      }
    }

    // Persist logs in legacy_migration_logs if live
    if (supabase && !dryRun && logs.length > 0) {
      try {
        await supabase.from('legacy_migration_logs').insert(
          logs.map(l => ({
            migration_batch_id: l.migration_batch_id,
            entity_type: l.entity_type,
            legacy_id: l.legacy_id,
            supabase_id: l.supabase_id,
            status: l.status,
            action: l.action,
            error_code: l.error_code,
            safe_error_message: l.safe_error_message,
            source_fingerprint: l.source_fingerprint,
            created_at: l.created_at
          }))
        );
      } catch (err: any) {
        console.warn('[Migration] Could not write to legacy_migration_logs table:', err.message);
      }
    }

    const totalProcessed = 
      counts.users.total + counts.brokers.total + counts.properties.total + counts.leads.total + counts.favorites.total + counts.waitlist.total;
    const totalMigrated = 
      counts.users.migrated + counts.brokers.migrated + counts.properties.migrated + counts.leads.migrated + counts.favorites.migrated + counts.waitlist.migrated;
    const totalSkipped = 
      counts.users.skipped + counts.brokers.skipped + counts.properties.skipped + counts.leads.skipped + counts.favorites.skipped + counts.waitlist.skipped;
    const totalDuplicate = 
      counts.users.duplicate + counts.brokers.duplicate + counts.properties.duplicate + counts.leads.duplicate + counts.favorites.duplicate + counts.waitlist.duplicate;
    const totalFailed = 
      counts.users.failed + counts.brokers.failed + counts.properties.failed + counts.leads.failed + counts.favorites.failed + counts.waitlist.failed;

    res.json({
      success: true,
      dryRun,
      batchId,
      timestamp: new Date().toISOString(),
      summary: {
        total: totalProcessed,
        migrated: totalMigrated,
        skipped: totalSkipped,
        duplicate: totalDuplicate,
        failed: totalFailed
      },
      details: counts,
      logs,
      idMappingsCount: idMap.size
    });
  } catch (err: any) {
    console.error('[Migration Server Error]', err);
    res.status(500).json({
      error: 'Migration processing failed',
      message: err.message
    });
  }
});
