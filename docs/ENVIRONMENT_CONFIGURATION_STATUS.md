# MyAngan - Environment Configuration Status & Contract Verification

**Date:** July 2026  
**Validator:** `server/env.ts` (Zod Environment Validation Schema)  

---

## 1. Environment Variable Verification Matrix

| Environment Variable | Layer | Confidentiality | Validation Status |
|---|---|---|---|
| `NODE_ENV` | Both | Public | Validated (`'production'`) |
| `PORT` | Server | Public | Validated (`process.env.PORT || 3000`) |
| `APP_URL` | Server | Public | Validated (`'https://myangan.com'`) |
| `CORS_ALLOWED_ORIGINS` | Server | Public | Validated (`'https://myangan.com,https://myangan.vercel.app'`) |
| `VITE_SUPABASE_URL` | Client | Public | Validated |
| `VITE_SUPABASE_ANON_KEY` | Client | Public | Validated |
| `VITE_RAZORPAY_KEY_ID` | Client | Public | Validated |
| `VITE_PAYMENTS_ENABLED` | Client | Public | Validated (`'false'` by default) |
| `SUPABASE_URL` | Server | Public | Validated |
| `SUPABASE_SERVICE_ROLE_KEY` | Server | **CONFIDENTIAL** | Secret isolated server-side |
| `OTP_HASH_SECRET` | Server | **CONFIDENTIAL** | Secret isolated server-side |
| `RAZORPAY_KEY_SECRET` | Server | **CONFIDENTIAL** | Secret isolated server-side |
| `RAZORPAY_WEBHOOK_SECRET` | Server | **CONFIDENTIAL** | Secret isolated server-side |
| `SMTP_HOST` / `SMTP_PASSWORD` | Server | **CONFIDENTIAL** | Secret isolated server-side |
| `GEMINI_API_KEY` | Server | **CONFIDENTIAL** | Secret isolated server-side |

---

## 2. Startup Guard Verification
* **Fail-Fast in Production:** `server/env.ts` terminates server startup with a clean error message if required production keys are missing when `NODE_ENV=production`.
* **Zero Secret Exposure:** Error messages print parameter names only; secret strings are never logged to console or stdout.
