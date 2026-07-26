# MyAngan - Production Environment Variables Checklist

This document details all required client and server environment variables for deploying **MyAngan** to production.

---

## 1. Client-Exposed Environment Variables (Vite Bundle)

| Variable Name | Required Value Format | Description / Purpose |
|---|---|---|
| `VITE_SUPABASE_URL` | `https://<ref>.supabase.co` | Supabase project URL for client queries. |
| `VITE_SUPABASE_ANON_KEY` | `eyJhbG...` | Public anonymous key for client RLS queries. |
| `VITE_RAZORPAY_KEY_ID` | `rzp_live_<key_id>` | Public Razorpay Key ID for Checkout modal. |
| `VITE_PAYMENTS_ENABLED` | `true` or `false` | Global toggle flag for payment checkout. |

---

## 2. Server-Only Secret Variables (NEVER expose to Client)

| Variable Name | Required Value Format | Confidentiality & Purpose |
|---|---|---|
| `SUPABASE_URL` | `https://<ref>.supabase.co` | Server Supabase client URL. |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJhbG...` | **CONFIDENTIAL SECRET:** Server admin DB operations. |
| `SUPABASE_JWT_SECRET` | `<32-char-secret>` | **CONFIDENTIAL SECRET:** Admin router authorization. |
| `OTP_HASH_SECRET` | `<64-char-secret>` | **CONFIDENTIAL SECRET:** HMAC SHA-256 OTP hashing. |
| `RAZORPAY_KEY_ID` | `rzp_live_<key_id>` | Server Razorpay order creation Key ID. |
| `RAZORPAY_KEY_SECRET` | `<key_secret>` | **CONFIDENTIAL SECRET:** Payment signature verification. |
| `RAZORPAY_WEBHOOK_SECRET` | `<webhook_secret>` | **CONFIDENTIAL SECRET:** Raw webhook signature verification. |
| `SMTP_HOST` | `smtp.gmail.com` | Transactional SMTP server hostname. |
| `SMTP_PORT` | `587` | SMTP port (`587` for STARTTLS / `465` for SSL). |
| `SMTP_SECURE` | `false` | Set `true` if port is 465. |
| `SMTP_USER` | `account@domain.com` | SMTP account email address. |
| `SMTP_PASS` | `<16-char-app-pass>` | **CONFIDENTIAL SECRET:** SMTP App Password. |
| `EMAIL_FROM` | `noreply@myangan.in` | Verified email sender address. |
| `GEMINI_API_KEY` | `AIzaSy...` | **CONFIDENTIAL SECRET:** Google GenAI API Key for AI Search Assistant. |

---

## 3. Secret Isolation Verification Checklist

- [ ] Confirm no secret keys (`SUPABASE_SERVICE_ROLE_KEY`, `RAZORPAY_KEY_SECRET`, `SMTP_PASS`, `GEMINI_API_KEY`) are prefixed with `VITE_`.
- [ ] Confirm `.env` file is listed in `.gitignore`.
- [ ] Confirm production build bundle (`npm run build`) contains no secret string literals.
