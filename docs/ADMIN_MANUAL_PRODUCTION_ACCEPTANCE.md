# MyAngan Administrator & Listing Governance Manual Production Acceptance Checklist

This checklist is designed for the project owner to execute manually in a web browser against the deployed environment before approving release.

---

## 1. Admin Authentication & Session Persistence

- [ ] **1.1 Access Admin Login Route**
  - Navigate to `/admin/login`.
  - Confirm the page renders cleanly without UI distortion.
- [ ] **1.2 Admin Authentication**
  - Enter valid credentials (`service@myangan.com` and configured admin password).
  - Click **Sign In**.
  - Confirm HTTP 200 response and automatic redirection to `/admin/dashboard`.
- [ ] **1.3 Session Persistence on Page Refresh**
  - Refresh the browser (`F5` or hard reload).
  - Confirm you remain logged in and the `/admin/dashboard` view is maintained.
- [ ] **1.4 Session Sign Out**
  - Click **Sign Out** / **Logout**.
  - Confirm token session is destroyed and you are redirected to `/admin/login`.
- [ ] **1.5 Non-Admin Protection**
  - Log in with a standard renter or landlord user account.
  - Navigate directly to `/admin/dashboard`.
  - Confirm access is denied with a 403 / redirect to login.

---

## 2. Owner & Broker Verification Queue

- [ ] **2.1 Owner Account Onboarding**
  - Register a new test account selecting **Owner** during onboarding.
  - Confirm the provider enters `pending_verification` state.
- [ ] **2.2 Broker Account Onboarding**
  - Register a new test account selecting **Broker** during onboarding.
  - Confirm the provider enters `pending_verification` state.
- [ ] **2.3 Admin Provider Review Queue**
  - Log into `/admin/dashboard`.
  - Confirm both test Owner and Broker accounts appear under the **Owner/Broker Verification Reviews** queue.
- [ ] **2.4 Decision: Request Additional Information**
  - Select one provider, enter feedback notes, and click **Request Info**.
  - Confirm status updates to `additional_information_required` and notes are saved.
- [ ] **2.5 Decision: Approve Provider**
  - Select the second provider and click **Approve**.
  - Confirm account status updates to `active` with `is_verified = true`.
- [ ] **2.6 Self-Approval Protection**
  - Log in as the unapproved provider.
  - Attempt to mutate verification state or role directly.
  - Confirm self-approval is rejected.

---

## 3. Property Listing Approval & Lifecycle Queue

- [ ] **3.1 Post Property as Provider**
  - Log in as an approved Owner or Broker.
  - Post a new rental property.
  - Confirm the property initializes as `approval_status = 'pending_review'` and `status = 'pending'`.
- [ ] **3.2 Public Visibility Check (Pending)**
  - Open an anonymous/incognito browser window and search for listings.
  - Confirm the pending property does NOT appear in public search results.
- [ ] **3.3 Admin Listing Queue Review**
  - Log into `/admin/dashboard`.
  - Confirm the property appears under **Pending Listing Queue**.
- [ ] **3.4 Decision: Request Changes**
  - Select **Request Changes**, enter specific feedback (e.g. "Upload balcony photo"), and submit.
  - Confirm status updates to `changes_requested`.
- [ ] **3.5 Owner Dashboard View & Resubmit**
  - Log back in as the property owner.
  - View the dashboard. Confirm admin feedback notes are visible.
  - Click **Resubmit for Review**.
  - Confirm status resets to `pending_review`.
- [ ] **3.6 Decision: Approve Listing**
  - In Admin Dashboard, select **Approve**.
  - Confirm property `approval_status = 'approved'` and operational `status = 'active'`.
- [ ] **3.7 Public Visibility Check (Approved)**
  - Open public search in an incognito window.
  - Confirm the property now appears publicly.
- [ ] **3.8 Decision: Suspend Listing**
  - In Admin Dashboard, select **Suspend** with review notes.
  - Confirm status updates to `suspended`.
  - Confirm property immediately disappears from public search.
- [ ] **3.9 Decision: Restore Listing**
  - In Admin Dashboard, select **Restore**.
  - Confirm property is restored to `approved` and `active` status.

---

## 4. API Authorization & Header Protection

- [ ] **4.1 Unauthenticated API Protection**
  - Send an API request to `GET /api/admin/providers` without a Authorization header.
  - Confirm server returns `401 Unauthorized`.
- [ ] **4.2 Non-Admin Token Protection**
  - Send an API request to `GET /api/admin/providers` using a valid renter Bearer token.
  - Confirm server returns `403 Forbidden`.
- [ ] **4.3 Header Spoofing Resistance**
  - Send a request including header `x-user-email: service@myangan.com` without a valid admin session token.
  - Confirm server rejects request with `401 Unauthorized`.

---

## 5. Acceptance Decision

- [ ] **MANUAL VERIFICATION COMPLETED BY PROJECT OWNER**

*Sign-off Date*: ________________________  
*Verified By*: ________________________  
