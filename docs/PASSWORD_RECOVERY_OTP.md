# MyAngan Password Recovery & Account Recovery Documentation

## 1. Overview & Architecture

MyAngan implements a production-grade, secure account recovery flow using 6-digit OTP verification and single-use password reset tokens.

### Key Security Design Principles
1. **Zero Account Enumeration Exposure**:
   * Requesting password recovery for any email (whether registered or non-existent) returns an identical generic response:
     `"If an account exists for this email, a recovery code has been sent."`
   * Does not reveal account existence, roles, or verification status.
2. **Strict Role & Permission Isolation**:
   * Password reset modifies ONLY the authentication password stored inside Supabase Auth.
   * Never modifies `account_category`, `provider_type`, `onboarding_status`, `user_roles`, `is_subscribed`, `is_verified`, or administrative permissions.
3. **Cryptographic Token & OTP Security**:
   * OTP codes are SHA-256 hashed before storage; plain-text OTPs and passwords are NEVER logged or stored.
   * OTP verification issues a single-use, 64-character hex reset token (`token_hash` stored as SHA-256 in `password_reset_tokens`) with a 15-minute expiration.
   * Enforces a 60-second resend cooldown rate limit per email.

---

## 2. Recovery Workflow

```
[ Forgot Password? Link ]
           │
           ▼
 [ Step 1: Enter Email ] ──> POST /api/auth/password-reset/request
           │                 (Enforces 60s cooldown & returns uniform generic message)
           ▼
 [ Step 2: Verify OTP ]  ──> POST /api/auth/password-reset/verify
           │                 (Validates OTP hash, consumes OTP, issues 64-char reset token)
           ▼
 [ Step 3: New Password ] ──> POST /api/auth/password-reset/complete
           │                 (Validates token, enforces policy, updates Supabase Auth password)
           ▼
 [ Step 4: Success ]     ──> Redirect to Sign In
```

---

## 3. Database Schema

### Table: `public.password_reset_tokens`
```sql
CREATE TABLE IF NOT EXISTS public.password_reset_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    token_hash TEXT NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    consumed_at TIMESTAMP WITH TIME ZONE,
    request_ip TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

ALTER TABLE public.password_reset_tokens ENABLE ROW LEVEL SECURITY;
```

---

## 4. Verification Scorecard

* **Typecheck (`npm run typecheck`):** **PASSED** (0 Errors)
* **Unit & Integration Tests (`npm run test:unit`):** **57 / 57 PASSED**
* **Production Build (`npm run build`):** **PASSED** (`dist/server.cjs` compiled cleanly)
* **Remote Supabase Push:** Migration `20260727000000_password_reset_tokens.sql` applied to live remote project `movnfiidyffdpwyouxkl`.

---

PASSWORD RECOVERY STATUS: FIXED AND DEPLOYED
