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
 * Helper to fetch complete user security context (profile + single operational role)
 */
async function getUserSecurityContext(userId: string) {
  const supabase = getSupabaseAdminClient() || getSupabaseClient();
  if (!supabase) return null;

  // 1. Fetch user role
  const { data: roleRow } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', userId)
    .maybeSingle();

  // 2. Fetch user profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();

  const role = roleRow?.role || profile?.provider_type || profile?.account_category || 'renter';

  return {
    userId,
    role,
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
        error: 'Unauthorized: Session login required to submit property listings.',
        code: 'UNAUTHORIZED'
      });
      return;
    }

    // 2. Security Context & Role Resolution
    const securityCtx = await getUserSecurityContext(authUser.id);
    const effectiveRole = securityCtx?.role;
    const accountStatus = securityCtx?.account_status;

    // Check account status
    if (accountStatus === 'suspended' || accountStatus === 'disabled') {
      console.warn(`[${requestId}] Blocked submission for ${accountStatus} account ${authUser.id}.`);
      res.status(403).json({
        error: `Account Error: Your account is currently ${accountStatus}. Submissions are disabled.`,
        code: 'ACCOUNT_SUSPENDED'
      });
      return;
    }

    // Role Enforcement: owner, broker, landlord, admin
    const allowedRoles = ['owner', 'broker', 'landlord', 'admin', 'landlord_broker'];
    if (!effectiveRole || !allowedRoles.includes(effectiveRole) || effectiveRole === 'renter') {
      console.warn(`[${requestId}] Forbidden role '${effectiveRole}' for user ${authUser.id}.`);
      res.status(403).json({
        error: 'Forbidden: Only verified Property Owners and Brokers may post rental listings.',
        code: 'FORBIDDEN_ROLE'
      });
      return;
    }

    // Check pending onboarding for providers
    if (effectiveRole === 'landlord_broker' && securityCtx?.onboarding_status === 'pending' && !securityCtx?.profile?.provider_type) {
      console.warn(`[${requestId}] Pending onboarding for user ${authUser.id}.`);
      res.status(403).json({
        error: 'Forbidden: Provider onboarding must be completed before listing properties.',
        code: 'ONBOARDING_PENDING'
      });
      return;
    }

    // 3. Payload Validation with Zod
    const validationResult = createPropertySchema.safeParse(req.body);
    if (!validationResult.success) {
      const issue = validationResult.error.issues[0]?.message || 'Invalid payload data.';
      console.warn(`[${requestId}] Validation failure for user ${authUser.id}:`, validationResult.error.format());
      res.status(400).json({
        error: `Validation Error: ${issue}`,
        details: validationResult.error.issues,
        code: 'INVALID_PAYLOAD'
      });
      return;
    }

    const payload = validationResult.data;

    // 4. Validate image URLs (reject blob URLs, enforce non-empty)
    const invalidBlobUrls = payload.image_urls.filter(url => url.startsWith('blob:'));
    if (invalidBlobUrls.length > 0) {
      res.status(400).json({
        error: 'Validation Error: Temporary browser blob URLs are not permitted. Please upload files to property storage.',
        code: 'BLOB_URL_REJECTED'
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
          error: 'Database Error: Service temporarily unavailable. Please try again later.',
          code: 'DATABASE_UNAVAILABLE'
        });
        return;
      }
      // Development mock fallback handling
      res.status(201).json({
        status: 'success',
        property: { id: `prop_mock_${Date.now()}`, ...newPropertyRecord },
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

      // Attempt atomic cleanup of uploaded storage images if paths are provided
      if (payload.image_urls.length > 0) {
        await cleanupOrphanStorageObjects(payload.image_urls, authUser.id);
      }

      res.status(500).json({
        error: 'Database Error: Failed to insert property listing into database.',
        code: 'INSERT_FAILED'
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
      status: 'success',
      property: createdProperty,
      submission_status: 'pending_review',
      message: 'Your property has been submitted successfully and is now pending admin review.'
    });

  } catch (err: any) {
    console.error(`[${requestId}] Critical exception in POST /api/properties:`, err);
    res.status(500).json({
      error: 'Internal Server Error: Failed to process property submission.',
      code: 'SERVER_ERROR'
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
      res.status(401).json({ error: 'Unauthorized.' });
      return;
    }

    const { paths } = req.body;
    if (!Array.isArray(paths) || paths.length === 0) {
      res.status(400).json({ error: 'Paths array required.' });
      return;
    }

    await cleanupOrphanStorageObjects(paths, authUser.id);
    res.json({ status: 'success', removed: paths.length });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to delete images.' });
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
    // Only delete paths matching ownerId for safety
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
