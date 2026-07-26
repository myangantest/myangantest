# MyAngan - Open Issues, Defect Log & Remediation Roadmap

This document outlines all identified defects, architectural gaps, and required technical remediation steps for **MyAngan**.

---

## 1. Defect & Missing Work Backlog

| Issue ID | Module | Category | Description | Severity | Remediation Strategy |
|---|---|---|---|---|---|
| **ISSUE-01** | Backend Admin API | Security | `/api/admin/migrate-legacy` lacks JWT session verification middleware. | **CRITICAL** | Add admin authentication middleware to verify Bearer JWT token before allowing request. |
| **ISSUE-02** | Razorpay Payments | Architecture | Server-side Razorpay Order creation (`/api/payment/create-order`) and Webhook listener (`/api/payment/webhook`) missing. | **CRITICAL** | Implement official Razorpay Node SDK server-side order generation and HMAC webhook verification. |
| **ISSUE-03** | Image Storage | Functional | Property images use external URLs; direct Supabase Storage bucket upload (`property-images`) not wired up. | **HIGH** | Implement `supabase.storage.from('property-images').upload()` handler in `PostPropertyView.tsx`. |
| **ISSUE-04** | AI Assistant | Functional | `AiAssistantModal.tsx` uses client-side regex heuristics instead of executing real Gemini LLM API calls. | **HIGH** | Integrate Google GenAI SDK (`@google/genai`) server-side or via API router for structured property recommendations. |
| **ISSUE-05** | Digital Lease Agreement | Database / Legal | `LeaseAgreementView.tsx` is UI-only simulation; missing `agreements` table and backend PDF generation. | **HIGH** | Create `agreements` SQL migration table and integrate server-side PDF renderer (Puppeteer/PDFKit). |
| **ISSUE-06** | Property Passport | Database / Legal | `PropertyPassportModal.tsx` uses simulated blockchain hashes; missing `property_passports` DB table and RERA verification. | **HIGH** | Create `property_passports` SQL table and link verified verification credentials. |
| **ISSUE-07** | Maintenance OS | Database / Ops | `MaintenanceModal.tsx` generates simulated ticket IDs without saving to database. | **HIGH** | Create `maintenance_tickets` SQL table and add `/api/maintenance/tickets` Express endpoints. |
| **ISSUE-08** | Corporate & Vendor Portals | Product Scope | Corporate Housing OS and Vendor Marketplace specified in blueprint Section 5 are completely missing. | **MEDIUM** | Implement Corporate Portal (relocation dashboard) and Vendor Portal (SLA tracking) as planned in Phase V1. |

---

## 2. Production Blockers List

1. **Unauthenticated Admin Endpoints:** `/api/admin/*` must be protected by admin authorization checks before production deployment.
2. **Missing Payment Webhooks:** Live payment entitlements cannot depend on client-side HTTP POSTs without server webhook confirmation.
3. **Database Table Synchronization:** SQL migrations (`20260719000000_init.sql`, `20260720000000_otp_notifications.sql`, `20260724000000_production_hardening.sql`) must be applied to the production Supabase instance.
4. **Environment Variables Verification:** Production environment must declare `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `SMTP_USER`, and `SMTP_PASS`.
