# MyAngan OTP Verification & Account Activation Fix Documentation

## 1. Root Cause Analysis

- **Exact Error Message:**
  `Unauthorized: Only administrators can modify verification or subscription status.`

- **Failure Location:**
  `supabase/migrations/20260724000000_production_hardening.sql` line 13 inside database trigger function `public.check_profile_sensitive_fields_update()`.

- **API Endpoint:**
  `POST /api/auth/verify-otp` (server/auth.ts)

- **Root Cause Mechanics:**
  During registration OTP verification, the backend attempted to set `is_verified: true` on `public.profiles`. The database trigger function `check_profile_sensitive_fields_update()` intercepted all updates to `is_verified` or `is_subscribed` and checked if `auth.uid()` had the `admin` role. Because standard users are not admins and the trigger did not exempt `auth.role() = 'service_role'` (trusted server API calls), the database raised an exception and blocked account activation.

---

## 2. Changes Made

1. **Database Trigger Update (`supabase/migrations/20260726180000_fix_otp_activation_trigger.sql`):**
   * Modified `check_profile_sensitive_fields_update()` to permit updates when `auth.role() = 'service_role'`.
   * Maintained strict admin-only restrictions against direct unprivileged client updates from browsers (`auth.role() = 'authenticated'`).

2. **Server-Side Activation Method (`server/db.ts`):**
   * Implemented narrow method `activateAccountAfterOtpVerification(userId)` that updates exclusively `is_verified: true` and `updated_at` via the trusted server Supabase client.
   * Separated admin management methods (`updateUserVerificationByAdmin` & `updateSubscriptionByAdmin`).

3. **Strict OTP Verification Endpoint (`server/auth.ts`):**
   * Implemented strict parameter validation and email normalization.
   * Added idempotency check (returns HTTP 200 OK success if account is already verified).
   * Enforced atomic OTP consumption and timing-safe hash comparison without logging raw OTP values.

4. **Frontend Payload Optimization (`src/components/views/AuthView.tsx`):**
   * Ensured `POST /api/auth/verify-otp` receives only minimal payload (`email`, `code`, `purpose: 'registration_otp'`).

---

## 3. Verification & Test Summary

* **Unit & Integration Suite:** 50/50 Tests Passed.
* **TypeScript Compilation:** 0 Type Errors (`tsc --noEmit`).
* **Production Build:** `dist/server.cjs` compiled cleanly.
* **Remote Supabase Push:** Migration `20260726180000_fix_otp_activation_trigger.sql` applied to live remote project `movnfiidyffdpwyouxkl`.

---

OTP ACTIVATION STATUS: FIXED AND DEPLOYED
