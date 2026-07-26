# MyAngan - Security Controls & Data Flow Architecture

## 1. Complete System Data Flow Architecture

```
                               ┌───────────────────────────────────────────┐
                               │            Client Browser (SPA)           │
                               │  React 19 + React Router + Tailwind CSS   │
                               └─────┬───────────────────────────────┬─────┘
                                     │                               │
                      HTTP REST / Auth Calls                Supabase Client Calls
                                     │                               │
                                     ▼                               ▼
                 ┌───────────────────────────────────────┐ ┌───────────────────┐
                 │        Express Backend Server         │ │ Supabase Postgres │
                 │              (server.ts)              │ │    Database       │
                 ├───────────────────────────────────────┤ ├───────────────────┤
                 │ • /api/auth/register (OTP Generation) │ │ • public.users    │
                 │ • /api/auth/verify-otp (HMAC Compare) │ │ • public.properties│
                 │ • /api/payment/verify-razorpay       │ │ • public.leads    │
                 │ • /api/admin/migrate-legacy           │ │ • public.favorites│
                 └───────────┬───────────────────┬───────┘ └───────────────────┘
                             │                   │
                             ▼                   ▼
                  ┌────────────────────┐ ┌───────────────┐
                  │ Google Workspace   │ │ Razorpay API  │
                  │ SMTP (Nodemailer)  │ │ (HMAC SHA256) │
                  └────────────────────┘ └───────────────┘
```

---

## 2. In-Depth Security Controls Inspection

### 2.1 OTP Generation & Verification
* **File:** [server/auth.ts](file:///c:/Users/Ankit/OneDrive/Desktop/MyAngan/server/auth.ts)
* **Code Implementation:**
  ```typescript
  export function generateOTP(): string {
    const otpVal = crypto.randomInt(0, 1000000);
    return otpVal.toString().padStart(6, '0');
  }
  export function hashOTP(otp: string): string {
    const secret = process.env.OTP_HASH_SECRET || 'fallback-myangan-otp-secret';
    return crypto.createHmac('sha256', secret).update(otp).digest('hex');
  }
  ```
* **Security Evaluation:**
  - **Strengths:** Uses cryptographically secure `crypto.randomInt()`, HMAC SHA-256 code hashing, 10-minute expiry window, maximum 5 attempts tracking, and `crypto.timingSafeEqual` comparison.
  - **Weaknesses:** If `OTP_HASH_SECRET` is not set in `.env`, a static fallback secret is used.

---

### 2.2 Razorpay Payment Entitlement Verification
* **File:** [server/auth.ts](file:///c:/Users/Ankit/OneDrive/Desktop/MyAngan/server/auth.ts#L400-L460)
* **Code Implementation:**
  ```typescript
  const expectedSignature = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
    .update(razorpay_order_id + '|' + razorpay_payment_id)
    .digest('hex');
  ```
* **Security Evaluation:**
  - **Strengths:** Payment signatures are strictly validated on the backend before updating user subscription entitlements. Secrets are kept server-side.
  - **Weaknesses:** Order creation is not performed on the server via Razorpay Orders API; frontend passes `razorpay_order_id` directly. Webhooks are absent.

---

### 2.3 Role Escalation Prevention
* **File:** [supabase/migrations/20260724000000_production_hardening.sql](file:///c:/Users/Ankit/OneDrive/Desktop/MyAngan/supabase/migrations/20260724000000_production_hardening.sql#L11-L28)
* **Code Implementation:**
  ```sql
  CREATE OR REPLACE FUNCTION public.check_user_sensitive_fields_update()
  RETURNS TRIGGER AS $$
  BEGIN
      IF (OLD.role <> NEW.role OR OLD.is_verified <> NEW.is_verified OR OLD.is_subscribed <> NEW.is_subscribed) 
         AND NOT EXISTS (
             SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'
         ) THEN
          RAISE EXCEPTION 'Unauthorized: Only administrators can modify role, verification, or subscription status.';
      END IF;
      RETURN NEW;
  END;
  $$ LANGUAGE plpgsql SECURITY DEFINER;
  ```
* **Security Evaluation:**
  - **Strengths:** Database-level trigger blocks non-admin users from escalating their own role, verification, or subscription flags even if client code is bypassed.

---

## 3. Vulnerability Findings & Identified Security Risks

1. **Unprotected Admin API Route (`/api/admin/migrate-legacy`):**
   - **Risk Level:** `HIGH`
   - **Detail:** Express endpoint in `server/migration.ts` lacks Bearer token or session authorization validation. Anyone sending a request can execute migration logic.
2. **Missing Razorpay Webhook:**
   - **Risk Level:** `MEDIUM`
   - **Detail:** Payment verification relies entirely on client POST to `/api/payment/verify-razorpay`. Network drops after payment result in lost entitlements.
3. **In-Memory Fallback Credentials:**
   - **Risk Level:** `MEDIUM`
   - **Detail:** When Supabase credentials are missing, system falls back to `memoryStore` where passwords are kept in plain text or mock hashes.
