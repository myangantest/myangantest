# MyAngan - Production Risk Register & Mitigation Matrix

This document outlines all technical, security, legal, operational, and financial risks associated with the **MyAngan** application, along with probability/impact ratings and contingency plans.

---

## 1. Comprehensive Risk Register

| Risk ID | Category | Risk Description | Likelihood | Impact | Risk Level | Mitigation Strategy | Contingency / Fallback Plan |
|---|---|---|---|---|---|---|---|
| **RISK-01** | Security | Unauthenticated access to admin endpoints (`/api/admin/*`). | Medium | High | **CRITICAL** | Implement JWT session verification middleware and admin role check on Express server. | Reject unauthenticated requests with HTTP 401. |
| **RISK-02** | Financial | Payment entitlement loss due to browser closure during Razorpay checkout. | Medium | High | **CRITICAL** | Implement server-side Razorpay Order creation and idempotent webhook handler. | User manual payment verification tool in admin dashboard. |
| **RISK-03** | Security | OTP brute-force guessing attack on `/api/auth/verify-otp`. | High | Medium | **HIGH** | Limit OTP attempts to 5 max, hash OTPs with HMAC SHA-256, enforce 10-min expiry. | Auto-lock account for 1 hour after 5 failed attempts. |
| **RISK-04** | Legal / Compliance | Misleading user claims regarding "blockchain verification" or "legal compliance". | High | Medium | **HIGH** | Rename all visual indicators to "MyAngan Verified Audit Record" and "Informational Template". | Display prominent disclaimer text on all PDF exports. |
| **RISK-05** | Security | Rate limiting bypass or denial of service attack on API endpoints. | Medium | Medium | **MEDIUM** | Apply `express-rate-limit` (100 req/15 min) and `helmet` security headers on all routes. | IP blocking via Cloudflare / AWS WAF. |
| **RISK-06** | Data Integrity | Database table missing error when operating without applied SQL migrations. | High | Low | **MEDIUM** | Apply all 3 Supabase migrations (`init`, `otp`, `production_hardening`) to target Postgres DB. | System gracefully logs notice and falls back to persistent local storage in dev. |
| **RISK-07** | Operational | Image URL rot or broken base64 images uploaded by users. | Medium | Low | **MEDIUM** | Wire direct client upload to Supabase Storage bucket `property-images`. | Render fallback property image asset (`/assets/default-property.png`). |
| **RISK-08** | Third-Party API | Google GenAI API rate limits or service outage affecting AI Search Assistant. | Low | Low | **LOW** | Implement server-side error handling with graceful fallback to regex keyword parser. | Fall back to standard search filters (`ListingsView.tsx`). |

---

## 2. Risk Matrix & Severity Key

```
IMPACT ──►
  HIGH     │  RISK-05 (Med)      RISK-01 (Critical)    RISK-02 (Critical)
  MEDIUM   │  RISK-06 (Med)      RISK-03 (High)        RISK-04 (High)
  LOW      │  RISK-08 (Low)      RISK-07 (Med)         ───
           └─────────────────────────────────────────────────────────────►
               LOW                  MEDIUM                 HIGH
                                  LIKELIHOOD ──►
```
