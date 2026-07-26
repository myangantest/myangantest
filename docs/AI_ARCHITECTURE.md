# MyAngan - AI Search Assistant & Rent Estimation Architecture

This document specifies the server-side AI architecture, Google GenAI API integration, prompt injection sanitization, schema normalization, and rent estimation algorithms for **MyAngan** (`server/ai.ts`).

---

## 1. System Architecture & Sequence Diagram

```
[Client Browser]                [MyAngan Express Server]           [Google Gemini API]
       │                                   │                                │
       │─── 1. POST /api/ai/ ─────────────►│                                │
       │    search-assistant (prompt)      │─── 2. Sanitize Prompt ─────────┤
       │                                   │    (Max 500 chars, Anti-XSS)   │
       │                                   │                                │
       │                                   │─── 3. POST /v1beta/models ────►│
       │                                   │    (GEMINI_API_KEY secret)     │
       │                                   │◄── 4. Raw Model JSON ──────────│
       │                                   │                                │
       │                                   │─── 5. Normalize & Validate ───┤
       │                                   │    (Strict Schema Check)       │
       │◄── 6. Filter JSON & Disclaimer ───│                                │
```

---

## 2. Security Boundaries & Secret Protection

1. **Zero Secret Exposure:** The `GEMINI_API_KEY` is maintained strictly as a server-side environment variable. It is **NEVER** bundled or exposed to frontend code.
2. **Untrusted Model Output:** Output returned by Google Gemini is treated as untrusted input. `validateAndNormalizeFilters()` strips unknown fields, validates value ranges, and floors numerical parameters before query execution.
3. **Zero Direct DB / SQL Generation:** The AI assistant converts text into structured filter parameters (`city`, `locality`, `bedrooms`, `minRent`, `maxRent`, `furnishing`). It **NEVER** generates or executes raw SQL queries.
4. **Prompt Injection Defense:** `sanitizeSearchPrompt()` strips control characters, SQL commands, and prompt override keywords (`ignore previous instructions`, `system prompt`, `drop table`).

---

## 3. Informational Rent Estimation Engine

* **Endpoint:** `POST /api/ai/rent-estimate`
* **Comparable Matching:** Queries `public.properties` for matching active listings based on `city`, `locality`, `bedrooms`, and `furnishing`.
* **Insufficient Data Fallback:** If comparable listings count < 2, the endpoint returns status `insufficient_data` without producing an inaccurate estimate.
* **Range & Confidence:** Returns an estimated price range (`minRent` – `maxRent`) rather than unsupported false precision, along with a confidence rating (`high` if $\ge 5$ comparables, `medium` if $3-4$, `low` if $2$).
* **Mandatory Disclaimer:**
  > *"Estimated rent is informational only. Actual rent may differ based on property condition, exact location, market demand and negotiation."*
