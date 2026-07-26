# MyAngan - Master Security Findings & Mitigation Register

This document aggregates all security findings across Static (SAST) and Dynamic (DAST) testing cycles, detailing threat vectors, mitigation controls, and verification status.

---

## 1. Master Security Findings & Controls Matrix

| ID | Category | Severity | Threat Vector / Finding | Mitigation Control Applied | Verification Status |
|---|---|---|---|---|---|
| **SEC-01** | SAST | **CRITICAL** | Migration endpoint `/api/admin/migrate-legacy` lacked JWT authentication check. | Added `getUserFromRequest` admin JWT middleware in `server/migration.ts`. | ✅ PASSED (Returns HTTP 401) |
| **SEC-02** | SAST / DAST | **CRITICAL** | Client-only payment entitlement activation vulnerability. | Implemented server-side Razorpay order creation (`/api/payments/orders`) & HMAC SHA-256 verification (`/api/payments/verify`). | ✅ PASSED (Server HMAC verified) |
| **SEC-03** | DAST | **HIGH** | Razorpay webhook replay attack vulnerability. | Added `public.payment_webhook_events` idempotency tracking table to reject duplicate webhook events. | ✅ PASSED (Duplicate events skipped) |
| **SEC-04** | SAST | **HIGH** | Maintenance ticket status patch allowed unvalidated state transitions in mock mode. | Re-ordered status validation logic before mock fallback in `server/operations.ts`. | ✅ PASSED (Returns HTTP 400) |
| **SEC-05** | SAST | **HIGH** | TypeScript compilation type mismatches in email params & ticket variable scope. | Added parameter aliases (`html`, `text`) to `SendEmailParams` and initialized `ticket` scope. | ✅ PASSED (0 Type Errors) |
| **SEC-06** | DAST | **MEDIUM** | Potential prompt injection keywords (`drop table`, `ignore previous instructions`) in AI search assistant. | Added `sanitizeSearchPrompt()` in `server/ai.ts` to truncate prompt input to 500 chars and strip keywords. | ✅ PASSED (Sanitized prompt input) |
| **SEC-07** | SAST | **MEDIUM** | Dependency advisories in dev package `playwright` and `react-router`. | Identified in `npm audit`; marked for update in CI/CD pipeline. Dev tools isolated from runtime. | ℹ️ MONITORED |
| **SEC-08** | SAST | **LOW** | Node.js 18 runtime engine warning vs Node.js 22 recommendation. | Supabase JS SDK warning; Node 22 upgrade recommended for production hosting platform. | ℹ️ DOCUMENTED |

---

## 2. Cryptographic Security Standards Summary

1. **Constant-Time HMAC SHA-256 Comparisons:** Enforced via `crypto.timingSafeEqual` in `server/payments.ts` and `server/auth.ts`.
2. **OTP Hash Isolation:** OTP codes are hashed server-side using HMAC SHA-256 with `OTP_HASH_SECRET`. Plaintext OTP values are never stored or logged.
3. **Anti-XSS Content Escaping:** All user-supplied string fields rendered inside Nodemailer HTML email bodies or PDF documents are sanitized via `escapeHtml()`.
