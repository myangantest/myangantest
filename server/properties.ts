/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Request, Response, Router } from 'express';
import { z } from 'zod';
import { getSupabaseAdminClient, getSupabaseClient } from './db.js';
import { getAuthUserFromRequest } from './payments.js';

export const propertyRouter = Router();

// Zod Schema for property creation payload
const createPropertySchema = z.object({
  title: z.string().min(15, { message: 'Title must be at least 15 characters long.' }),
  description: z.string().optional().default('No description provided.'),
  city: z.string().min(2, { message: 'City is required.' }),
  locality: z.string().min(3, { message: 'Locality must be at least 3 characters.' }),
  address: z.string().min(15, { message: 'Full physical address must be at least 15 characters.' }),
  bedrooms: z.number().int().min(0, { message: 'Bedrooms must be 0 or greater.' }),
  bathrooms: z.number().int().min(0, { message: 'Bathrooms must be 0 or greater.' }),
  furnishing_status: z.enum(['unfurnished', 'semi_furnished', 'furnished']),
  rent_amount: z.number().positive({ message: 'Monthly rent must be greater than 0.' }),
  deposit_amount: z.number().positive({ message: 'Security deposit must be greater than 0.' }),
  latitude: z.number().nullable().optional(),
  longitude: z.number().nullable().optional(),
  image_urls: z.array(z.string()).max(8, { message: 'Maximum of 8 images allowed.' }),
});

/**
 * Helper to fetch complete user security context deterministically without .single()
 */
async function getUserSecurityContext(userId: string, requestId: string) {
  if (userId.includes('mock')) {
    let mockRole = 'renter';
    if (userId.includes('broker')) mockRole = 'broker';
    else if (userId.includes('owner')) mockRole = 'owner';
    else if (userId.includes('admin')) mockRole = 'admin';

    return {
      userId,
      role: mockRole,
      roleErrorCode: null,
      profile: null,
      account_status: 'active',
      onboarding_status: 'complete',
      is_verified: true,
    };
  }

  let userRole: string | null = null;
  let roleErrorCode: string | null = null;
  let profile: any = null;

  const supabase = getSupabaseAdminClient() || getSupabaseClient();
  if (supabase) {
    try {
      const { data: roleRows, error: roleError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId);

      if (roleError) {
        console.error(`[${requestId}] [ROLE_QUERY_FAILED] Failed querying user_roles:`, roleError.message);
        roleErrorCode = 'ROLE_QUERY_FAILED';
      } else if (!roleRows || roleRows.length === 0) {
        console.warn(`[${requestId}] [ROLE_NOT_FOUND] Zero user_roles rows found for user_id ${userId}.`);
        roleErrorCode = 'ROLE_NOT_FOUND';
      } else if (roleRows.length > 1) {
        console.warn(`[${requestId}] [ROLE_DUPLICATE] ${roleRows.length} duplicate user_roles rows found for user_id ${userId}. Applying deterministic priority.`);
        roleErrorCode = 'ROLE_DUPLICATE';
        const rankMap: Record<string, number> = { admin: 1, broker: 2, owner: 3, landlord: 3, renter: 4 };
        const sorted = [...roleRows].sort((a: any, b: any) => (rankMap[a.role] || 99) - (rankMap[b.role] || 99));
        userRole = sorted[0].role;
      } else {
        userRole = roleRows[0].role;
      }

      const { data: profileRows } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId);

      if (profileRows && profileRows.length > 0) {
        profile = profileRows[0];
      }
    } catch (err: any) {
      console.warn(`[${requestId}] Error querying security context from Supabase:`, err.message);
    }
  }

  // Fallback to profile fields or mock token prefix if user_roles had zero rows
  let fallbackRole = profile?.provider_type || profile?.account_category;
  if (!userRole && !fallbackRole) {
    if (userId.includes('broker')) fallbackRole = 'broker';
    else if (userId.includes('owner')) fallbackRole = 'owner';
    else if (userId.includes('admin')) fallbackRole = 'admin';
    else if (userId.includes('renter')) fallbackRole = 'renter';
  }

  const effectiveRole = userRole || fallbackRole || 'renter';

  return {
    userId,
    role: effectiveRole,
    roleErrorCode,
    profile,
    account_status: profile?.account_status || 'active',
    onboarding_status: profile?.onboarding_status || 'complete',
    is_verified: profile?.is_verified ?? false,
  };
}

/**
 * POST /api/properties
 * Trusted Endpoint for Property Submission
 */
propertyRouter.post('/', async (req: Request, res: Response): Promise<void> => {
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  
  try {
    // 1. Bearer Token Verification
    const authUser = await getAuthUserFromRequest(req);
    if (!authUser) {
      console.warn(`[${requestId}] Unauthorized property submission attempt.`);
      res.status(401).json({
        success: false,
        error: 'Unauthorized: Session login required to submit property listings.',
        code: 'UNAUTHORIZED',
        requestId
      });
      return;
    }

    // 2. Security Context & Role Resolution
    const securityCtx = await getUserSecurityContext(authUser.id, requestId);
    const effectiveRole = securityCtx?.role;
    const accountStatus = securityCtx?.account_status;

    // Check account status
    if (accountStatus === 'suspended' || accountStatus === 'disabled') {
      console.warn(`[${requestId}] Blocked submission for ${accountStatus} account ${authUser.id}.`);
      res.status(403).json({
        success: false,
        error: `Account Error: Your provider account is currently ${accountStatus}. Submissions are disabled.`,
        code: 'ACCOUNT_SUSPENDED',
        requestId
      });
      return;
    }

    // Role Enforcement: owner, broker, landlord, admin
    const allowedRoles = ['owner', 'broker', 'landlord', 'admin', 'landlord_broker'];
    if (!effectiveRole || !allowedRoles.includes(effectiveRole) || effectiveRole === 'renter') {
      console.warn(`[${requestId}] [ROLE_FORBIDDEN] Forbidden role '${effectiveRole}' for user ${authUser.id}.`);
      res.status(403).json({
        success: false,
        error: 'Forbidden: Only verified Property Owners and Brokers may post rental listings.',
        code: 'ROLE_FORBIDDEN',
        requestId
      });
      return;
    }

    // Check pending onboarding for providers
    if (effectiveRole === 'landlord_broker' && securityCtx?.onboarding_status === 'pending' && !securityCtx?.profile?.provider_type) {
      console.warn(`[${requestId}] Pending onboarding for user ${authUser.id}.`);
      res.status(403).json({
        success: false,
        error: 'Forbidden: Provider onboarding must be completed before listing properties.',
        code: 'ONBOARDING_PENDING',
        requestId
      });
      return;
    }

    // 3. Payload Validation with Zod
    const validationResult = createPropertySchema.safeParse(req.body);
    if (!validationResult.success) {
      const issue = validationResult.error.issues[0]?.message || 'Invalid payload data.';
      console.warn(`[${requestId}] Validation failure for user ${authUser.id}:`, validationResult.error.format());
      res.status(400).json({
        success: false,
        error: `Validation Error: ${issue}`,
        details: validationResult.error.issues,
        code: 'INVALID_PAYLOAD',
        requestId
      });
      return;
    }

    const payload = validationResult.data;

    // 4. Validate image URLs (reject blob URLs)
    const invalidBlobUrls = payload.image_urls.filter(url => url.startsWith('blob:'));
    if (invalidBlobUrls.length > 0) {
      res.status(400).json({
        success: false,
        error: 'Validation Error: Temporary browser blob URLs are not permitted. Please upload files to property storage.',
        code: 'BLOB_URL_REJECTED',
        requestId
      });
      return;
    }

    // 5. Server-Enforced Property Record Construction
    // IGNORE browser-supplied owner_id, status, approval_status, is_verified, review_notes
    const newPropertyRecord = {
      owner_id: authUser.id, // Strictly bind to authenticated UUID
      title: payload.title.trim(),
      description: payload.description.trim(),
      city: payload.city,
      locality: payload.locality.trim(),
      address: payload.address.trim(),
      bedrooms: payload.bedrooms,
      bathrooms: payload.bathrooms,
      furnishing_status: payload.furnishing_status,
      rent_amount: payload.rent_amount,
      deposit_amount: payload.deposit_amount,
      latitude: payload.latitude ?? null,
      longitude: payload.longitude ?? null,
      image_urls: payload.image_urls,
      status: 'pending',                  // Server-controlled initial status
      approval_status: 'pending_review', // Server-controlled approval queue status
      is_verified: false,                // Server-controlled verification flag
      review_notes: null,                // Server-controlled review notes
      created_at: new Date().toISOString()
    };

    const supabaseAdmin = getSupabaseAdminClient() || getSupabaseClient();
    if (!supabaseAdmin) {
      if (process.env.NODE_ENV === 'production') {
        console.error(`[${requestId}] Production database unavailable.`);
        res.status(500).json({
          success: false,
          error: 'Database Error: Service temporarily unavailable. Please try again later.',
          code: 'DATABASE_UNAVAILABLE',
          requestId
        });
        return;
      }
      // Development mock fallback
      res.status(201).json({
        success: true,
        property: { id: `prop_mock_${Date.now()}`, ...newPropertyRecord },
        submissionStatus: 'pending_review',
        requestId,
        message: 'Property submitted successfully for admin review (mock mode).'
      });
      return;
    }

    // 6. Database Insertion
    const { data: createdProperty, error: insertError } = await supabaseAdmin
      .from('properties')
      .insert([newPropertyRecord])
      .select()
      .single();

    if (insertError) {
      console.error(`[${requestId}] Property insert failure:`, insertError.message);

      if (payload.image_urls.length > 0) {
        await cleanupOrphanStorageObjects(payload.image_urls, authUser.id);
      }

      res.status(500).json({
        success: false,
        error: 'Database Error: Failed to insert property listing into database.',
        code: 'INSERT_FAILED',
        requestId
      });
      return;
    }

    // 7. Create Initial listing_reviews Log Event
    try {
      await supabaseAdmin.from('listing_reviews').insert([{
        property_id: createdProperty.id,
        reviewer_id: null,
        previous_status: null,
        new_status: 'pending_review',
        decision: 'submitted',
        notes: 'Initial property submission by provider',
      }]);
    } catch (reviewErr: any) {
      console.warn(`[${requestId}] Non-fatal listing_reviews log creation error:`, reviewErr.message);
    }

    // 8. Create audit_logs Event
    try {
      await supabaseAdmin.from('audit_logs').insert([{
        actor_id: authUser.id,
        action: 'listing_submitted',
        entity_type: 'property',
        entity_id: createdProperty.id,
        payload: { title: createdProperty.title, city: createdProperty.city }
      }]);
    } catch (auditErr: any) {
      console.warn(`[${requestId}] Non-fatal audit_logs creation error:`, auditErr.message);
    }

    console.log(`[${requestId}] Property ${createdProperty.id} successfully created as pending_review by user ${authUser.id}.`);

    res.status(201).json({
      success: true,
      property: createdProperty,
      submissionStatus: 'pending_review',
      requestId,
      message: 'Your property has been submitted successfully and is now pending admin review.'
    });

  } catch (err: any) {
    console.error(`[${requestId}] Critical exception in POST /api/properties:`, err);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error: Failed to process property submission.',
      code: 'SERVER_ERROR',
      requestId
    });
  }
});

/**
 * POST /api/properties/delete-images
 * Utility endpoint for atomic cleanup of orphan storage images
 */
propertyRouter.post('/delete-images', async (req: Request, res: Response): Promise<void> => {
  try {
    const authUser = await getAuthUserFromRequest(req);
    if (!authUser) {
      res.status(401).json({ success: false, error: 'Unauthorized.' });
      return;
    }

    const { paths } = req.body;
    if (!Array.isArray(paths) || paths.length === 0) {
      res.status(400).json({ success: false, error: 'Paths array required.' });
      return;
    }

    await cleanupOrphanStorageObjects(paths, authUser.id);
    res.json({ success: true, removed: paths.length });
  } catch (err: any) {
    res.status(500).json({ success: false, error: 'Failed to delete images.' });
  }
});

/**
 * Helper to safely delete orphan objects from property-images bucket
 */
async function cleanupOrphanStorageObjects(imageUrlsOrPaths: string[], ownerId: string) {
  const supabaseAdmin = getSupabaseAdminClient() || getSupabaseClient();
  if (!supabaseAdmin) return;

  const storagePaths: string[] = [];
  for (const item of imageUrlsOrPaths) {
    if (!item) continue;
    let path = item;
    if (path.includes('/property-images/')) {
      path = path.split('/property-images/')[1];
    }
    if (path.startsWith(`${ownerId}/`)) {
      storagePaths.push(path);
    }
  }

  if (storagePaths.length > 0) {
    try {
      await supabaseAdmin.storage.from('property-images').remove(storagePaths);
      console.log(`[Storage Cleanup] Deleted ${storagePaths.length} orphan storage objects for user ${ownerId}.`);
    } catch (err: any) {
      console.error('[Storage Cleanup Error] Failed to delete orphan storage objects:', err.message);
    }
  }
}
