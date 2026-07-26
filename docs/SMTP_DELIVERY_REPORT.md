# MyAngan - SMTP Email Delivery & Anti-XSS Security Report

**Date:** July 2026  
**Email Engine:** Nodemailer (`server/email.ts`)  
**Target SMTP Provider:** Google Workspace / Gmail (`smtp.gmail.com:465`)  

---

## 1. SMTP Variable Standardization & Security

### Normalized Variable Names:
* `SMTP_HOST` (`smtp.gmail.com`)
* `SMTP_PORT` (`465` for SSL / `587` for TLS)
* `SMTP_SECURE` (`true`)
* `SMTP_USER` (Full custom Google Workspace email address)
* `SMTP_PASSWORD` (16-character Google App Password)
* `EMAIL_FROM` (`MyAngan <service@myangan.in>`)
* `EMAIL_REPLY_TO` (`support@myangan.in`)

---

## 2. Security & Template Protection Controls
1. **App Password Requirement:** Google Workspace accounts require App Passwords with 2FA enabled. Main account passwords are blocked.
2. **HTML Content Escaping:** `escapeHtml()` sanitizes user inputs (names, phones, messages, property titles) inside HTML email bodies to prevent stored XSS injection.
3. **Secret Masking:** Logs contain delivery status and recipient addresses only. Plaintext OTP codes and SMTP passwords are never logged or stored.

---

## 3. Email Delivery Test Matrix

| Trigger Event | Email Template Sent | Recipient | Sanitization Check | Result |
|---|---|---|---|---|
| **User Registration** | 6-Digit OTP Code | User Email | OTP masked in server logs | ✅ PASSED |
| **Resend OTP Request** | Throttled OTP Code | User Email | Rate limit enforced | ✅ PASSED |
| **Renter Inquiry Submit** | Inquiry Confirmation | Renter | XSS HTML escaped | ✅ PASSED |
| **Landlord Inquiry Notice** | Lead Notification | Property Owner | Owner details formatted | ✅ PASSED |
