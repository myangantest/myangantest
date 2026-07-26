# MyAngan - User Acceptance Testing (UAT) Results Report

## 1. UAT Execution Overview
**Date**: July 21, 2026  
**Environment**: Local Cloud Container & Integrated Express API Server  
**Platform**: MyAngan Real Estate Platform (Delhi NCR)  
**Lead QA Engineer**: Senior QA & Security Automation Lead  

All core user personas (Visitor, Renter, Landlord/Owner, Broker, Administrator) were evaluated across primary user journeys to confirm operational readiness.

---

## 2. Detailed UAT Journey Scenarios & Execution Evidence

### UAT-01: Visitor Searches for & Contacts a Property
- **Persona**: Unauthenticated Public Visitor
- **Preconditions**: User visits https://myangan.com/ without logging in.
- **Steps**:
  1. Navigate to Homepage (`/`).
  2. Enter search location "Gurgaon" and select "2 BHK" filter.
  3. Click on property card "Luxury 2BHK Apartment in DLF Phase 5".
  4. Inspect property detail page, view image gallery, and amenities list.
  5. Click "Contact Owner / Send Inquiry" button and submit name, phone, and message.
- **Expected Result**: Inquiry form validates required input, dispatches inquiry payload to `/api/contact-inquiry`, and displays confirmation toast.
- **Actual Result**: Inquiry processed cleanly, transactional notifications queued, confirmation modal displayed.
- **Status**: **PASS**

---

### UAT-02: Renter Registers, Favourites, and Compares Properties
- **Persona**: Registered Renter (`renter@myangan.in`)
- **Preconditions**: Renter completes OTP verification on login.
- **Steps**:
  1. Click "Sign In / Register", enter email, receive 6-digit OTP code (`123456` in mock mode).
  2. Authenticate successfully and land on Listings view (`/listings`).
  3. Click heart icon on 2 properties to add them to Favourites drawer.
  4. Click "Compare" checkbox on 2 properties to populate floating comparison bar.
  5. Click "Compare Now" to open `/compare` route and view side-by-side spec comparison table.
- **Expected Result**: Favourites and comparison IDs persist in `localStorage` without `Unexpected end of JSON input` errors. Comparison view displays side-by-side rent, BHK, deposit, and amenities.
- **Actual Result**: Favourites and comparison state saved reliably. Comparison view renders cleanly with side-by-side highlights.
- **Status**: **PASS**

---

### UAT-03: Owner Registers and Posts/Edits a Property
- **Persona**: Property Owner / Landlord (`landlord@myangan.in`)
- **Preconditions**: Owner account authenticated.
- **Steps**:
  1. Navigate to `/post-property`.
  2. Complete Step 1 (Basic Details: Title, Rent, Deposit, Type, City, Locality).
  3. Complete Step 2 (Property Specs: BHK, Furnishing, Bathrooms, Area, Description).
  4. Complete Step 3 (Media & Features: Upload image URLs/files, select amenities).
  5. Select Razorpay Featured Listing promotion (optional) or standard submission.
  6. Submit property.
- **Expected Result**: Form validates input, creates property record in database, and redirects to Dashboard (`/dashboard`).
- **Actual Result**: Property created successfully with unique ID, visible in Owner Dashboard under listing management.
- **Status**: **PASS**

---

### UAT-04: Broker Manages Permitted Listings & Leads
- **Persona**: Licensed Broker (`broker@myangan.in`)
- **Preconditions**: User registered with `landlord_broker` role.
- **Steps**:
  1. Navigate to `/brokers` directory.
  2. View broker profile card showing active listings count, experience badge, and verification status.
  3. Navigate to Broker Dashboard (`/dashboard`) to review client leads and active property list.
- **Expected Result**: Broker accesses only permitted listings and leads. Non-authorized admin routes remain strictly blocked.
- **Actual Result**: Broker view functions as expected; permissions enforced.
- **Status**: **PASS**

---

### UAT-05: Administrator Reviews and Approves/Rejects Listings
- **Persona**: Platform Administrator (`admin@myangan.in`)
- **Preconditions**: Authenticated with `admin` role credentials.
- **Steps**:
  1. Access Admin Portal (`/admin`).
  2. Navigate to Moderation Queue tab.
  3. Review newly submitted pending property listing.
  4. Click "Approve Listing" to publish property to public search index.
  5. Navigate to SEO Template Manager (`/seo-admin`) to update dynamic meta descriptions.
- **Expected Result**: Property status updates to `active` immediately in public searches. SEO templates persist in system state.
- **Actual Result**: Listing status updated, admin actions audited, public index refreshed.
- **Status**: **PASS**

---

### UAT-06: User Performs Nearby/Radius Search and Opens Directions
- **Persona**: Public Visitor / Renter
- **Preconditions**: Browser geolocation or location filter selected.
- **Steps**:
  1. On `/listings`, toggle "Nearby Search / Distance Filter".
  2. Select center coordinate (e.g., Connaught Place, New Delhi) and set radius slider to "5 km".
  3. Inspect property distance badges (e.g., "2.4 km away").
  4. Click "Get Directions" on a property card.
- **Expected Result**: Distance calculated via Haversine formula. Listings outside selected radius are filtered out. Clicking directions opens Google Maps with accurate latitude/longitude destination.
- **Actual Result**: Radius filtering functions accurately from 100m to 60km. Directions links open Google Maps with valid coordinates.
- **Status**: **PASS**

---

### UAT-07: Razorpay Payment Test Workflow (Success, Failure, Cancel)
- **Persona**: Property Owner purchasing Featured Listing Subscription
- **Preconditions**: Owner posting property or upgrading listing.
- **Steps**:
  1. Select "Featured Listing Upgrade (₹999)".
  2. Trigger Razorpay checkout modal (`/api/auth/verify-payment`).
  3. Test Scenario A (Success): Submit valid test payment signature -> Server verifies HMAC hash -> Success toast & featured badge assigned.
  4. Test Scenario B (Invalid Signature): Submit tampered payment signature -> Server returns 400 Bad Request with error.
  5. Test Scenario C (Cancellation): Close modal -> Modal unmounts cleanly, property remains in standard state.
- **Expected Result**: Server creates order and validates signature server-side. Payments are never trusted solely from client callbacks.
- **Actual Result**: Signature validation passes/fails as expected; Razorpay Test Mode handled cleanly.
- **Status**: **PASS**

---

### UAT-08: User Encounters Invalid OTP, Network Failure & Missing Property
- **Persona**: Any User
- **Preconditions**: Various edge condition triggers.
- **Steps**:
  1. Enter invalid OTP code `999999` during login -> Display "Incorrect code. Please try again." error.
  2. Exceed 5 incorrect OTP attempts -> Display lock out message "Maximum attempts reached. Please request a new code."
  3. Access invalid property route `/property/non-existent-id-999` -> Render user-friendly "Property Not Found" view with "Back to Search" button.
- **Expected Result**: Graceful error handling without application crashes or uncaught exceptions.
- **Actual Result**: All error boundaries handled gracefully.
- **Status**: **PASS**

---

## 3. UAT Execution Summary Table
| Journey ID | Description | Role | Status | Evidence / Notes |
|---|---|---|---|---|
| UAT-01 | Public Search & Owner Inquiry | Visitor | **PASS** | Contact payload delivered & confirmed |
| UAT-02 | Renter Favourites & Side-by-Side Comparison | Renter | **PASS** | State persisted without JSON errors |
| UAT-03 | Owner Multi-Step Property Posting | Owner | **PASS** | Property created and listed in dashboard |
| UAT-04 | Broker Listing & Lead Management | Broker | **PASS** | Role permissions enforced |
| UAT-05 | Admin Property Moderation & SEO Control | Admin | **PASS** | Listing status updated to active |
| UAT-06 | Geolocation, Distance Calculation & Radius Search | Visitor | **PASS** | Haversine formula verified (100m - 60km) |
| UAT-07 | Razorpay Payment Verification & Security | Owner | **PASS** | HMAC signature validated server-side |
| UAT-08 | Error Recovery (OTP lock, 404 routes, missing IDs) | All | **PASS** | Handled with clean UI error bounds |
