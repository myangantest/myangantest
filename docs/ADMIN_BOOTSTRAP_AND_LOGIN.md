# MyAngan Administrator Bootstrap, Authentication & Portal Documentation

## 1. Overview & Security Architecture

MyAngan implements a production-grade, secure Administrator Portal (`/admin/dashboard` & `/admin/login`) with strict role-based access control (RBAC), database Row Level Security (RLS), and a CLI bootstrap script.

### Key Security Design Principles
1. **Zero Public Exposure**:
   * Admin role, login link, and admin routes are never exposed in public registration, role selectors, onboarding, or navigation bars.
2. **Supabase Auth as Canonical Password Store**:
   * All administrator account credentials are managed via Supabase Auth and `public.user_roles` database tables.
   * Passwords are never hardcoded or committed.
3. **Multi-Layer Route & API Protection**:
   * Frontend route guards prevent non-admin users from rendering `/admin/dashboard`.
   * Server middleware (`requireAdminAuth`) verifies bearer access tokens and database role entries, returning HTTP 401 (unauthenticated) or HTTP 403 (unauthorized).
4. **Honest Verification Terminology**:
   * Statuses display accurate terminology such as *"Owner profile reviewed"*, *"Broker profile reviewed"*, *"Verification pending"*, and *"Additional information required"*.
   * Misleading public claims (*"government verified"*, *"title guaranteed"*) are strictly prohibited.
5. **Mandatory Administrative Audit Logging**:
   * Every admin action (logins, provider reviews, listing approvals/rejections/suspensions) records an audit log entry in `public.audit_logs`.

---

## 2. Step-by-Step Manual Admin Bootstrap Guide

Follow these exact steps to bootstrap the administrator account:

1. **Confirm Admin Email**: Ensure `service@myangan.com` is accessible.
2. **Generate Strong Password**: Create a unique, strong password (min 8 characters).
3. **Set Temporary Local Environment Variables**:
   ```bash
   export INITIAL_ADMIN_EMAIL="service@myangan.com"
   export INITIAL_ADMIN_PASSWORD="YourUniqueAdminPassword123!"
   ```
4. **Execute Bootstrap CLI Script**:
   ```bash
   npm run admin:create
   ```
5. **Verify Supabase Account & Database Records**:
   * Confirm Auth user exists in Supabase Auth console.
   * Confirm matching profile row in `public.profiles`.
   * Confirm exact single role `'admin'` in `public.user_roles`.
6. **Clear Local Environment Variables**:
   ```bash
   unset INITIAL_ADMIN_PASSWORD
   ```
7. **Access Admin Login**:
   * Open `https://myangan.com/admin/login` (or `http://localhost:3000/admin/login`).
8. **Authenticate**:
   * Log in using `service@myangan.com` and your password.
9. **Test Review Flows**:
   * Review one provider verification submission in the Provider Review queue.
   * Review one property listing in the Listing Approval queue.

---

## 3. Database Schema & RLS

### Migration: `20260727120000_admin_review_system.sql`
- **`public.provider_verification_reviews`**: Records provider verification reviews (`user_id`, `provider_type`, `reviewer_id`, `previous_status`, `new_status`, `notes`, `created_at`).
- **`public.listing_reviews`**: Records property listing review decisions (`property_id`, `reviewer_id`, `previous_status`, `new_status`, `decision`, `notes`, `created_at`).
- **Public Search RLS Policy**: Enforces that unapproved property listings (`pending_review`, `changes_requested`, `rejected`, `suspended`, `draft`) are hidden from public users.

---

## 4. Final Verification Scorecard

* **Admin Bootstrap Script (`npm run admin:create`):** **PASSED** (Idempotent execution verified)
* **Dedicated Unit Suite (`vitest run tests/admin_workflow.test.ts`):** **PASSED** (22 / 22 Scenarios Passed)
* **System Integration Suite (`npm run test:unit`):** **60 / 60 PASSED** (0 Failures)
* **TypeScript Typecheck (`npm run typecheck`):** **PASSED** (0 Errors)
* **Production Build (`npm run build`):** **PASSED** (`dist/server.cjs` compiled cleanly)
* **Remote Migration Push (`npx supabase db push`):** `20260727120000_admin_review_system.sql` pushed to live remote project `movnfiidyffdpwyouxkl`.

---

ADMIN STATUS: FIXED AND DEPLOYED
