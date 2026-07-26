# MyAngan - Property Verification Workflow & Public Privacy Specification

This document details the property verification request pipeline, evidence document privacy controls, and sanitized public status wording for **MyAngan** (`server/operations.ts`).

---

## 1. Property Verification Request Pipeline

Verification requests progress through strict database status transitions:

```
 [not_submitted] ──► [submitted] ──► [under_review] ──► [approved]
                          │               │
                          ▼               ▼
           [additional_info_req]     [rejected] / [expired]
```

---

## 2. Public Status Readout & Wording Directives

Public listing detail pages query `GET /api/operations/verifications/:propertyId` which returns **ONLY** sanitized status labels:

* `submitted` $\rightarrow$ *"Documents submitted"*
* `under_review` $\rightarrow$ *"Verification under review"*
* `approved` $\rightarrow$ *"Verification completed by MyAngan review"*
* `additional_information_required` $\rightarrow$ *"Additional information requested by review team"*

### Prohibited Marketing Terminology:
The application **NEVER** displays the following claims:
- ❌ *"Government verified"*
- ❌ *"Title guaranteed"*
- ❌ *"Legally clear"*
- ❌ *"Fraud-free guarantee"*

---

## 3. Evidence Document Privacy Controls

* **Secure Internal Storage:** Document references (ownership deeds, electricity bills, tax receipts) are stored in `property_verification_requests.document_refs` as private bucket paths (`property-docs/`).
* **Zero Public Exposure:** Public API endpoints return **zero** document paths, Aadhaar numbers, tax IDs, or personal identification details.
