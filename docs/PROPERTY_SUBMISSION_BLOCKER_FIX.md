# Documentation: Property Submission Route & Role Lookup Blocker Repairs

## Overview
This document summarizes the technical fixes implemented to resolve production property-submission blockers on MyAngan.

---

## Proven Root Causes & Technical Solutions

### 1. `POST /api/properties` Returning 404 Not Found on Vercel
- **Root Cause**: `server.ts` registered `propertyRouter` at `/api/properties`, but Vercel routes serverless API calls through `api/index.ts`. `api/index.ts` was missing the `propertyRouter` import and route mount.
- **Fix**:
  - Imported `propertyRouter` in [api/index.ts](file:///c:/Users/Ankit/OneDrive/Desktop/MyAngan/api/index.ts).
  - Mounted `app.use('/api/properties', propertyRouter)` BEFORE `/api` catch-all route handler.
  - Verified route existence with integration tests asserting HTTP non-404 status.

### 2. Supabase 406 Not Acceptable on `public.user_roles`
- **Root Cause**: `.single()` or `.maybeSingle()` queries on `public.user_roles` send PostgREST `Accept: application/vnd.pgrst.object+json` header. If a user account has zero rows or duplicate role rows, PostgREST returns HTTP 406.
- **Fix**:
  - Replaced `.single()` calls in `src/lib/db.ts` and `server/properties.ts` with list queries (`.select('role').eq('user_id', userId)`).
  - Created forward-only migration [20260730120000_user_roles_uniqueness.sql](file:///c:/Users/Ankit/OneDrive/Desktop/MyAngan/supabase/migrations/20260730120000_user_roles_uniqueness.sql) to deduplicate existing role rows and enforce `UNIQUE (user_id)` constraint on `public.user_roles`.
  - Updated `handle_new_user_sync()` trigger to upsert single operational role using `ON CONFLICT (user_id) DO UPDATE SET role = EXCLUDED.role`.
  - Implemented deterministic role rank resolution (`admin` > `broker` > `owner` > `renter`) and explicit error handling (`ROLE_NOT_FOUND`, `ROLE_DUPLICATE`, `ROLE_QUERY_FAILED`, `ROLE_FORBIDDEN`).

### 3. Stuck Submit Loading State on Frontend
- **Root Cause**: Uncaught promise rejections or unhandled response structures left `submitting` true in `PostPropertyView.tsx`.
- **Fix**:
  - Enforced `try / catch / finally` structure in [PostPropertyView.tsx](file:///c:/Users/Ankit/OneDrive/Desktop/MyAngan/src/components/views/PostPropertyView.tsx) to ensure `setSubmitting(false)` ALWAYS executes.
  - Form state values are preserved on recoverable network or validation failures.
  - Clear inline error banner displays human-readable error messages and server `requestId` references.

---

## Verification Summary
- **Migration**: Pushed `20260730120000_user_roles_uniqueness.sql` to live database via `npx supabase db push`.
- **Typecheck**: `npm run typecheck` passed with 0 errors.
- **Unit & System Suite**: `npm run test:unit` passed **67 / 67 tests**.
- **Vitest Suite**: `npm run test` passed **83 / 83 tests** across 12 test files.
- **Production Build**: `npm run build` compiled client bundle and `dist/server.cjs` successfully.
