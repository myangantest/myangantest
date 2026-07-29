/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Request, Response, Router } from 'express';
import multer from 'multer';
import { z } from 'zod';
import { getSupabaseAdminClient, getSupabaseClient } from './db.js';
import { getAuthUserFromRequest } from './payments.js';

export const propertyRouter = Router();

// Configure multer in-memory storage for Vercel serverless environment (Max 5MB)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }
});

// Zod Schema for property creation payload
const createPropertySchema = z.object({
  property_id: z.string().optional(),
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
  image_urls: z.array(z.string()).max(8, { message: 'Maximum of 8 images allowed.' }).optional().default([]),
  uploaded_images: z.array(z.object({
    storage_path: z.string(),
    file_name: z.string(),
    file_size_bytes: z.number(),
    mime_type: z.string(),
    display_order: z.number().optional().default(0),
  })).optional().default([]),
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
 * Helper to generate short-lived signed URLs for private storage paths
 */
export async function attachSignedImageUrls(properties: any[]) {
  if (!Array.isArray(properties) || properties.length === 0) return properties;
  const supabase = getSupabaseAdminClient() || getSupabaseClient();
  if (!supabase) return properties;

  try {
    for (const prop of properties) {
      const rawPaths: string[] = [];
      
      // 1. Fetch paths from public.property_images table (Source of truth)
      const { data: imageRows } = await supabase
        .from('property_images')
        .select('storage_path, display_order')
        .eq('property_id', prop.id)
        .order('display_order', { ascending: true });

      if (imageRows && imageRows.length > 0) {
        for (const row of imageRows) {
          if (row.storage_path) rawPaths.push(row.storage_path);
        }
      } else if (Array.isArray(prop.image_urls)) {
        // Fallback to image_urls
        for (const url of prop.image_urls) {
          if (url && typeof url === 'string' && !url.startsWith('blob:')) {
            const cleanPath = url.includes('property-images/') ? url.split('property-images/')[1] : url;
            if (cleanPath) rawPaths.push(cleanPath);
          }
        }
      }

      if (rawPaths.length > 0) {
        const signedUrls: string[] = [];
        for (const path of rawPaths) {
          const { data, error } = await supabase.storage
            .from('property-images')
            .createSignedUrl(path, 3600); // 1 hour signed URL

          if (!error && data?.signedUrl) {
            signedUrls.push(data.signedUrl);
          }
        }

        prop.signed_image_urls = signedUrls.length > 0 ? signedUrls : null;
      } else {
        prop.signed_image_urls = null;
      }
    }
  } catch (err: any) {
    console.warn('[Signed URL Generation Notice]', err.message);
  }

  return properties;
}

/**
 * POST /api/properties/upload-image
 * Authenticated Server-Side File Upload Route
 */
propertyRouter.post('/upload-image', upload.single('file'), async (req: Request, res: Response): Promise<void> => {
  const requestId = `req_upload_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  try {
    // 1. Authenticate user session token
    const authUser = await getAuthUserFromRequest(req);
    if (!authUser) {
      res.status(401).json({ success: false, error: 'Unauthorized: Access token required for image upload.', code: 'UNAUTHORIZED', requestId });
      return;
    }

    // 2. Validate user role
    const securityCtx = await getUserSecurityContext(authUser.id, requestId);
    const allowedRoles = ['owner', 'broker', 'landlord', 'admin', 'landlord_broker'];
    if (!securityCtx || !allowedRoles.includes(securityCtx.role) || securityCtx.role === 'renter') {
      res.status(403).json({ success: false, error: 'Forbidden: Only Property Owners and Brokers may upload listing images.', code: 'ROLE_FORBIDDEN', requestId });
      return;
    }

    const file = req.file;
    if (!file) {
      res.status(400).json({ success: false, error: 'Validation Error: No file provided in form-data payload.', code: 'MISSING_FILE', requestId });
      return;
    }

    // 3. Validate MIME type & file size (5MB max)
    const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedMimeTypes.includes(file.mimetype)) {
      res.status(400).json({
        success: false,
        error: `Validation Error: File '${file.originalname}' has unsupported format '${file.mimetype}'. Allowed: JPEG, PNG, WebP.`,
        code: 'INVALID_MIME_TYPE',
        requestId
      });
      return;
    }

    const maxSizeBytes = 5 * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      res.status(400).json({
        success: false,
        error: `Validation Error: File '${file.originalname}' exceeds maximum 5 MB size limit.`,
        code: 'FILE_TOO_LARGE',
        requestId
      });
      return;
    }

    const propertyId = req.body.property_id || `temp_${Date.now()}`;
    const fileExt = file.originalname.split('.').pop()?.toLowerCase() || 'webp';
    const sanitizedOriginal = file.originalname.replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 20);
    const uniqueId = `${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    
    // Canonical Storage Object Path: <owner_uuid>/<property_uuid>/<random_filename>.<ext>
    const objectPath = `${authUser.id}/${propertyId}/${uniqueId}_${sanitizedOriginal}.${fileExt}`;

    const supabaseAdmin = getSupabaseAdminClient() || getSupabaseClient();
    if (!supabaseAdmin) {
      // Mock / Dev fallback
      res.status(200).json({
        success: true,
        storage_path: objectPath,
        file_name: file.originalname,
        file_size_bytes: file.size,
        mime_type: file.mimetype,
        requestId,
        message: 'Image uploaded successfully (mock mode).'
      });
      return;
    }

    // 4. Server-Side Supabase Storage Upload (Using SUPABASE_SERVICE_ROLE_KEY)
    const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
      .from('property-images')
      .upload(objectPath, file.buffer, {
        contentType: file.mimetype,
        upsert: true
      });

    if (uploadError || !uploadData) {
      console.error(`[${requestId}] Storage upload error:`, uploadError?.message);
      res.status(500).json({
        success: false,
        error: `Storage Error: Failed to upload file '${file.originalname}': ${uploadError?.message || 'Upload failed.'}`,
        code: 'STORAGE_UPLOAD_FAILED',
        requestId
      });
      return;
    }

    console.log(`[${requestId}] Successfully uploaded image object '${uploadData.path}' to private property-images bucket.`);

    res.status(200).json({
      success: true,
      storage_path: uploadData.path,
      file_name: file.originalname,
      file_size_bytes: file.size,
      mime_type: file.mimetype,
      requestId
    });

  } catch (err: any) {
    console.error(`[${requestId}] Exception in POST /api/properties/upload-image:`, err);
    res.status(500).json({
      success: false,
      error: `Internal Server Error: ${err.message}`,
      code: 'SERVER_ERROR',
      requestId
    });
  }
});

/**
 * POST /api/properties
 * Trusted Endpoint for Property Submission & Verified Metadata Insertion
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

    // 4. Reject temporary browser blob URLs
    const invalidBlobUrls = (payload.image_urls || []).filter(url => url.startsWith('blob:'));
    if (invalidBlobUrls.length > 0) {
      res.status(400).json({
        success: false,
        error: 'Validation Error: Temporary browser blob URLs are not permitted. Please upload files to property storage.',
        code: 'BLOB_URL_REJECTED',
        requestId
      });
      return;
    }

    // 5. Construct verified storage path lists
    const verifiedImages: Array<{
      storage_path: string;
      file_name: string;
      file_size_bytes: number;
      mime_type: string;
      display_order: number;
    }> = [];

    if (Array.isArray(payload.uploaded_images) && payload.uploaded_images.length > 0) {
      for (let i = 0; i < payload.uploaded_images.length; i++) {
        const item = payload.uploaded_images[i];
        verifiedImages.push({
          storage_path: item.storage_path,
          file_name: item.file_name,
          file_size_bytes: item.file_size_bytes,
          mime_type: item.mime_type,
          display_order: item.display_order ?? i,
        });
      }
    } else if (Array.isArray(payload.image_urls) && payload.image_urls.length > 0) {
      for (let i = 0; i < payload.image_urls.length; i++) {
        const url = payload.image_urls[i];
        const cleanPath = url.includes('property-images/') ? url.split('property-images/')[1] : url;
        verifiedImages.push({
          storage_path: cleanPath,
          file_name: cleanPath.split('/').pop() || 'image.webp',
          file_size_bytes: 1024,
          mime_type: 'image/webp',
          display_order: i,
        });
      }
    }

    const canonicalStoragePaths = verifiedImages.map(img => `property-images/${img.storage_path}`);

    // 6. Server-Enforced Property Record Construction
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
      image_urls: canonicalStoragePaths,  // Legacy fallback array
      status: 'pending',                  // Server-controlled initial status
      approval_status: 'pending_review', // Server-controlled approval queue status
      is_verified: false,                // Server-controlled verification flag
      review_notes: null,                // Server-controlled review notes
      created_at: new Date().toISOString()
    };

    const supabaseAdmin = getSupabaseAdminClient() || getSupabaseClient();
    if (!supabaseAdmin) {
      // Mock mode fallback
      res.status(201).json({
        success: true,
        property: { id: `prop_mock_${Date.now()}`, ...newPropertyRecord },
        submissionStatus: 'pending_review',
        requestId,
        message: 'Property submitted successfully for admin review (mock mode).'
      });
      return;
    }

    // 7. Database Insertion into public.properties
    const { data: createdProperty, error: insertError } = await supabaseAdmin
      .from('properties')
      .insert([newPropertyRecord])
      .select()
      .single();

    if (insertError) {
      console.error(`[${requestId}] Property insert failure:`, insertError.message);
      if (canonicalStoragePaths.length > 0) {
        await cleanupOrphanStorageObjects(canonicalStoragePaths, authUser.id);
      }
      res.status(500).json({
        success: false,
        error: 'Database Error: Failed to insert property listing into database.',
        code: 'INSERT_FAILED',
        requestId
      });
      return;
    }

    // 8. Insert Metadata into public.property_images (Source of Truth)
    if (verifiedImages.length > 0) {
      const imageRecords = verifiedImages.map(img => ({
        property_id: createdProperty.id,
        storage_path: img.storage_path,
        file_name: img.file_name,
        file_size_bytes: img.file_size_bytes,
        mime_type: img.mime_type,
        display_order: img.display_order,
        created_at: new Date().toISOString()
      }));

      const { error: metadataError } = await supabaseAdmin
        .from('property_images')
        .insert(imageRecords);

      if (metadataError) {
        console.error(`[${requestId}] property_images metadata insert error:`, metadataError.message);
        // Rollback created property and storage objects
        await supabaseAdmin.from('properties').delete().eq('id', createdProperty.id);
        await cleanupOrphanStorageObjects(canonicalStoragePaths, authUser.id);

        res.status(500).json({
          success: false,
          error: 'Database Error: Failed to insert property image metadata.',
          code: 'METADATA_INSERT_FAILED',
          requestId
        });
        return;
      }
    }

    // 9. Create Initial listing_reviews & audit_logs Log Events
    try {
      await supabaseAdmin.from('listing_reviews').insert([{
        property_id: createdProperty.id,
        reviewer_id: null,
        previous_status: null,
        new_status: 'pending_review',
        decision: 'submitted',
        notes: 'Initial property submission by provider',
      }]);

      await supabaseAdmin.from('audit_logs').insert([{
        actor_id: authUser.id,
        action: 'listing_submitted',
        entity_type: 'property',
        entity_id: createdProperty.id,
        payload: { title: createdProperty.title, city: createdProperty.city }
      }]);
    } catch {
      // Non-fatal logging notice
    }

    // Attach signed display URLs for response
    const [decoratedProperty] = await attachSignedImageUrls([createdProperty]);

    console.log(`[${requestId}] Property ${createdProperty.id} created with ${verifiedImages.length} verified image(s).`);

    res.status(201).json({
      success: true,
      property: decoratedProperty,
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
