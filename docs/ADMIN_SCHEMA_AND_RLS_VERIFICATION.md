# Admin Schema and RLS Policy Verification Report

**Project**: MyAngan — Gurugram & South Delhi Rental Marketplace  
**Date**: 2026-07-28  
**Status**: ADMIN SCHEMA STATUS: APPLIED AND VERIFIED

---

## Executive Summary

This document verifies the database schema reconciliation, role enum standardization, single-role-per-user constraint, non-recursive RLS policies, and admin review tables for the MyAngan production database.

---

## 1. Remote & Local Migration Status

All 10 idempotent migrations are synchronized across local environment and remote Supabase project:

1. `20260719000000_init.sql` — Initial schema (`profiles`, `user_roles`, `properties`, `leads`, `favorites`, `brokers`, `waitlist`).
2. `20260720000000_otp_notifications.sql` — OTP verifications & notification logs.
3. `20260724000000_production_hardening.sql` — Security triggers, payment orders & audit logs.
4. `20260726120000_phase1_backend_foundation.sql` — Backend operations foundation.
5. `20260726150000_phase3_operational_modules.sql` — Maintenance tickets & agreements.
6. `20260726180000_fix_otp_activation_trigger.sql` — OTP trigger reconciliation.
7. `20260726190000_align_role_system.sql` — Category vs. operational role alignment.
8. `20260727000000_password_reset_tokens.sql` — Password recovery tokens.
9. `20260727120000_admin_review_system.sql` — Verification & listing review queues.
10. `20260728120000_reconcile_roles_and_admin_rls.sql` — Role enum, uniqueness, non-recursive RLS & admin review constraints.

---

## 2. Role Enum & Uniqueness Standard

* **Canonical Operational Roles**: `renter`, `owner`, `broker`, `admin`.
* **Legacy Role Handling**: `landlord` values safely updated to `owner` in `user_roles`.
* **Single Role Constraint**: Enforced `UNIQUE (user_id)` constraint on `public.user_roles`.
* **Trigger Synchronization**: `handle_new_user_sync()` syncs signups with `ON CONFLICT (user_id) DO UPDATE SET role = EXCLUDED.role`.

---

## 3. RLS Policy Security & Recursion Prevention

* **Helper Function**: Implemented `public.is_admin(check_user_id UUID)` as a `SECURITY DEFINER` function with explicit `SET search_path = public, pg_temp`.
* **Policy Refactoring**:
  * `public.user_roles`: Clean non-recursive RLS policy (`auth.uid() = user_id OR public.is_admin()`). Public user mutation blocked.
  * `public.properties`: Public visibility requires `status = 'active'` AND `approval_status IN ('approved', 'published')`. Owners/brokers have full access to their own listings.
  * `public.provider_verification_reviews`: Only admins may create/modify review decisions; providers view only their own records.
  * `public.listing_reviews`: Only admins may modify listing reviews; property owners view reviews for their property.

---

## 4. Admin Review Tables & Status Constraints

* `provider_verification_reviews.new_status` constrained to:
  `'pending'`, `'under_review'`, `'additional_information_required'`, `'approved'`, `'rejected'`, `'suspended'`.
* `properties.approval_status` constrained to:
  `'draft'`, `'pending_review'`, `'changes_requested'`, `'approved'`, `'published'`, `'rejected'`, `'suspended'`, `'archived'`.

---

## 5. Verification Commands Run

* Migration push: `npx supabase db push` — Succeeded.
* Migration list: `npx supabase migration list` — 100% synchronized (10/10 Local & Remote).
* Typecheck: `npm run typecheck` (`tsc --noEmit`) — **0 Errors**.
* Test suite: `npm run test:unit` (`tsx scripts/test-suite.ts`) — **64 Passed | 0 Failed**.
* Production build: `npm run build` — **Succeeded**.

---

**ADMIN SCHEMA STATUS: APPLIED AND VERIFIED**
