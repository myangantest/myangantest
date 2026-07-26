# MyAngan - Manual Owner Actions & Pre-Deployment Checklist

This document details the exact manual steps required by the repository owner to deploy the application to Vercel and Supabase.

---

## 1. Supabase Live Project Linking & Migration Execution
Run the following terminal commands from your workspace root:

```bash
# 1. Link local repository to your live Supabase project
npx supabase link --project-ref <YOUR_SUPABASE_PROJECT_REF>

# 2. Push all 5 versioned SQL migrations to the remote database
npx supabase db push
```

---

## 2. Vercel Environment Variables Configuration
In your Vercel Dashboard (**Settings $\rightarrow$ Environment Variables**), add the following production variables:

* `NODE_ENV=production`
* `APP_URL=https://myangan.com`
* `CORS_ALLOWED_ORIGINS=https://myangan.com,https://myangan.vercel.app`
* `VITE_SUPABASE_URL=https://<your-project-ref>.supabase.co`
* `VITE_SUPABASE_ANON_KEY=<your-anon-key>`
* `SUPABASE_URL=https://<your-project-ref>.supabase.co`
* `SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>`
* `OTP_HASH_SECRET=<your-32-byte-secret>`
* `VITE_PAYMENTS_ENABLED=false`

---

## 3. Trigger Production Deployment
Push the `release/production-readiness` branch to GitHub or run:
```bash
vercel --prod
```
