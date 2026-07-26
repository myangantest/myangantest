# MyAngan - System Limitations & Operational Scope Boundaries

This document records the documented operational scope, legal disclaimers, and system boundaries for **MyAngan**.

---

## 1. System Operational Scope & Legal Boundaries

1. **Informational Agreement Generator:** Generated agreement exports are marked **"Draft Rental Agreement"** with notice **"This document is a configurable draft and is not legal advice."** The system does not provide automated e-stamping or legal representation.
2. **Simulated Signature Visuals:** Signature fields are classified as *Simulated Signature Visuals*, not legally binding e-signatures.
3. **MyAngan Review Verification:** Verification status badges (*"Verification completed by MyAngan review"*) reflect internal document check reviews. They do not constitute government certification or legal title guarantees.
4. **Informational Rent Estimates:** AI price estimates represent data-driven market ranges (`minRent` – `maxRent`). Actual negotiated rent depends on property condition and market negotiation.
5. **Private Storage Policies:** Property ownership evidence documents remain strictly in private storage and are never exposed publicly.
6. **Payments Disabled by Default:** `VITE_PAYMENTS_ENABLED` defaults to `false` until live Razorpay production keys are populated by the administrator in the hosting environment.
