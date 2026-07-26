# MyAngan - AI Safety, Guardrails & Disclaimer Directives

This document specifies the safety controls, prompt injection defense, schema validation rules, and mandatory user disclaimers for AI capabilities in **MyAngan** (`server/ai.ts`).

---

## 1. Safety Guardrails & Input Validation

1. **Prompt Sanitization:** Incoming prompts are capped at 500 characters and filtered for injection keywords using `sanitizeSearchPrompt()`.
2. **Untrusted Schema Normalization:** Raw LLM outputs are processed via `validateAndNormalizeFilters()` which enforces integer bounds (e.g. `bedrooms` $\in [1, 10]$, `rent` $\in [1000, 1000000]$) and strips unapproved attributes.
3. **Usage Logging & Audit Trail:** Queries are logged to `public.audit_logs` without capturing sensitive PII or credentials.
4. **Fallback Mechanism:** If `GEMINI_API_KEY` is missing or the external API times out, the system falls back to `parseUserIntentFallback()` without crashing.

---

## 2. Mandatory User Disclaimers & Notice Texts

### AI Search Assistant Notice:
> ℹ️ **Notice: AI recommendations are generated automatically and may misunderstand your request.**

### Rent Estimation Disclaimer:
> ⚠️ **Disclaimer: Estimated rent is informational only. Actual rent may differ based on property condition, exact location, market demand and negotiation.**

---

## 3. Prohibited Marketing Terminology

The application **NEVER** classifies rent estimates using the following terms:
* ❌ *"Official valuation"*
* ❌ *"Certified valuation"*
* ❌ *"Guaranteed market rent"*
* ❌ *"Government-approved estimate"*
