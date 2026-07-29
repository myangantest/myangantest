import 'dotenv/config';
import { getSupabaseAdminClient } from '../server/db.js';

async function main() {
  console.log('[Image Repair Script] Starting production image audit and cleanup...');
  const supabase = getSupabaseAdminClient();

  if (!supabase) {
    console.error('[Image Repair Script] Error: SUPABASE_SERVICE_ROLE_KEY or database connection missing.');
    process.exit(1);
  }

  // 1. Fetch properties with image_urls
  const { data: properties, error: pErr } = await supabase
    .from('properties')
    .select('id, title, image_urls');

  if (pErr) {
    console.error('[Image Repair Script] Error fetching properties:', pErr.message);
    process.exit(1);
  }

  console.log(`[Image Repair Script] Auditing ${properties?.length || 0} properties...`);

  let repairedCount = 0;

  for (const prop of (properties || [])) {
    const rawUrls: string[] = prop.image_urls || [];
    if (rawUrls.length === 0) continue;

    // Check if property has matching property_images rows
    const { data: imageRows } = await supabase
      .from('property_images')
      .select('id, storage_path')
      .eq('property_id', prop.id);

    const validPaths: string[] = [];

    if (imageRows && imageRows.length > 0) {
      for (const row of imageRows) {
        // Verify object exists in storage
        const { data: listData, error: listErr } = await supabase.storage
          .from('property-images')
          .list(row.storage_path.split('/')[0] + '/' + row.storage_path.split('/')[1]);

        const fileName = row.storage_path.split('/').pop();
        const exists = listData && listData.some(f => f.name === fileName);

        if (exists) {
          validPaths.push(`property-images/${row.storage_path}`);
        } else {
          console.warn(`[Image Repair Script] Removing orphan metadata row for missing storage file: ${row.storage_path}`);
          await supabase.from('property_images').delete().eq('id', row.id);
        }
      }
    }

    if (validPaths.length !== rawUrls.length) {
      console.log(`[Image Repair Script] Updating property ${prop.id} ("${prop.title}"): Replacing ${rawUrls.length} paths with ${validPaths.length} verified paths.`);
      await supabase
        .from('properties')
        .update({ image_urls: validPaths })
        .eq('id', prop.id);

      repairedCount++;
    }
  }

  console.log(`[Image Repair Script] Audit complete. Repaired ${repairedCount} property listing(s).`);
}

main().catch(err => {
  console.error('[Image Repair Script] Unhandled exception:', err);
  process.exit(1);
});
