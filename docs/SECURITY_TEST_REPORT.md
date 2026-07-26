# MyAngan - Security Assessment & Vulnerability Audit Report

This document details the security evaluation, penetration testing results, row-level security audit, and cryptographic controls implemented for **MyAngan**.

---

## 1. Security Evaluation Summary Across 18 Threat Vectors

| Threat Vector | Evaluation Target | Protection Mechanism | Audit Result |
|---|---|---|---|
| **IDOR** | User Profiles, Tickets, Payments | RLS policies (`auth.uid() = user_id`) enforce strict user isolation. | ✅ PASSED |
| **Broken Role Auth** | Listing Creation & Moderation | Renters blocked from creating listings (`INSERT WITH CHECK`); admin routes require Bearer tokens. | ✅ PASSED |
| **RLS Bypass** | Postgres Database Tables | RLS enabled and policy-enforced across all 16 user data tables. | ✅ PASSED |
| **SQL / Filter Injection** | Search & Filter Endpoints | Parameterized Supabase query builder; AI filter schema normalization prevents executable SQL. | ✅ PASSED |
| **Stored & Reflected XSS** | Email & Document Outputs | `escapeHtml()` applied to all user inputs rendered in HTML email templates and agreement PDFs. | ✅ PASSED |
| **CSRF** | Express REST Endpoints | Bearer JWT token header authorization (no vulnerable ambient cookie auth). | ✅ PASSED |
| **Open Redirect** | Router Navigation | Hardcoded client-side route paths in `App.tsx`; no dynamic redirect query params. | ✅ PASSED |
| **File Upload Abuse** | Property Image Uploads | Max 5MB file size constraint (`CHECK file_size_bytes <= 5242880`) in private bucket `property-images`. | ✅ PASSED |
| **MIME Spoofing** | Image Storage Metadata | MIME restriction enforced: `image/jpeg`, `image/png`, `image/webp`. | ✅ PASSED |
| **Rate-Limit Bypass** | Auth & OTP Endpoints | `express-rate-limit` middleware caps request rates per IP. | ✅ PASSED |
| **Brute-Force Protection** | OTP Verification | 10-minute expiry, max 5 attempts limit, HMAC SHA-256 code hashing, timing-safe compare. | ✅ PASSED |
| **Secret Exposure** | Client JavaScript Bundles | Secrets (`RAZORPAY_KEY_SECRET`, `SUPABASE_SERVICE_ROLE_KEY`, `GEMINI_API_KEY`) remain server-only. | ✅ PASSED |
| **Verbose Errors** | Express Error Handlers | Sanitized error responses suppress raw internal server stack traces in production. | ✅ PASSED |
| **CORS Misconfiguration** | Express CORS Headers | Restricted to configured origin domains. | ✅ PASSED |
| **Webhook Replay** | Razorpay Webhook Endpoint | Idempotency log in `public.payment_webhook_events` rejects duplicate event IDs. | ✅ PASSED |
| **Payment Tampering** | Payment Orders & Verification | Server-controlled plan prices (`PLAN_PRICING`) & constant-time HMAC SHA-256 verification (`crypto.timingSafeEqual`). | ✅ PASSED |
| **Sensitive Info in Logs** | Console & Audit Logs | Passwords, OTP codes, SMTP credentials, and tokens are excluded from logs. | ✅ PASSED |
| **Unsafe AI Prompts** | AI Search Assistant | `sanitizeSearchPrompt()` caps input at 500 characters and strips prompt injection keywords. | ✅ PASSED |

---

## 2. Cryptographic Security & Timing Controls

1. **Constant-Time String Comparison:** `crypto.timingSafeEqual` is used for all HMAC signature and OTP hash comparisons to prevent timing side-channel attacks.
2. **HMAC SHA-256 Hashing:** OTP codes are hashed server-side using HMAC SHA-256 with `OTP_HASH_SECRET`. Raw OTP values are never stored in the database.
