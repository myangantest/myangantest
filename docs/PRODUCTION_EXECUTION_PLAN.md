# MyAngan - Production Execution & Remediation Plan

This document defines the production remediation roadmap for **MyAngan**, prioritizing production safety, security, data integrity, and compliance over new features.

---

## Terminology & Description Compliance Directives

To maintain technical accuracy and prevent misleading claims, all feature descriptions adhere to the following rules:
* **No Blockchain Claims:** Features are named *Digital Property Record* or *Verification Audit Trail*; no "blockchain verified" claims.
* **No Legal Verification Claims:** Boolean `is_verified` flags are described as *Admin Listing Verification Badge*, not "legally verified".
* **No Mock KYC Claims:** Identity checks are classified as *User Profile Verification Request*, not "complete KYC".
* **No Mock E-Stamping Claims:** PDF agreement generation is called *Lease Agreement Document Generator*, not "e-Stamping".
* **No Mock E-Signature Claims:** Canvas/text inputs are called *Simulated Signature Field*, not "legally valid e-signature".
* **No Unverified Legal Compliance Claims:** Rental templates are marked *Informational Agreement Template*, not "Model Tenancy Act Compliant".
* **Informational Rent Estimates:** AI/Algorithm pricing suggestions are marked *Informational Rental Price Estimate*.

---

## PHASE 0 — Immediate Production Blockers (Priority P0)

### TASK-001: Protect Express Admin API Routes with Bearer JWT Authorization
* **Priority:** P0 (Immediate Blocker)
* **Current Status:** `BROKEN / INSECURE` ([server/migration.ts](file:///c:/Users/Ankit/OneDrive/Desktop/MyAngan/server/migration.ts))
* **Files to Modify:** `server/migration.ts`, `server/auth.ts`, `server.ts`
* **Database Migration Required:** None.
* **API Endpoints Required:** `POST /api/admin/migrate-legacy`
* **RLS / Authorization Requirements:** Bearer JWT session token validation + `users.role = 'admin'` check.
* **Environment Variables:** `SUPABASE_JWT_SECRET`
* **Acceptance Criteria:** Unauthenticated requests to `/api/admin/*` return HTTP 401 Unauthorized; non-admin users return HTTP 403 Forbidden.
* **Unit Tests:** `tests/auth-middleware.test.ts` (Validates header extraction & JWT verification logic).
* **Integration Tests:** `tests/api.test.ts` (Supertest GET/POST to `/api/admin/migrate-legacy` without token returns HTTP 401).
* **End-to-End Tests:** Playwright spec asserting admin panel API rejects unauthenticated fetch calls.
* **Manual Verification:** Send curl POST request to `http://localhost:3000/api/admin/migrate-legacy` without headers; verify 401 response.
* **Rollback Method:** Revert commit on `server/migration.ts`.
* **Dependencies:** None.
* **Risk Level:** CRITICAL (Exposes database migration utilities to unauthenticated internet traffic).

---

### TASK-002: Implement Server-Side Razorpay Order Creation & Webhook Processing
* **Priority:** P0 (Immediate Blocker)
* **Current Status:** `PARTIALLY_IMPLEMENTED` ([RazorpayModal.tsx](file:///c:/Users/Ankit/OneDrive/Desktop/MyAngan/src/components/RazorpayModal.tsx), [server/auth.ts](file:///c:/Users/Ankit/OneDrive/Desktop/MyAngan/server/auth.ts))
* **Files to Modify:** `server/auth.ts`, `server.ts`, `src/components/RazorpayModal.tsx`
* **Database Migration Required:** `20260724000000_production_hardening.sql` (Ensure `payment_orders` and `payment_events` tables applied).
* **API Endpoints Required:** `POST /api/payment/create-order`, `POST /api/payment/webhook`, `POST /api/payment/verify-razorpay`
* **RLS / Authorization Requirements:** Authenticated user session required for order creation; Razorpay HMAC SHA-256 header validation for webhooks.
* **Environment Variables:** `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`, `VITE_RAZORPAY_KEY_ID`
* **Acceptance Criteria:** Orders created server-side via official Razorpay SDK; payment webhooks processed idempotently into `payment_events` and user entitlement updated even if browser disconnects.
* **Unit Tests:** `tests/razorpay.test.ts` (HMAC signature verification unit tests).
* **Integration Tests:** `tests/api-payment.test.ts` (Supertest POST `/api/payment/create-order` & webhook handling).
* **End-to-End Tests:** Mocked Razorpay Checkout flow verifying backend webhook callback entitlement activation.
* **Manual Verification:** Use Razorpay Webhook CLI simulator to send `payment.captured` event; verify user `is_subscribed` set to `true` in database.
* **Rollback Method:** Disable webhook router flag `ENABLE_PAYMENT_WEBHOOKS=false`.
* **Dependencies:** TASK-001.
* **Risk Level:** CRITICAL (Risk of payment entitlement loss and unverified financial transactions).

---

### TASK-003: Configure Rate Limiting & Security Headers
* **Priority:** P0 (Immediate Blocker)
* **Current Status:** `MISSING` ([server.ts](file:///c:/Users/Ankit/OneDrive/Desktop/MyAngan/server.ts))
* **Files to Modify:** `server.ts`, `package.json`
* **Database Migration Required:** None.
* **API Endpoints Required:** All Express endpoints (`/api/*`).
* **RLS / Authorization Requirements:** IP-based rate limiting (100 requests per 15 minutes per IP; 5 OTP requests per hour).
* **Environment Variables:** `RATE_LIMIT_MAX_REQUESTS`
* **Acceptance Criteria:** `express-rate-limit` and `helmet` middleware applied; CORS restricted to configured origin domains.
* **Unit Tests:** `tests/rate-limit.test.ts` (Simulates rapid burst requests to `/api/auth/send-otp` and asserts 429 Too Many Requests).
* **Integration Tests:** `tests/api-security.test.ts` (Inspects headers for `X-Content-Type-Options`, `Strict-Transport-Security`, `Content-Security-Policy`).
* **End-to-End Tests:** Verify CORS preflight OPTIONS request from unauthorized domain is rejected.
* **Manual Verification:** Send 10 rapid POST requests to `/api/auth/register`; verify 429 response on 6th request.
* **Rollback Method:** Remove middleware from `server.ts`.
* **Dependencies:** None.
* **Risk Level:** HIGH (Exposes authentication endpoints to brute-force OTP attacks).

---

## PHASE 1 — Core Rental Marketplace (Priority P1)

### TASK-101: Supabase Storage Bucket Wiring for Property Images
* **Priority:** P1
* **Current Status:** `MOCKED` ([PostPropertyView.tsx](file:///c:/Users/Ankit/OneDrive/Desktop/MyAngan/src/components/views/PostPropertyView.tsx))
* **Files to Modify:** `PostPropertyView.tsx`, `src/lib/db.ts`
* **Database Migration Required:** Storage policies script in Supabase (`storage.buckets` insert for `property-images`).
* **API Endpoints Required:** Supabase Storage REST API (`/storage/v1/object/property-images`).
* **RLS / Authorization Requirements:** Authenticated users can upload to `property-images/` bucket; public read access enabled.
* **Environment Variables:** `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`.
* **Acceptance Criteria:** Selecting an image file in `PostPropertyView.tsx` uploads the file directly to Supabase Storage and stores the public CDN URL in `properties.image_urls`.
* **Unit Tests:** `tests/storage.test.ts` (Validates image file mime-type and size validation logic).
* **Integration Tests:** Storage upload API integration test uploading sample test image.
* **End-to-End Tests:** Playwright test creating a new property listing with attached PNG image file and verifying image loads on detail view.
* **Manual Verification:** Upload property photo, view property details, inspect image URL domain (`supabase.co/storage`).
* **Rollback Method:** Fall back to URL text input field.
* **Dependencies:** TASK-001.
* **Risk Level:** MEDIUM.

---

### TASK-102: Database Persistence for Property Approval & Status Workflows
* **Priority:** P1
* **Current Status:** `PARTIALLY_IMPLEMENTED` ([src/lib/db.ts](file:///c:/Users/Ankit/OneDrive/Desktop/MyAngan/src/lib/db.ts), [DashboardView.tsx](file:///c:/Users/Ankit/OneDrive/Desktop/MyAngan/src/components/views/DashboardView.tsx))
* **Files to Modify:** `src/lib/db.ts`, `DashboardView.tsx`, `AdminView.tsx`
* **Database Migration Required:** Ensure `20260724000000_production_hardening.sql` is applied (`properties.status` enum).
* **API Endpoints Required:** Supabase REST API (`/rest/v1/properties`).
* **RLS / Authorization Requirements:** Only admins can update `properties.status` from `pending` to `active`; owners can update `active` to `rented`.
* **Environment Variables:** None.
* **Acceptance Criteria:** Newly created properties enter `pending` state; admin approval sets status to `active`; active properties appear in search.
* **Unit Tests:** `tests/property-status.test.ts` (Tests property state machine transitions).
* **Integration Tests:** RLS policy verification testing non-owner property status update rejection.
* **End-to-End Tests:** Admin panel approval workflow test.
* **Manual Verification:** Post property as landlord, check admin view, click Approve, verify listing appears on `/properties`.
* **Rollback Method:** Revert RLS policy `Allow public read of active properties`.
* **Dependencies:** TASK-001.
* **Risk Level:** MEDIUM.

---

## PHASE 2 — Payment & Communication (Priority P1/P2)

### TASK-201: Idempotent Payment Webhook Processing & Refund Log
* **Priority:** P1
* **Current Status:** `MISSING` ([server/auth.ts](file:///c:/Users/Ankit/OneDrive/Desktop/MyAngan/server/auth.ts))
* **Files to Modify:** `server/auth.ts`, `server/db.ts`
* **Database Migration Required:** `payment_orders` and `payment_events` tables.
* **API Endpoints Required:** `POST /api/payment/webhook`
* **RLS / Authorization Requirements:** Razorpay HMAC SHA-256 header validation (`X-Razorpay-Signature`).
* **Environment Variables:** `RAZORPAY_WEBHOOK_SECRET`
* **Acceptance Criteria:** Duplicate webhook events return HTTP 200 without duplicate processing (`idempotency_key` check on `payment_events`).
* **Unit Tests:** `tests/webhook.test.ts` (Validates webhook event parsing and duplicate detection).
* **Integration Tests:** Send duplicate `payment.captured` webhooks via Supertest; verify single database mutation.
* **End-to-End Tests:** End-to-end payment test with simulated webhook callback.
* **Manual Verification:** Trigger duplicate event from Razorpay Dashboard test mode; inspect `payment_events` table logs.
* **Rollback Method:** Remove webhook route mounting in `server.ts`.
* **Dependencies:** TASK-002.
* **Risk Level:** HIGH.

---

## PHASE 3 — Operational Modules (Priority P2)

### TASK-301: Persistent Maintenance OS & Ticketing DB Integration
* **Priority:** P2
* **Current Status:** `UI_ONLY` ([MaintenanceModal.tsx](file:///c:/Users/Ankit/OneDrive/Desktop/MyAngan/src/components/MaintenanceModal.tsx))
* **Files to Modify:** `MaintenanceModal.tsx`, `DashboardView.tsx`, `server/db.ts`, new migration `20260726000000_maintenance_tickets.sql`
* **Database Migration Required:** `CREATE TABLE public.maintenance_tickets (id UUID PRIMARY KEY, property_id UUID, user_id UUID, category TEXT, priority TEXT, description TEXT, status TEXT, created_at TIMESTAMPTZ);`
* **API Endpoints Required:** `POST /api/maintenance/tickets`, `GET /api/maintenance/tickets`
* **RLS / Authorization Requirements:** RLS enabled; tenant can create ticket; landlord/admin can view/update ticket status.
* **Environment Variables:** None.
* **Acceptance Criteria:** Submitting maintenance request creates a persistent DB row in `maintenance_tickets`; status updates reflect in landlord dashboard.
* **Unit Tests:** `tests/maintenance.test.ts` (Ticket validation logic test).
* **Integration Tests:** Supertest POST `/api/maintenance/tickets` with authenticated session.
* **End-to-End Tests:** Renter opens Maintenance modal, submits plumbing request, verifies ticket appears in landlord dashboard.
* **Manual Verification:** Submit ticket, inspect Supabase table `maintenance_tickets`, verify SLA timer.
* **Rollback Method:** Drop `maintenance_tickets` table migration.
* **Dependencies:** TASK-102.
* **Risk Level:** MEDIUM.

---

### TASK-302: Persistent Lease Agreement Records & PDF Generator
* **Priority:** P2
* **Current Status:** `UI_ONLY` ([LeaseAgreementView.tsx](file:///c:/Users/Ankit/OneDrive/Desktop/MyAngan/src/components/views/LeaseAgreementView.tsx))
* **Files to Modify:** `LeaseAgreementView.tsx`, `server.ts`, new migration `20260726000001_agreements.sql`
* **Database Migration Required:** `CREATE TABLE public.agreements (id UUID PRIMARY KEY, property_id UUID, landlord_id UUID, tenant_id UUID, rent_amount INT, deposit_amount INT, start_date DATE, tenure_months INT, status TEXT, created_at TIMESTAMPTZ);`
* **API Endpoints Required:** `POST /api/agreements/create`, `GET /api/agreements/:id/pdf`
* **RLS / Authorization Requirements:** RLS enabled; tenant and landlord can view own agreement records.
* **Environment Variables:** None.
* **Acceptance Criteria:** Generating agreement creates persistent row in `agreements`; PDF export generates downloadable document marked "Informational Tenancy Agreement Template".
* **Unit Tests:** `tests/agreements.test.ts` (Agreement data validation tests).
* **Integration Tests:** Supertest agreement creation API test.
* **End-to-End Tests:** Complete agreement customization and PDF download workflow test.
* **Manual Verification:** Build agreement, click export PDF, verify generated file opens correctly.
* **Rollback Method:** Revert agreement SQL migration.
* **Dependencies:** TASK-102.
* **Risk Level:** MEDIUM.

---

## PHASE 4 — AI & Advanced Capabilities (Priority P3)

### TASK-401: Google GenAI API Integration for Property Search Assistant
* **Priority:** P3
* **Current Status:** `MOCKED` ([AiAssistantModal.tsx](file:///c:/Users/Ankit/OneDrive/Desktop/MyAngan/src/components/AiAssistantModal.tsx))
* **Files to Modify:** `AiAssistantModal.tsx`, `server/ai.ts`, `server.ts`
* **Database Migration Required:** None.
* **API Endpoints Required:** `POST /api/ai/search-assistant`
* **RLS / Authorization Requirements:** Authenticated or rate-limited guest users (5 AI searches per hour per IP).
* **Environment Variables:** `GEMINI_API_KEY`
* **Acceptance Criteria:** Query sent to server endpoint triggers `@google/genai` API call; response returns structured JSON with filter parameters and natural language text.
* **Unit Tests:** `tests/ai-assistant.test.ts` (Validates GenAI prompt parsing and JSON schema output).
* **Integration Tests:** Integration test with mocked Gemini API response.
* **End-to-End Tests:** Open AI Assistant modal, type query, verify AI response renders in chat drawer.
* **Manual Verification:** Set `GEMINI_API_KEY`, send query *"Find 2BHK in Gurugram under 35k"*, inspect structured response.
* **Rollback Method:** Revert back to client-side regex heuristic (`parseUserIntent`).
* **Dependencies:** TASK-003.
* **Risk Level:** LOW.

---

### TASK-402: Property Passport & Informational Verification Audit Trail
* **Priority:** P3
* **Current Status:** `UI_ONLY` ([PropertyPassportModal.tsx](file:///c:/Users/Ankit/OneDrive/Desktop/MyAngan/src/components/PropertyPassportModal.tsx))
* **Files to Modify:** `PropertyPassportModal.tsx`, new migration `20260726000002_passports.sql`
* **Database Migration Required:** `CREATE TABLE public.property_passports (id UUID PRIMARY KEY, property_id UUID UNIQUE, rera_registration_number TEXT, title_verification_status TEXT, inspection_audit_date DATE, safety_index DECIMAL, created_at TIMESTAMPTZ);`
* **API Endpoints Required:** `GET /api/passports/:propertyId`
* **RLS / Authorization Requirements:** Public read access for verified property passport audit records.
* **Environment Variables:** None.
* **Acceptance Criteria:** Renders verified property identity record marked "MyAngan Verified Digital Property Audit Record" backed by database row in `property_passports`.
* **Unit Tests:** `tests/passports.test.ts` (Passport schema validation tests).
* **Integration Tests:** GET `/api/passports/:propertyId` endpoint integration test.
* **End-to-End Tests:** Open property detail page, click "View Property Passport", verify data matches database.
* **Manual Verification:** Open passport modal, inspect verification attributes and audit timestamp.
* **Rollback Method:** Revert passport SQL migration.
* **Dependencies:** TASK-102.
* **Risk Level:** LOW.

---

## Numbered Execution Sequence (Batch Plan)

```
===============================================================================
BATCH 1: IMMEDIATE PRODUCTION BLOCKERS (P0)
===============================================================================
1. TASK-001: Express Admin API JWT Bearer Authorization Middleware
2. TASK-002: Server-Side Razorpay Order Creation & Webhook Handler
3. TASK-003: Express Rate Limiting & Helmet Security Headers

===============================================================================
BATCH 2: CORE MARKETPLACE PERSISTENCE & STORAGE (P1)
===============================================================================
4. TASK-101: Supabase Storage Bucket Upload Wiring for Property Images
5. TASK-102: Property Status Moderation & Admin Approval Workflow Persistence

===============================================================================
BATCH 3: PAYMENTS & EMAIL AUDIT RETRY (P1/P2)
===============================================================================
6. TASK-201: Idempotent Payment Webhook Processing & Refund Event Logging

===============================================================================
BATCH 4: OPERATIONAL MODULE PERSISTENCE (P2)
===============================================================================
7. TASK-301: Persistent Maintenance Tickets Table & Express Router
8. TASK-302: Persistent Lease Agreement Records & PDF Template Generator

===============================================================================
BATCH 5: AI & ADVANCED MODULE INTEGRATION (P3)
===============================================================================
9. TASK-401: Server-Side Google GenAI SDK Search Assistant Integration
10. TASK-402: Property Passport Digital Audit Trail Database Integration
===============================================================================
```
