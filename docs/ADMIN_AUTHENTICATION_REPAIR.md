# MyAngan Administrator Authentication & Authorization Repair

## Overview
This document details the architectural repair implemented for administrator authentication, session handling, and API authorization in the MyAngan production codebase.

---

## 1. Supabase Client Decoupling (Separate Trust Levels)

Previously, a single mutable Supabase client instance was shared across authentication calls and database queries. Calling `signInWithPassword` on this shared instance attached the user's JWT session to the singleton client, which corrupted subsequent service-role database queries (e.g. querying `public.user_roles`) due to RLS policies evaluating under the user's unverified session context.

### Architectural Solution
The backend now maintains two strictly decoupled Supabase client factories in `server/db.ts`:

1. **Clean Server Admin Client (`getSupabaseAdminClient()`)**
   - **Credentials:** Uses `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` exclusively.
   - **Configuration:** `persistSession: false`, `autoRefreshToken: false`, `detectSessionInUrl: false`.
   - **Trust Boundaries:** Server-only. Used exclusively for privileged database queries (such as querying `public.user_roles`).
   - **Guarantees:** Never calls `signInWithPassword` and never has a user JWT session attached.

2. **Authentication Client (`getSupabaseAuthClient()`)**
   - **Credentials:** Uses `SUPABASE_URL` and `SUPABASE_ANON_KEY` / `VITE_SUPABASE_ANON_KEY`.
   - **Configuration:** `persistSession: false`, `autoRefreshToken: false`, `detectSessionInUrl: false`.
   - **Trust Boundaries:** Used exclusively for authenticating credentials (`signInWithPassword`) and validating Bearer session tokens (`auth.getUser(token)`).
   - **Guarantees:** Never reused for service-role database queries.

---

## 2. Admin Login Flow (`POST /api/admin/login`)

1. **Payload Validation:** Rejects malformed requests missing `email` or `password` with HTTP `400 Bad Request` (`ADMIN_AUTH_INVALID_CREDENTIALS`).
2. **Credential Authentication:** Authenticates credentials via `signInWithPassword` on the **Authentication Client**. Returns HTTP `401 Unauthorized` (`ADMIN_AUTH_INVALID_CREDENTIALS`) for invalid credentials.
3. **Operational Role Query:** Queries `public.user_roles` using the **Clean Server Admin Client** filtered strictly by `user_id = authenticated UUID` and `role = 'admin'`.
4. **Authorization Decisions:**
   - Returns HTTP `403 Forbidden` (`ADMIN_ACCESS_FORBIDDEN`) if the user lacks the `admin` role in `public.user_roles`.
   - Returns HTTP `500 Internal Server Error` (`ADMIN_ROLE_QUERY_FAILED`) for database query errors (ensuring DB errors are not masked as authorization rejections).
5. **Session Response:** Returns HTTP `200 OK` with the authentic Supabase session access token.

---

## 3. Bearer Token API Protection (`requireAdminAuth`)

All administrative API endpoints (`/api/admin/*`) strictly enforce Bearer token authorization:

1. **Header Requirement:** Requires an `Authorization: Bearer <access_token>` header. Missing tokens return HTTP `401 Unauthorized` (`ADMIN_AUTH_SESSION_MISSING`).
2. **Legacy/Spoof Header Rejection:** `x-user-email` headers and fabricated `email:admin` token strings are completely ignored and rejected with HTTP `401 Unauthorized` (`ADMIN_TOKEN_INVALID`).
3. **Token Verification:** Validates the Bearer token with Supabase Auth via `getSupabaseAuthClient().auth.getUser(token)` to retrieve the verified user UUID.
4. **Role Verification:** Verifies the user UUID in `public.user_roles` via `getSupabaseAdminClient()`. Rejects non-admin tokens with HTTP `403 Forbidden` (`ADMIN_ACCESS_FORBIDDEN`).
5. **Request Context:** Attaches only the verified admin identity to `req.adminUser`.

---

## 4. Admin Bootstrap CLI Security (`scripts/create-admin.ts`)

- **Strict Secret Enforcement:** Requires `INITIAL_ADMIN_PASSWORD` and `SUPABASE_SERVICE_ROLE_KEY` environment variables. Fails fast with exit code `1` if secrets are absent.
- **No Hardcoded Passwords:** Removed all default passwords (`SecretAdminPass123!`).
- **No Anon/VITE Key Fallbacks:** Refuses to run admin bootstrapping with non-service keys.
- **Credential Hygiene:** Does not output passwords or service keys in log streams.
- **Idempotency & Clean Roles:** Removes any existing non-admin role rows for the bootstrap account and inserts exactly one `admin` role row in `public.user_roles`.

---

## 5. Diagnostic Error Codes

Internal logging and audit logs incorporate standardized diagnostic codes:

| Code | Description |
| :--- | :--- |
| `ADMIN_LOGIN_SUCCESS` | Successful administrator login and session generation. |
| `ADMIN_AUTH_INVALID_CREDENTIALS` | Invalid email or password during login. |
| `ADMIN_AUTH_SESSION_MISSING` | Missing Authorization header or Bearer token on admin API. |
| `ADMIN_TOKEN_INVALID` | Invalid, expired, or spoofed session token. |
| `ADMIN_ACCESS_FORBIDDEN` | Authenticated user lacks `admin` operational role in `user_roles`. |
| `ADMIN_ROLE_QUERY_FAILED` | Internal database or client error querying `user_roles`. |

---

## 6. Verification Status

- `npm run typecheck`: **0 Errors**
- `npm run test:unit`: **60 / 60 Passed**
- `npx vitest run tests/admin_workflow.test.ts`: **10 / 10 Passed**
- `npm run build`: **Success**
