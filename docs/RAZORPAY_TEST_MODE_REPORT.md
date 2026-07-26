# MyAngan - Razorpay Test-Mode Integration & Security Report

**Date:** July 2026  
**Payment Gateway:** Razorpay API (Test Mode)  
**Safety Gate:** `VITE_PAYMENTS_ENABLED=false` (Default safety state)  

---

## 1. Security Architecture & Order Controls

### A. Server-Controlled Order Creation
* **Endpoint:** `POST /api/payments/orders`
* **Protection:** Requires Bearer JWT authentication. Amount and currency are calculated strictly on the server based on approved subscription plan tiers (`starter`, `pro`, `enterprise`). Client input cannot alter pricing.

### B. HMAC Signature Verification
* **Endpoint:** `POST /api/payments/verify`
* **Protection:** HMAC SHA-256 calculation (`crypto.createHmac('sha256', RAZORPAY_KEY_SECRET)`). Uses `crypto.timingSafeEqual` to prevent timing side-channel attacks.

### C. Webhook Idempotency & Raw Body Preservation
* **Endpoint:** `POST /api/payments/webhook`
* **Header Check:** Requires valid `x-razorpay-signature` header.
* **Idempotency:** Webhook event IDs are logged in `public.payment_webhook_events`. Duplicate events are skipped to prevent duplicate entitlement allocation.
* **Raw Body:** `express.json({ verify: ... })` captures untouched raw request buffer (`req.rawBody`) before JSON parsing.

---

## 2. Test Suite Execution & Verification Matrix

| Test Vector | Expected Behavior | Actual Behavior | Result |
|---|---|---|---|
| **Unauthenticated Order Request** | Returns HTTP 401 Unauthorized | Rejected with 401 | ✅ PASSED |
| **Invalid Subscription Plan** | Returns HTTP 400 Bad Request | Rejected with 400 | ✅ PASSED |
| **Tampered Payment Signature** | Signature mismatch rejected | Verification failed | ✅ PASSED |
| **Missing Webhook Signature** | Returns HTTP 400/401 | Webhook rejected | ✅ PASSED |
| **Duplicate Webhook Payload** | Skipped via idempotency table | Event skipped | ✅ PASSED |
