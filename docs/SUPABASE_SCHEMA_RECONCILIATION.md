# MyAngan - Supabase Database Schema Reconciliation Specification

This document details the canonical production schema design for Supabase Postgres, eliminating legacy table name mismatches and consolidating authorization roles.

---

## 1. Canonical Table Architecture

### A. Identity & Profiles
* **Authentication Identity:** `auth.users` (Managed by Supabase Auth engine).
* **User Profiles (`public.profiles`):**
  - Primary Key: `id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE`
  - Core Fields: `email`, `phone`, `full_name`, `avatar_url`, `is_verified`, `is_subscribed`, `subscribed_at`, `subscription_expires_at`, `created_at`, `updated_at`.

### B. Authorization & Role Isolation
* **User Roles Mapping (`public.user_roles`):**
  - Schema: `id UUID PRIMARY KEY`, `user_id UUID REFERENCES auth.users(id)`, `role app_role`.
  - Allowed Canonical Roles (`app_role` ENUM): `'renter'`, `'owner'`, `'broker'`, `'admin'`.
  - Legacy Mapping: `'landlord_broker'` in UI maps to `'owner'` or `'broker'` role entries in `public.user_roles`.

---

## 2. Table Reconciliation Matrix

| Older Model Object | Canonical Model Object | Reconciliation Action |
|---|---|---|
| `public.users` | `public.profiles` | Migrated schema and foreign key references to `public.profiles`. |
| `user_role` ENUM (`'landlord_broker'`) | `app_role` ENUM (`'renter'`, `'owner'`, `'broker'`, `'admin'`) | Reconciled roles to discrete `owner` and `broker` permissions. |
| `owner_id REFERENCES public.users` | `owner_id REFERENCES public.profiles` | Foreign keys updated to reference `public.profiles(id)`. |

---

## 3. Migration Sequence Order
1. `supabase/migrations/20260719000000_init.sql` — Base table structure & extensions.
2. `supabase/migrations/20260720000000_otp_notifications.sql` — OTP hash storage & notification triggers.
3. `supabase/migrations/20260724000000_production_hardening.sql` — Webhook idempotency table & RLS policies.
4. `supabase/migrations/20260726120000_phase1_backend_foundation.sql` — Production profiles, user_roles, properties, and private bucket policies.
5. `supabase/migrations/20260726150000_phase3_operational_modules.sql` — Maintenance tickets, agreements, verifications, and moderation queue.
