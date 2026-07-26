# MyAngan - Environment Variable Matrix & Contract Specification

This document maps all frontend and server-side environment variables, their purpose, validation rules, and security isolation requirements.

---

## 1. Complete Environment Variable Matrix

| Variable Name | Layer Scope | Secret Status | Fallback in Dev | Validation Rule (Zod) |
|---|---|---|---|---|
| `NODE_ENV` | Both | Public | `'development'` | `z.enum(['development', 'test', 'production'])` |
| `PORT` | Server | Public | `'3000'` | `z.string().optional()` |
| `VITE_SUPABASE_URL` | Frontend | Public | `''` | Valid URL string |
| `VITE_SUPABASE_ANON_KEY` | Frontend | Public | `''` | JWT string |
| `VITE_RAZORPAY_KEY_ID` | Frontend | Public | `''` | `rzp_test_...` or `rzp_live_...` |
| `VITE_PAYMENTS_ENABLED` | Frontend | Public | `'false'` | `'true'` or `'false'` |
| `SUPABASE_URL` | Server | Public | `''` | Valid URL string |
| `SUPABASE_SERVICE_ROLE_KEY` | Server | **CONFIDENTIAL** | None (Fails Prod) | Secret JWT key |
| `OTP_HASH_SECRET` | Server | **CONFIDENTIAL** | Dev Secret | Min 32 chars |
| `RAZORPAY_KEY_SECRET` | Server | **CONFIDENTIAL** | None | Secret string |
| `RAZORPAY_WEBHOOK_SECRET` | Server | **CONFIDENTIAL** | None | Secret string |
| `GEMINI_API_KEY` | Server | **CONFIDENTIAL** | None | Secret string |
| `SMTP_HOST` | Server | Public | `'smtp.gmail.com'` | Hostname |
| `SMTP_PORT` | Server | Public | `'465'` | Numeric string |
| `SMTP_PASSWORD` | Server | **CONFIDENTIAL** | None | Secret string |
| `EMAIL_FROM` | Server | Public | `'MyAngan <...>'` | Email string |

---

## 2. Security Isolation Rules
1. **No Client Secrets:** Variables prefixed with `VITE_` are embedded in the compiled client JavaScript bundle. They **MUST NEVER** contain private keys, service role credentials, or secret passwords.
2. **Server-Only Isolation:** `SUPABASE_SERVICE_ROLE_KEY`, `RAZORPAY_KEY_SECRET`, `GEMINI_API_KEY`, and `SMTP_PASSWORD` are accessible only inside Node.js Express router code and Vercel serverless function contexts.
3. **Zod Validation at Startup:** Server startup initializes `server/env.ts`, which parses `process.env` and halts execution if critical production keys are missing.
