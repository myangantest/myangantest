# MyAngan - Release Dependencies & Deployment Prerequisites

This document details the environment configuration, database migration sequence, third-party API dependencies, and rollback procedures required for each deployment batch.

---

## 1. Environment Variable Dependencies Matrix

| Environment Variable | Required For | Phase / Batch | Secret / Public | Fallback Behavior if Missing |
|---|---|---|---|---|
| `PORT` | Express Server Entry | Batch 1 | Public Config | Defaults to `3000` |
| `NODE_ENV` | Environment Mode | Batch 1 | Public Config | Defaults to `development` |
| `SUPABASE_URL` | Supabase Postgres Client | Batch 1 | Public Config | Emits startup warning `✗ Missing Supabase configuration` |
| `SUPABASE_ANON_KEY` | Supabase Client Key | Batch 1 | Public Key | Disables real DB calls |
| `SUPABASE_SERVICE_ROLE_KEY` | Server DB & Auth Operations | Batch 1 | **CONFIDENTIAL SECRET** | Disables admin API & user auto-confirm |
| `SUPABASE_JWT_SECRET` | Admin Router Authorization | Batch 1 | **CONFIDENTIAL SECRET** | Rejects JWT token verification |
| `OTP_HASH_SECRET` | HMAC SHA-256 OTP Hash | Batch 1 | **CONFIDENTIAL SECRET** | Reverts to fallback static secret (Dev only) |
| `RAZORPAY_KEY_ID` | Razorpay Payment Checkout | Batch 1 & 3 | Public Key | Disables Razorpay Modal |
| `RAZORPAY_KEY_SECRET` | Signature Verification | Batch 1 & 3 | **CONFIDENTIAL SECRET** | Rejects payment signature verification |
| `RAZORPAY_WEBHOOK_SECRET` | Webhook Verification | Batch 3 | **CONFIDENTIAL SECRET** | Rejects webhook event payload |
| `SMTP_HOST` | Transactional Email | Batch 3 | Public Config | Defaults to `smtp.gmail.com` |
| `SMTP_USER` | Email Sender Credentials | Batch 3 | **CONFIDENTIAL SECRET** | Logs notification to DB without sending email |
| `SMTP_PASS` | Gmail App Password | Batch 3 | **CONFIDENTIAL SECRET** | Disables SMTP email transport |
| `GEMINI_API_KEY` | AI Search Assistant | Batch 5 | **CONFIDENTIAL SECRET** | Reverts AI Assistant to regex heuristic |

---

## 2. Sequential Supabase SQL Migration Execution Order

Migrations **MUST** be executed in exact numerical sequence against the target Supabase Postgres instance:

```sql
-- Step 1: Initial Schema (Tables: users, properties, leads, favorites, brokers, waitlist)
\i supabase/migrations/20260719000000_init.sql

-- Step 2: OTP & Audit Logs (Tables: otp_verifications, notification_logs)
\i supabase/migrations/20260720000000_otp_notifications.sql

-- Step 3: Production Hardening (Tables: payment_orders, payment_events, legacy_migration_logs, audit_logs)
\i supabase/migrations/20260724000000_production_hardening.sql

-- Step 4: Maintenance Tickets (Table: maintenance_tickets) [Batch 4]
\i supabase/migrations/20260726000000_maintenance_tickets.sql

-- Step 5: Digital Lease Agreements (Table: agreements) [Batch 4]
\i supabase/migrations/20260726000001_agreements.sql

-- Step 6: Property Passports (Table: property_passports) [Batch 5]
\i supabase/migrations/20260726000002_passports.sql
```

---

## 3. Rollback Procedures by Batch

### Batch 1 Rollback (Production Blockers & Security):
1. Revert commit on `server.ts` and `server/auth.ts`.
2. Disable rate-limiter middleware.

### Batch 2 Rollback (Marketplace Storage & Moderation):
1. Revert `PostPropertyView.tsx` image upload changes.
2. Revert RLS policy on `public.properties` to previous state.

### Batch 3 Rollback (Razorpay Webhooks & Payment Orders):
1. Set `ENABLE_PAYMENT_WEBHOOKS=false` in environment variables.
2. Revert webhook route in `server/auth.ts`.

### Batch 4 Rollback (Maintenance & Agreements):
1. Execute SQL drop commands:
   ```sql
   DROP TABLE IF EXISTS public.maintenance_tickets CASCADE;
   DROP TABLE IF EXISTS public.agreements CASCADE;
   ```
2. Revert frontend routes in `App.tsx`.

### Batch 5 Rollback (AI Integration):
1. Remove `GEMINI_API_KEY` from `.env`.
2. Revert AI search assistant route to regex heuristic fallback.
