# MyAngan - Gurugram & South Delhi Rental Marketplace

MyAngan is a real estate rental platform specialized for high-trust properties across Delhi NCR (Gurugram and South Delhi).

## Architecture

- **Frontend**: React 18 with Vite, Tailwind CSS, React Router v7, Lucide Icons
- **Backend API**: Express server running on Node.js
- **Database & Auth**: Supabase PostgreSQL + Auth (with Row Level Security)
- **Email Service**: SendGrid / Nodemailer SMTP transaction emails

---

## Local Setup

### 1. Environment Variables
Copy `.env.example` to `.env` and configure your credentials:

```bash
# Server & Client Supabase Configuration
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key

# Optional Email & Notification Services
SENDGRID_API_KEY=your-sendgrid-key
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASS=your-smtp-pass
FROM_EMAIL=noreply@myangan.in

# Development Mode Only
NODE_ENV=development
ALLOW_MOCK_STORAGE=true
```

### 2. Install Dependencies & Run
```bash
npm install
npm run dev
```

---

## Database Migrations

Apply the idempotent SQL migrations to your Supabase project in sequential order:

1. `supabase/migrations/20260719000000_init.sql` — Base tables (`users`, `properties`, `brokers`, `leads`, `favorites`) and initial RLS policies.
2. `supabase/migrations/20260720000000_otp_notifications.sql` — `otp_verifications` and `notification_logs` tables.
3. `supabase/migrations/20260724000000_production_hardening.sql` — Schema updates (`is_verified`, `is_subscribed`, `payment_orders`, `payment_events`, `legacy_migration_logs`, `audit_logs`), status default constraints (`pending`), and strict security triggers.

You can execute these migration files directly in the **Supabase Dashboard SQL Editor** or using the **Supabase CLI**:

```bash
supabase db push
```

---

## Verification & Testing Commands

```bash
# Run Linter
npm run lint

# Run Unit & Integration Tests
npm run test

# Production Build
npm run build
```

---

## Deployment Instructions

To run in production mode:

```bash
NODE_ENV=production npm run build
npm run start
```
