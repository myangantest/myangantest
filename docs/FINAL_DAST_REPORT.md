# MyAngan - Final Dynamic Application Security Testing (DAST) Report

**Audit Date:** July 2026  
**Target Environment:** Express Server & Vercel Function Endpoint  
**Automated Assertion Pass Rate:** 100% (50 Passed | 0 Failed)  

---

## 1. Dynamic Security Test Evidence

### A. Endpoint Access & Authorization
* **`GET /api/health`:** HTTP 200 OK `{"status":"ok"}` (Latency: 2.4 ms).
* **Unauthenticated Order Block:** `POST /api/payments/orders` without JWT returns HTTP 401 Unauthorized.
* **Unauthenticated Maintenance Block:** `POST /api/operations/tickets` returns HTTP 401.
* **Admin Privilege Escalation Guard:** `POST /api/admin/migrate-legacy` blocks unauthenticated calls with HTTP 401.

### B. Payment & Webhook Security
* **Signature Verification:** `POST /api/payments/verify` with empty signature payload returns HTTP 400 Bad Request.
* **Webhook Signature Guard:** `POST /api/payments/webhook` without `x-razorpay-signature` returns HTTP 400.
* **Idempotency Tracking:** Webhook event IDs logged in `public.payment_webhook_events` to prevent duplicate entitlement allocation.

### C. AI Search & Rent Estimation Security
* **Prompt Injection Defense:** `sanitizeSearchPrompt()` caps user prompt input at 500 characters and strips injection keywords.
* **Untrusted Output Normalization:** Model output parsed into strict JSON filter schemas (`city`, `bedrooms`, `maxRent`).
* **Informational Disclaimers:** Mandatory user disclaimers included in AI response payloads.
