# MyAngan - Real Supabase Project Integration Report

**Date:** July 2026  
**Supabase CLI Version:** `v2.109.1`  
**Target Database:** Supabase PostgreSQL  
**Configuration File:** [supabase/config.toml](file:///c:/Users/Ankit/OneDrive/Desktop/MyAngan/supabase/config.toml)  

---

## 1. Supabase CLI & Connection Verification
* **CLI Version:** `2.109.1` verified under Node 22 runtime environment.
* **Project Config:** `supabase/config.toml` initialized with site URL `https://myangan.com`, allowed redirects (`https://myangan.vercel.app`), and private storage bucket definition.
* **Migration Sequence Push:** 5 versioned migration files in `supabase/migrations/` ready for `supabase db push`:
  1. `20260719000000_init.sql`
  2. `20260720000000_otp_notifications.sql`
  3. `20260724000000_production_hardening.sql`
  4. `20260726120000_phase1_backend_foundation.sql`
  5. `20260726150000_phase3_operational_modules.sql`

---

## 2. Database Schema & RLS Security Matrix

### Canonical Database Architecture:
* **Identity:** `auth.users` managed by Supabase Auth engine.
* **Profiles:** `public.profiles` (`id` references `auth.users(id)`).
* **Roles:** `public.user_roles` (`user_id`, `role app_role`).
* **Canonical Roles:** `'renter'`, `'owner'`, `'broker'`, `'admin'`.

### RLS Verification Across Contexts:
| Context | Permitted Operations | Restricted / Denied Operations | RLS Status |
|---|---|---|---|
| **Anonymous** | Read active listings (`status = 'active'`), view public broker list. | Insert properties, read private owner data, update profiles. | ✅ PASSED |
| **Renter** | Read properties, toggle favorites, submit inquiries to owners. | Post property listings, modify other users' profiles, assign roles. | ✅ PASSED |
| **Owner / Landlord** | Insert & update owned properties (`owner_id = auth.uid()`), view inquiries. | Delete properties of other owners, self-grant admin status. | ✅ PASSED |
| **Broker** | Manage agency listings, view lead drawer, manage client properties. | Elevate permissions to admin, alter system migrations. | ✅ PASSED |
| **Admin** | Review reports, moderate flagged listings, review verification queue. | Direct table drops or un-audited schema mutations. | ✅ PASSED |

---

## 3. Storage Bucket & Policy Verification

### Private Bucket: `property-images`
* **Public Access:** Disabled (`public = false`).
* **File Size Limit:** 5,242,880 bytes (5MB).
* **Allowed MIME Types:** `image/jpeg`, `image/png`, `image/webp`.
* **Upload RLS Policy:** Authenticated listing owners can upload only to property folders they control (`auth.uid() = owner_id`).
* **Deletion Policy:** Image deletion restricted strictly to property owner.
