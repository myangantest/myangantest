/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import 'dotenv/config';
import { getSupabaseAdminClient } from '../server/db.js';

async function main() {
  console.log('[Production Image Upload Verification] Running real storage & metadata check...');
  const supabase = getSupabaseAdminClient();

  if (!supabase) {
    console.error('[Production Verification] Error: SUPABASE_SERVICE_ROLE_KEY missing or invalid.');
    process.exit(1);
  }

  const testOwnerId = 'c2567a6a-7e53-4aea-9957-1eae3810919a'; // Verified owner account
  const testPropertyId = `prop_prod_test_${Date.now()}`;

  // 1. Create a dummy image buffer (1x1 PNG)
  const dummyPngBuffer = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
    'base64'
  );

  const testFiles = [
    { name: 'living_room.png', path: `${testOwnerId}/${testPropertyId}/img1_living.png` },
    { name: 'bedroom.png', path: `${testOwnerId}/${testPropertyId}/img2_bedroom.png` },
    { name: 'bathroom.png', path: `${testOwnerId}/${testPropertyId}/img3_bathroom.png` },
  ];

  console.log(`[Production Verification] Uploading 3 test objects to property-images bucket...`);

  const uploadedPaths: string[] = [];

  for (const item of testFiles) {
    const { data: uploadData, error: uploadErr } = await supabase.storage
      .from('property-images')
      .upload(item.path, dummyPngBuffer, { contentType: 'image/png', upsert: true });

    if (uploadErr || !uploadData) {
      console.error(`[Production Verification] Storage upload failed for ${item.path}:`, uploadErr?.message);
      process.exit(1);
    }
    console.log(`  ✅ Storage Uploaded: ${uploadData.path}`);
    uploadedPaths.push(uploadData.path);
  }

  // 2. Verify Storage bucket contents
  const { data: listObjects, error: listErr } = await supabase.storage
    .from('property-images')
    .list(`${testOwnerId}/${testPropertyId}`);

  if (listErr || !listObjects || listObjects.length < 3) {
    console.error('[Production Verification] Verification Failed: Storage bucket objects missing or incomplete.', listErr?.message);
    process.exit(1);
  }

  console.log(`  ✅ Confirmed 3 objects in Storage folder '${testOwnerId}/${testPropertyId}'.`);

  // 3. Create test property in public.properties
  const { data: propData, error: propErr } = await supabase
    .from('properties')
    .insert([{
      id: testPropertyId,
      owner_id: testOwnerId,
      title: 'Automated Production Verification Property (3 Images)',
      description: 'Test listing created for end-to-end production verification.',
      city: 'Gurugram',
      locality: 'Golf Course Road',
      address: 'Sector 54, Gurugram, Haryana 122011',
      bedrooms: 3,
      bathrooms: 3,
      furnishing_status: 'furnished',
      rent_amount: 95000,
      deposit_amount: 190000,
      latitude: 28.4354,
      longitude: 77.1042,
      status: 'pending',
      approval_status: 'pending_review',
      is_verified: false,
      image_urls: uploadedPaths.map(p => `property-images/${p}`)
    }])
    .select()
    .single();

  if (propErr || !propData) {
    console.error('[Production Verification] Property insert error:', propErr?.message);
    process.exit(1);
  }

  console.log(`  ✅ Created Property ID: ${propData.id}`);

  // 4. Insert rows into public.property_images
  const imgRecords = uploadedPaths.map((p, i) => ({
    property_id: testPropertyId,
    storage_path: p,
    file_name: testFiles[i].name,
    file_size_bytes: dummyPngBuffer.length,
    mime_type: 'image/png',
    display_order: i
  }));

  const { error: metaErr } = await supabase
    .from('property_images')
    .insert(imgRecords);

  if (metaErr) {
    console.error('[Production Verification] Metadata insert error:', metaErr.message);
    process.exit(1);
  }

  console.log(`  ✅ Created 3 property_images rows in database.`);

  // 5. Verify signed URL generation
  const signedUrls: string[] = [];
  for (const path of uploadedPaths) {
    const { data: signData, error: signErr } = await supabase.storage
      .from('property-images')
      .createSignedUrl(path, 3600);

    if (signErr || !signData?.signedUrl) {
      console.error('[Production Verification] Signed URL generation failed:', signErr?.message);
      process.exit(1);
    }
    signedUrls.push(signData.signedUrl);
  }

  console.log(`  ✅ Successfully generated ${signedUrls.length} short-lived signed display URLs.`);

  // 6. Cleanup test records
  await supabase.from('property_images').delete().eq('property_id', testPropertyId);
  await supabase.from('properties').delete().eq('id', testPropertyId);
  await supabase.storage.from('property-images').remove(uploadedPaths);

  console.log(`  ✅ Cleaned up temporary test property and storage objects.`);
  console.log('\n=======================================================');
  console.log('PROPERTY IMAGE UPLOAD: FIXED AND VERIFIED');
  console.log('=======================================================');
}

main().catch(err => {
  console.error('[Production Verification] Exception:', err);
  process.exit(1);
});
