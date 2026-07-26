# MyAngan - Master QA Test Plan & Traceability Strategy

## 1. Executive QA Overview & Objectives
This Master Test Plan documents the quality assurance, automation, security, performance, accessibility, and User Acceptance Testing (UAT) strategy for **MyAngan** (https://myangan.com/) — Delhi NCR's premier real estate & property listing platform for Renters, Owners, Brokers, and Administrators.

The primary objective is to validate end-to-end platform stability, verify server security & data persistence integrity, ensure multi-role authorization enforcement, guarantee responsive cross-browser compatibility, and verify smooth Razorpay payment workflows.

---

## 2. Test Scope & Feature Traceability

### In-Scope Functional Areas
- **Public Core & Navigation**: Landing view, header, footer, search bar, contact forms, static policy pages, custom 404 handling.
- **Authentication & Security**: Email/OTP user registration, verification logic, 6-digit OTP rate limiting, session management, secure password storage.
- **Role-Based Access Control (RBAC)**: Enforced authorization for Renter, Landlord/Owner, Broker, and Admin roles (UI & direct API boundaries).
- **Property Discovery Engine**: City/Locality search, BHK filters, budget sliders, furnishing status, radius/distance calculations (100m to 60km), sorting, pagination.
- **Interactive Geolocation & Maps**: Leaflet open-street mapping, user coordinate fallback, Haversine formula calculation, directions links.
- **Property Listing & Management**: Multi-step property posting, image upload & preview, listing edition, pause/unpublish, moderation queue.
- **Engagement Features**: Favorites drawer, side-by-side property comparison (up to 3 properties), WhatsApp lead dispatches.
- **Admin Moderation & SEO Suite**: Content moderation, custom SEO dynamic template management, waitlist export, lead audit logs.
- **Integrations**: Razorpay test payment checkout, server-side HMAC payment signature validation, Nodemailer email notifications.

### Out-of-Scope / Safety Exclusions
- Destructive operations on production live database tables.
- Real monetary card debits (Razorpay strictly constrained to Test Mode).
- Unsolicited bulk SMS/WhatsApp messages or spam email dispatches.

---

## 3. Test Environment & Automation Architecture

### Technology Stack & Test Tools
- **Test Runner & Framework**: `Vitest` v4.1.10
- **API Testing**: `Supertest` & Native Fetch integration against local Express server on port 3000
- **Component & DOM Testing**: `@testing-library/react`, `jsdom`
- **Linting & Type Verification**: `tsc --noEmit` (TypeScript 5.8)
- **Accessibility Verification**: `axe-core` & WCAG 2.1 AA manual keyboard navigation audit
- **End-to-End Browser Automation**: `Playwright` engine for Chromium, Firefox, and WebKit emulation

---

## 4. Test Execution & Severity Classification

### Defect Severity Matrix
- **Blocker (S1)**: Total application crash, broken core navigation, or unusable core transaction loop.
- **Critical (S2)**: Security bypass, IDOR flaw, unauthorized access, broken server signature, data corruption.
- **High (S3)**: Primary feature fails without an immediate workaround (e.g. inability to submit property details).
- **Medium (S4)**: Partial feature defect with an available workaround (e.g., minor UI misalignment in filter modal).
- **Low (S5)**: Cosmetic styling inconsistencies, minor spacing issues, or typo in non-critical copy.

---

## 5. Entry & Exit Criteria

### Entry Criteria
1. Node.js backend server boots successfully on port 3000 with Express endpoints mounted.
2. Production build compiles cleanly via `npm run build` with zero TypeScript errors.
3. Test environment initialized with isolated mock/Supabase test database records.

### Exit Criteria
1. 100% of automated unit, integration, and API test suites pass (`npm run test`).
2. Zero S1 (Blocker) or S2 (Critical) unresolved defects.
3. Full UAT user journey workflows executed and verified.
4. Production bundle generates clean artifacts with valid source maps and no exposed secrets.
