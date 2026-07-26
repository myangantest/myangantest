# MyAngan - Email Delivery System & Transactional Messaging

This document specifies the transactional email architecture, templates, TLS security, retry rules, and audit logging protocol for **MyAngan** (`server/email.ts`).

---

## 1. System Email Architecture & Environment Dependencies

The transactional email engine uses Nodemailer with secure TLS settings and server-only environment variables:

* `SMTP_HOST`: Mail server hostname (default: `smtp.gmail.com`)
* `SMTP_PORT`: Mail server port (`587` for STARTTLS / `465` for SSL)
* `SMTP_SECURE`: Boolean (`true` for port 465)
* `SMTP_USER`: SMTP authentication username
* `SMTP_PASS` / `SMTP_PASSWORD`: SMTP authentication secret or App Password
* `EMAIL_FROM`: Default sender address (`noreply@myangan.in`)
* `EMAIL_REPLY_TO`: Default reply-to address

---

## 2. Security Controls & Non-Logging Rules

1. **Zero Sensitive Data Logging:** The email service **NEVER** logs passwords, OTP values, SMTP credentials, access tokens, or authorization headers to console logs or database audit tables.
2. **User Input HTML Escaping:** All user-provided fields (names, phone numbers, inquiry messages, property titles) are escaped using `escapeHtml()` to prevent cross-site scripting (XSS) and HTML injection attacks in HTML email templates.
3. **Startup Validation:** `validateSmtpConfig()` checks SMTP variable availability on server initialization and reports status cleanly without revealing passwords.

---

## 3. Email Templates & Use Cases

| Template Type | Trigger Event | Primary Recipient | Content / Format |
|---|---|---|---|
| `registration_otp` | User Registration / Login | User Email | 6-digit OTP code in styled container (10-min expiry). |
| `inquiry_owner` | Lead Submitted on Property | Property Owner | Renter contact details, property title, message body. |
| `inquiry_renter` | Lead Confirmation | Renter Email | Inquiry receipt confirmation & owner notification status. |
| `payment_receipt` | Payment Verification | Subscriber Email | Subscription plan, Razorpay reference ID, payment date. |

---

## 4. Retry Logic & Delivery Audit Logging

* **Retry Strategy:** If Nodemailer dispatch encounters transient network errors, `sendEmail()` retries up to **3 times** with exponential backoff (500ms, 1000ms, 1500ms delays).
* **Audit Logging:** Dispatched emails record metadata into `public.email_delivery_logs`:
  ```sql
  INSERT INTO public.email_delivery_logs 
    (recipient_email, template_type, message_id, status, error_details, created_at)
  VALUES 
    ('user@domain.com', 'registration_otp', 'msg_12345', 'sent', NULL, NOW());
  ```
