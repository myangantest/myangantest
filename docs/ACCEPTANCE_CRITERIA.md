# MyAngan - Acceptance Criteria & Quality Gates

This document defines the strict acceptance criteria, automated verification commands, and pass/fail thresholds required for every remediation task before production deployment.

---

## 1. Quality Gates & Verification Matrix

### Phase 0: Immediate Production Blockers

#### TASK-001: Admin API JWT Bearer Authorization
* **Pass Threshold:** 100% of unauthenticated requests to `/api/admin/*` receive HTTP 401; non-admin tokens receive HTTP 403.
* **Verification Command:** `npm run test` & `npx tsx scripts/test-suite.ts`
* **Pass Criteria:**
  ```bash
  curl -i -X POST http://localhost:3000/api/admin/migrate-legacy
  # Must return: HTTP/1.1 401 Unauthorized {"error": "Missing or invalid authorization token."}
  ```

#### TASK-002: Server-Side Razorpay Order Creation & Webhook Handler
* **Pass Threshold:** 100% of order creations execute server-side via Razorpay Node SDK; webhook signature verification succeeds with HMAC SHA-256 matching.
* **Verification Command:** `npm run test:api`
* **Pass Criteria:**
  - `POST /api/payment/create-order` returns `{ "orderId": "order_..." }` with status 200.
  - `POST /api/payment/webhook` with invalid signature returns HTTP 400 Bad Request.

#### TASK-003: Rate Limiting & Helmet Headers
* **Pass Threshold:** Rapid burst (>5 OTP requests/hour or >100 API requests/15 mins per IP) receives HTTP 429 Too Many Requests.
* **Verification Command:** `npx tsx scripts/test-suite.ts`
* **Pass Criteria:**
  - Response headers include `X-Content-Type-Options: nosniff`, `Strict-Transport-Security`, and `Content-Security-Policy`.

---

### Phase 1: Core Rental Marketplace

#### TASK-101: Supabase Image Storage Upload
* **Pass Threshold:** Uploaded images store directly in Supabase bucket `property-images` returning valid CDN URLs (`https://...supabase.co/storage/v1/object/public/property-images/...`).
* **Verification Command:** `npm run build && npm run test`
* **Pass Criteria:** `image_urls` in `properties` table contain valid CDN HTTP/HTTPS URLs.

#### TASK-102: Property Status Moderation Workflow
* **Pass Threshold:** Newly posted listings default to `status = 'pending'`. Only admin users can transition status to `active`.
* **Verification Command:** `npx tsx scripts/test-suite.ts`
* **Pass Criteria:** Public search endpoint `GET /properties` filters out `pending` and `inactive` properties for non-admin users.

---

### Phase 2: Payment & Communication

#### TASK-201: Idempotent Webhook Processing
* **Pass Threshold:** 100% of duplicate Razorpay webhook events (`payment.captured`) process idempotently without duplicate row creation or multi-entitlement activation.
* **Verification Command:** `npm run test:api`
* **Pass Criteria:**
  - First webhook POST returns HTTP 200 and activates subscription.
  - Second identical webhook POST returns HTTP 200 with `{ "status": "already_processed" }`.

---

### Phase 3: Operational Modules

#### TASK-301: Maintenance Tickets Persistence
* **Pass Threshold:** Submitting a ticket creates a row in `maintenance_tickets` table with category, urgency, description, and tenant ID.
* **Verification Command:** `npm run test`
* **Pass Criteria:** Landlord dashboard queries `maintenance_tickets` for owned properties and displays active SLA status.

#### TASK-302: Lease Agreement Record & PDF Template
* **Pass Threshold:** Agreement generator saves terms to `agreements` table and generates downloadable PDF titled "Informational Tenancy Agreement Template".
* **Verification Command:** `npm run test`
* **Pass Criteria:** PDF download generates valid `%PDF-1.4` file header.

---

### Phase 4: AI & Advanced Capabilities

#### TASK-401: Server-Side Google GenAI Integration
* **Pass Threshold:** AI Search endpoint `POST /api/ai/search-assistant` queries Gemini 1.5/2.0 API and returns structured JSON filters.
* **Verification Command:** `npm run test:api`
* **Pass Criteria:** Invalid API key gracefully falls back to structured error JSON without bringing down the Express process.

---

## 2. Automated Test Commands & Execution Thresholds

```bash
# 1. Typecheck and Linting Gate (Must pass 0 errors)
npx tsc --noEmit

# 2. Vitest Unit & API Integration Test Gate (Must pass 100%)
npm run test

# 3. Full-Stack System QA Test Suite Gate (Must pass 25/25 assertions)
npx tsx scripts/test-suite.ts

# 4. Production Build Gate (Must compile clean bundle)
npm run build
```
