# MyAngan - Master Test Plan & Production Readiness Strategy

This document defines the master quality assurance, testing methodology, static quality standards, security assessment rules, and release verification gates for **MyAngan**.

---

## 1. Quality Assurance Scope & Objectives

The primary objective is to verify that **MyAngan** is secure, performant, database-backed, compliant with legal disclaimer guidelines, and free of critical vulnerabilities before production deployment.

### Test Categories & Methodologies:
1. **Static Quality Verification:** TypeScript strict typechecking (`npx tsc --noEmit`), build verification (`npm run build`), dependency auditing (`npm audit`), secret scanning, and source-map review.
2. **Unit Testing:** Input schema validation, password hashing, HMAC SHA-256 OTP calculations, timing-safe string comparison, search filter parsing, email HTML escaping, ticket state transitions, and AI filter normalization.
3. **Integration Testing:** Supabase database CRUD, RLS policy enforcement, private storage bucket access controls, Razorpay payment verification, webhook idempotency (`payment_webhook_events`), and transactional email dispatch.
4. **End-to-End User Flow Testing:** Renter registration, owner listing posting, property photo upload, owner listing edit/unpublish, cross-owner data isolation, property search/map, favorite/compare, maintenance ticket lifecycle, lease agreement draft PDF generation, property verification readout, and payment checkout flows.
5. **Manual & Cross-Device QA:** Responsive testing across 6 viewport widths (360px, 390px, 768px, 1024px, 1366px, 1920px), cross-browser compatibility (Chrome, Edge, Firefox, Safari), keyboard accessibility, focus visibility, contrast, and reduced motion.
6. **Security & Vulnerability Assessment:** IDOR, broken role authorization, RLS bypass, SQL/filter injection, XSS prevention, file upload mime spoofing, rate-limiting, CORS, webhook replay protection, payment tampering, and prompt injection defense.

---

## 2. Test Environment & Command Reference

```bash
# Static Quality Gate (TypeScript Typecheck)
npx tsc --noEmit

# Production Build Gate
npm run build

# Automated Full-Stack Quality Test Suite (50 Assertions)
npx tsx scripts/test-suite.ts

# Production Server Execution Verification
npm run start
```
