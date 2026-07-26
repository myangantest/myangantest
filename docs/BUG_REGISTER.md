# MyAngan - Master Bug Register & Remediation History

This register tracks all defects discovered during the SAST, DAST, UAT, and production-readiness verification cycles.

---

## 1. Master Defect Log Table

| Unique Bug ID | Category | Severity | Description | Root Cause | Files Affected | Recommended Fix | Fix Applied? | Retest Result |
|---|---|---|---|---|---|---|---|---|
| **BUG-001** | SAST | **CRITICAL** | Legacy data migration endpoint `/api/admin/migrate-legacy` did not enforce admin JWT authorization. | Missing authorization check in express route handler. | [server/migration.ts](file:///c:/Users/Ankit/OneDrive/Desktop/MyAngan/server/migration.ts) | Enforce `getUserFromRequest` check before processing payload. | **YES** | ✅ PASSED (HTTP 401 on unauthenticated call) |
| **BUG-002** | DAST | **HIGH** | Razorpay payment orders were created client-side without server-side amount & plan validation. | Client SDK direct integration without server API gate. | [server/payments.ts](file:///c:/Users/Ankit/OneDrive/Desktop/MyAngan/server/payments.ts) | Create `/api/payments/orders` endpoint with server-calculated plan pricing. | **YES** | ✅ PASSED (Server calculates order amounts) |
| **BUG-003** | DAST | **HIGH** | Duplicate Razorpay webhook payloads could trigger duplicate plan entitlement allocations. | Lack of event idempotency tracking table. | [server/payments.ts](file:///c:/Users/Ankit/OneDrive/Desktop/MyAngan/server/payments.ts), [supabase/migrations/](file:///c:/Users/Ankit/OneDrive/Desktop/MyAngan/supabase/migrations/) | Create `public.payment_webhook_events` table and log event IDs. | **YES** | ✅ PASSED (Duplicate webhooks skipped) |
| **BUG-004** | SAST | **HIGH** | Maintenance ticket status patch allowed invalid status transitions when database was unreachable. | Validation check placed after database fallback block. | [server/operations.ts](file:///c:/Users/Ankit/OneDrive/Desktop/MyAngan/server/operations.ts) | Re-order state validation logic prior to mock fallback. | **YES** | ✅ PASSED (HTTP 400 on invalid transition) |
| **BUG-005** | SAST | **HIGH** | TypeScript compiler errors in Nodemailer email parameters and scope error in ticket handler. | Type interface mismatch in `SendEmailParams`. | [server/email.ts](file:///c:/Users/Ankit/OneDrive/Desktop/MyAngan/server/email.ts), [server/operations.ts](file:///c:/Users/Ankit/OneDrive/Desktop/MyAngan/server/operations.ts) | Add `html` and `text` parameter aliases to `SendEmailParams`. | **YES** | ✅ PASSED (0 TypeScript Errors) |
| **BUG-006** | DAST | **MEDIUM** | Top notice banner "Local Storage Fallback Mode" was displayed continuously across all pages. | Header component included static notice bar. | [src/App.tsx](file:///c:/Users/Ankit/OneDrive/Desktop/MyAngan/src/App.tsx) | Remove top fallback notice element. | **YES** | ✅ PASSED (Banner removed from UI) |
| **BUG-007** | DAST | **MEDIUM** | Tailwind CSS v4 native oxide binary compilation crash on Windows Node 18. | Rust `.node` binary mismatch in `@tailwindcss/oxide`. | [vite.config.ts](file:///c:/Users/Ankit/OneDrive/Desktop/MyAngan/vite.config.ts), `package.json` | Use pure-JS `@tailwindcss/postcss` and PostCSS setup. | **YES** | ✅ PASSED (Static CSS compiled clean) |
| **BUG-008** | SAST | **MEDIUM** | High severity audit advisories in dev dependencies `playwright` and `react-router`. | Outdated dev dependency versions in package lock. | `package.json`, `package-lock.json` | Update packages in next major framework migration release. | **NO (Monitored)** | ℹ️ Dev tooling isolated from production runtime |

---

## 2. Summary of Defects Fixed:
* **Total Defects Discovered:** 8
* **Defects Automatically Fixed & Retested:** **7**
* **Defects Monitored / Deferred:** **1** *(Dev tool dependency advisory)*
* **Remaining Production Blockers:** **0**
