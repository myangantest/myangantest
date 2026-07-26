# MyAngan - Emergency Rollback Runbook

This document defines emergency rollback protocols in the event of a deployment failure, database migration issue, or payment integration incident.

---

## 1. Instant Payment Kill-Switch Procedure

If an unhandled payment issue or gateway anomaly occurs in production:

1. Open your hosting platform environment dashboard (Vercel / AWS / Render).
2. Update environment variable:
   ```env
   VITE_PAYMENTS_ENABLED=false
   ```
3. Trigger instant redeploy. This disables the Razorpay Checkout modal immediately across all client browsers without bringing down property search or rental operations.

---

## 2. Database Migration Rollback Procedure

If a database schema issue occurs on a newly applied migration:

```sql
-- Step 1: Roll back Phase 3 Operational Tables
DROP TABLE IF EXISTS public.property_reports CASCADE;
DROP TABLE IF EXISTS public.agreement_versions CASCADE;
DROP TABLE IF EXISTS public.maintenance_ticket_history CASCADE;
DROP TABLE IF EXISTS public.maintenance_ticket_comments CASCADE;

-- Step 2: Roll back Phase 1 Tables if necessary
DROP TABLE IF EXISTS public.agreement_records CASCADE;
DROP TABLE IF EXISTS public.property_verification_requests CASCADE;
DROP TABLE IF EXISTS public.email_delivery_logs CASCADE;
DROP TABLE IF EXISTS public.payment_webhook_events CASCADE;
DROP TABLE IF EXISTS public.payment_transactions CASCADE;
DROP TABLE IF EXISTS public.payment_orders CASCADE;
DROP TABLE IF EXISTS public.maintenance_tickets CASCADE;
```

---

## 3. Server Code Version Rollback

```bash
# Roll back git commit to previous stable release tag
git checkout tags/v1.0.0-stable

# Clean build
npm run clean && npm run build

# Restart production server
npm run start
```
