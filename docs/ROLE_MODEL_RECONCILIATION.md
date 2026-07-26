# MyAngan Role Model Reconciliation Documentation

## 1. Role System Architecture & Alignment

MyAngan uses a clean two-tier role architecture that bridges the existing public signup interface with internal permissions:

### Tier 1: Public Signup Category (`account_category`)
The public signup UI presents two options:
1. **Renter** (`renter`): Users seeking flat rentals.
2. **Landlord/Broker** (`landlord_broker`): Users registering to list flats.

### Tier 2: Operational Roles (`app_role` in `public.user_roles`)
The internal operational roles are strictly separated:
- `renter`: Assigned automatically upon registration to `renter` category signups.
- `owner`: Assigned when a `landlord_broker` user completes onboarding and selects **Property Owner**.
- `broker`: Assigned when a `landlord_broker` user completes onboarding and selects **Real Estate Broker**.
- `admin`: Granted solely through trusted server-side administrative endpoints or manual database operations. Admin is never exposed to public signup or login forms.

---

## 2. Root Cause Audit of Previous Bug

* **Root Cause:** In the initial auth trigger function (`handle_new_user_sync()`), casting `(NEW.raw_user_meta_data->>'role')::public.app_role` threw an exception when the submitted value was `'landlord_broker'` (since `'landlord_broker'` was not part of the `app_role` enum).
* **Consequence:** The exception handler caught the error and defaulted `assigned_role` to `'renter'`, inserting `('renter')` into `public.user_roles` for all `landlord_broker` signups.

---

## 3. Reconciled Data Model & Migration Summary

1. **Supabase Schema Migration (`supabase/migrations/20260726190000_align_role_system.sql`):**
   * Added `account_category`, `onboarding_status`, `provider_type`, `account_status`, `email_verified_at` columns to `public.profiles`.
   * Reconciled `handle_new_user_sync()` trigger:
     * `renter` category $\rightarrow$ `onboarding_status = 'complete'`, `user_roles` assigned `'renter'`.
     * `landlord_broker` category $\rightarrow$ `onboarding_status = 'pending'`, `user_roles` entry omitted until onboarding.
   * Rebuilt `public.users` view with `COALESCE(r.role::text, p.account_category) AS role`.
   * Executed a non-destructive data repair migration that reconciled 2 existing test accounts created erroneously as renters back to `landlord_broker` (pending onboarding).

2. **Backend Server Protection (`server/auth.ts`):**
   * `POST /api/auth/register`: Rejects public requests for `admin`, `owner`, `broker`, or invalid roles with HTTP 400.
   * `POST /api/auth/onboarding`: Enforces secure post-verification onboarding where `landlord_broker` users select `owner` or `broker`.

3. **Frontend Views & Onboarding (`src/components/views/OnboardingView.tsx` & `src/App.tsx`):**
   * Added post-verification onboarding screen allowing `landlord_broker` users with `onboarding_status === 'pending'` to select **Property Owner** (`owner`) or **Broker Agent** (`broker`).
   * Aligned routing in `AuthView.tsx` and `App.tsx`.

---

## 4. Verification Scorecard

* **Typecheck (`npm run typecheck`):** **PASSED** (0 Errors)
* **Unit & Integration Tests (`npm run test:unit`):** **52 / 52 PASSED**
* **Production Build (`npm run build`):** **PASSED** (`dist/server.cjs` compiled cleanly)
* **Remote Supabase Push:** Migration `20260726190000_align_role_system.sql` applied to live remote project `movnfiidyffdpwyouxkl`.

---

ROLE MODEL STATUS: FIXED AND DEPLOYED
