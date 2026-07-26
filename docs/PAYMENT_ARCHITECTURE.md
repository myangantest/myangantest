# MyAngan - Payment Gateway Architecture & Security Specification

This document details the production payment processing architecture, Razorpay integration, server-controlled order workflows, constant-time HMAC verification, and webhook idempotency design for **MyAngan**.

---

## 1. System Payment Architecture & Sequence Diagram

```
[Client Browser]            [MyAngan Express Server]           [Razorpay Gateway]
       │                               │                               │
       │─── 1. POST /api/payments/ ───►│                               │
       │    orders (plan_type)         │─── 2. POST /v1/orders ────────►│
       │                               │    (Server secret auth)       │
       │                               │◄── 3. Returns order_id ───────│
       │◄── 4. Order ID & KeyID ───────│                               │
       │                                                               │
       │─── 5. Launch Official Razorpay Checkout Modal ───────────────►│
       │                                                               │
       │◄── 6. Payment Approved (razorpay_payment_id & signature) ─────│
       │                                                               │
       │─── 7. POST /api/payments/verify ─────────────────────────────►│
       │    (razorpay_order_id, payment_id, signature)                 │
       │                               │                               │
       │                               │─── 8. HMAC SHA-256 Check ─────│
       │                               │    (crypto.timingSafeEqual)   │
       │                               │                               │
       │◄── 9. Entitlement Active ─────│                               │
       │                               │◄── 10. POST /webhook ─────────│
       │                               │    (Idempotency & fallback)   │
```

---

## 2. Security Boundaries & Zero-Trust Credentials Policy

1. **Zero Financial Credentials Collection:** MyAngan frontend code **NEVER** displays forms collecting card numbers, CVVs, expiry dates, netbanking passwords, or UPI PINs. All payment credential collection occurs inside Razorpay's PCI-DSS Level 1 compliant iframe/modal.
2. **Server-Controlled Pricing Matrix:** Plan amounts and currencies are enforced server-side (`server/payments.ts`). The client cannot manipulate the payable amount.
3. **Secret Isolation:** `RAZORPAY_KEY_SECRET` and `RAZORPAY_WEBHOOK_SECRET` reside strictly in server environment variables. Only `VITE_RAZORPAY_KEY_ID` is exposed to the client.
4. **No Callback-Only Entitlement Activation:** Browser callbacks alone do **NOT** grant subscription access. Entitlement activation requires server-side HMAC signature verification (`POST /api/payments/verify`) or verified webhook confirmation (`POST /api/payments/webhook`).

---

## 3. Webhook Idempotency & Replay Protection

* **Endpoint:** `POST /api/payments/webhook`
* **Raw Body Validation:** Requests are parsed using raw buffer middleware (`express.json({ verify: ... })`) to ensure byte-level HMAC signature matching.
* **Constant-Time Verification:** Signatures are compared using `crypto.timingSafeEqual` to prevent timing side-channel attacks.
* **Idempotency Log:** Webhook events are logged in `public.payment_webhook_events`. Duplicate `event_id` deliveries return HTTP 200 `{ "status": "already_processed" }` without re-triggering entitlement logic.

---

## 4. Payment State Machine & Table Mapping

```
 [created] ──► [paid]     (Payment captured & verified)
           ──► [failed]   (Payment declined or rejected)
           ──► [expired]  (Checkout session timed out)
           ──► [refunded] (Admin / Razorpay refund issued)
```

* `public.payment_orders`: Tracks order initialization, user ID, plan type, and amount in paisa.
* `public.payment_transactions`: Records verified payment transaction IDs and signature proofs.
* `public.payment_webhook_events`: Idempotency event log.
* `public.audit_logs`: Immutable audit record of payment events.
