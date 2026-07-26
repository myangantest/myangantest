# MyAngan - Production Deployment Runbook

This document provides step-by-step instructions for deploying **MyAngan** to production hosting platforms (Vercel / AWS / Render / Node.js Host).

---

## 1. Pre-Deployment Preparation & Build Audit

```bash
# Step 1: Clean build directory
npm run clean

# Step 2: Verify zero TypeScript type errors
npx tsc --noEmit

# Step 3: Run full automated integration test suite
npx tsx scripts/test-suite.ts

# Step 4: Compile production distribution bundle
npm run build
```

---

## 2. Database Migration Deployment Step

1. Open **Supabase Dashboard** $\rightarrow$ **SQL Editor**.
2. Run SQL script: `supabase/migrations/20260719000000_init.sql`.
3. Run SQL script: `supabase/migrations/20260720000000_otp_notifications.sql`.
4. Run SQL script: `supabase/migrations/20260724000000_production_hardening.sql`.
5. Run SQL script: `supabase/migrations/20260726120000_phase1_backend_foundation.sql`.
6. Run SQL script: `supabase/migrations/20260726150000_phase3_operational_modules.sql`.

---

## 3. Hosting Environment Deployment Steps

### For Node.js / Render / AWS Elastic Beanstalk:
```bash
# Install production dependencies
npm install --omit=dev

# Start Express Production Server
npm run start
# Server starts on process.env.PORT (default 3000)
```

---

## 4. Razorpay Webhook Configuration

1. Log in to [Razorpay Dashboard](https://dashboard.razorpay.com/).
2. Add Webhook: `https://<your-live-domain>/api/payments/webhook`.
3. Events to enable: `payment.captured`, `payment.failed`, `order.paid`.
4. Secret: Set matching value as `RAZORPAY_WEBHOOK_SECRET`.
