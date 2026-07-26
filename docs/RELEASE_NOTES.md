# MyAngan v1.0.0 - Production Release Notes

**Release Version:** `v1.0.0-release`  
**Release Date:** July 2026  
**License:** Apache-2.0  

---

## 🚀 Key Highlights & Release Summary

**MyAngan v1.0.0** is a secure, database-backed, high-performance rental marketplace for Gurugram, Noida, and South Delhi. This release completes 4 remediation phases establishing a production foundation across database schemas, authentication, payments, transactional email, maintenance operations, agreement generators, property verification, and server-side AI assistance.

---

## 📦 What's Included in v1.0.0

### 1. Database Foundation & Row Level Security
* 16 Postgres tables implemented with foreign key constraints, indexes, and PL/pgSQL triggers (`20260726120000_phase1_backend_foundation.sql`).
* Row Level Security (RLS) policies enabled across all tables, blocking renters from creating listings, restricting property updates to owners, and isolating user records.
* Storage bucket policy for private `property-images` bucket (5MB max limit, JPEG/PNG/WebP).

### 2. Payments & Transactional Email
* Official Razorpay Gateway integration with server-controlled order pricing (`PLAN_PRICING`), server-side HMAC SHA-256 signature verification (`POST /api/payments/verify`), and raw-body idempotent webhook listener (`payment_webhook_events`).
* Nodemailer email service with TLS, anti-XSS content escaping (`escapeHtml`), 3-attempt retry logic, and delivery logging (`email_delivery_logs`). Passwords and secrets are excluded from logs.

### 3. Operational Modules
* **Maintenance OS:** Database-backed ticketing (`maintenance_tickets`), SLA target timestamps (`sla_target_at`), status history logs, and comment threads.
* **Lease Agreement Generator:** Draft agreement recorder (`agreement_records`), version history (`agreement_versions`), and printable PDF generator displaying mandatory labels **"Draft Rental Agreement"** and disclaimer **"This document is a configurable draft and is not legal advice."**
* **Property Verification Request Pipeline:** Database-backed verification requests (`property_verification_requests`). Public readout endpoint (`GET /api/operations/verifications/:propertyId`) returns ONLY sanitized status labels (*"Documents submitted"*, *"Verification under review"*, *"Verification completed by MyAngan review"*). Sensitive deeds remain private.
* **Moderation Queue:** Listing report queue (`property_reports`) and admin review endpoint (`POST /api/operations/moderation/review`) which suspends flagged properties (`status = 'inactive'`) and logs audit records (`audit_logs`).

### 4. AI Capabilities & Rent Estimation
* **Server-Side AI Search Assistant:** Converts natural language into a strict normalized filter schema (`city`, `locality`, `minRent`, `maxRent`, `bedrooms`, `furnishing`, `amenities`) with prompt injection defense (`sanitizeSearchPrompt()`).
* **Informational Rent Estimation Engine:** Analyzes active comparable listings, calculates price ranges (`minRent` – `maxRent`) and confidence ratings, and returns status `insufficient_data` if comparables count < 2. Mandatory disclaimers attached to all outputs.

---

## 🛠️ System Requirements & Operations

* **Runtime:** Node.js 18+ (Node.js 22 recommended)
* **Database:** Supabase PostgreSQL instance with RLS enabled
* **Environment Configuration:** Reference [docs/PRODUCTION_ENV_CHECKLIST.md](file:///c:/Users/Ankit/OneDrive/Desktop/MyAngan/docs/PRODUCTION_ENV_CHECKLIST.md)
* **Deployment Guide:** Reference [docs/DEPLOYMENT_RUNBOOK.md](file:///c:/Users/Ankit/OneDrive/Desktop/MyAngan/docs/DEPLOYMENT_RUNBOOK.md)
* **Rollback Guide:** Reference [docs/ROLLBACK_RUNBOOK.md](file:///c:/Users/Ankit/OneDrive/Desktop/MyAngan/docs/ROLLBACK_RUNBOOK.md)
