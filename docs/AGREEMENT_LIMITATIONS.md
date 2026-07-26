# MyAngan - Digital Agreement Generator Limitations & Compliance Directive

This document defines the technical design, versioning protocol, and mandatory legal disclaimers for the **MyAngan Lease Agreement Draft Generator** (`server/operations.ts`).

---

## 1. Mandatory Document Labels & Wording Directives

To maintain strict compliance with legal frameworks and prevent misleading user expectations, all generated agreement exports MUST adhere to the following rules:

1. **Header Label:** All PDF/HTML document headers must be prominently labeled **"Draft Rental Agreement"**.
2. **Disclaimer Notice:** Every generated document must display the explicit notice:  
   > ⚠️ **NOTICE: This document is a configurable draft and is not legal advice.**
3. **No Fake E-Stamping Claims:** Documents are **NEVER** described as "e-stamped" or "officially registered" unless a real authorized government e-stamping integration has completed successfully.
4. **No Fake E-Signature Claims:** Typed, drawn, or uploaded signature visuals are classified as *Simulated Signature Visuals*, **not** legally valid e-signatures.
5. **No Automatic Compliance Claims:** Agreements are marked *Informational Agreement Templates*, subject to jurisdiction legal review (Delhi / Haryana Model Tenancy Act).

---

## 2. Agreement Versioning Architecture

* **Primary Table:** `public.agreement_records` (Stores property ID, landlord ID, tenant ID, rent amount, deposit, start date, tenure, notice period, lock-in, terms JSON).
* **Versioning History Table:** `public.agreement_versions` (Records `version_number`, `terms_json`, `created_by`, `created_at` on every modification).
* **PDF Export Endpoint:** `GET /api/operations/agreements/:id/pdf` (Generates printable document with Anti-XSS HTML escaping).
