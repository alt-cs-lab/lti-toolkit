---
title: "Consumer Testing Plan"
pre: "B2. "
weight: 17
hidden: true
---

This is a manual browser-based testing checklist for the Tool Consumer example application (`/examples/consumer`). It covers every user-facing feature accessible through the browser.

The Consumer example is tested **against the Tool Provider example** (`/examples/provider`). Both apps must be running and mutually reachable before starting.

A fresh consumer app (empty provider database) is assumed at the start.

---

## Prerequisites

- [ ] Consumer app is running at its configured `DOMAIN_NAME`
- [ ] Provider app is running at its own `DOMAIN_NAME`
- [ ] `.env` for the consumer is populated: `DOMAIN_NAME`, `SESSION_SECRET`, `ENCRYPTION_KEY`
- [ ] Visiting `/` shows the home page with an empty provider list and the three "Add Provider" forms

---

## Section 1 — Home Page

- [ ] `/` loads without error
- [ ] "LTI Tool Providers" list is empty on first run
- [ ] "Add LTI 1.3 Tool Provider via Dynamic Registration" form is present with a URL input
- [ ] "Add LTI 1.0 Tool Provider via XML" form is present with URL, XML, key, and secret fields
- [ ] "Manually Add LTI Tool Provider" form is present with all LTI 1.0 and LTI 1.3 fields
- [ ] Link to `/grades` (gradebook) is shown

---

## Section 2 — Add Provider — Manual LTI 1.0

- [ ] On `/`, fill in the "Manually Add" form with:
  - Name: `Test LTI 1.0 Provider`
  - Launch URL: `PROVIDER_DOMAIN/lti/provider/launch`
  - Domain: provider domain (no protocol)
  - Key: value from Provider's home page
  - Secret: value from Provider's home page
  - Leave "LTI 1.3 Enabled" unchecked
- [ ] Submit — home page reloads with a success message
- [ ] Provider appears in the "LTI Tool Providers" list

---

## Section 3 — Add Provider — LTI 1.0 via XML

- [ ] On `/`, use the "Add LTI 1.0 Tool Provider via XML" form with:
  - URL: `PROVIDER_DOMAIN/lti/provider/config.xml`
  - Key and Secret: values from Provider's home page
- [ ] Submit — home page reloads with the new provider in the list (name taken from the XML title)
- [ ] Alternatively, paste the raw XML content directly into the XML textarea and submit — same result

---

## Section 4 — Add Provider — LTI 1.3 Dynamic Registration

- [ ] On `/`, enter `PROVIDER_DOMAIN/lti/provider/register` in the Dynamic Registration URL field
- [ ] Submit — the provider app processes the registration
- [ ] Home page reloads with the new LTI 1.3 provider in the list
- [ ] Click the provider to verify `LTI 1.3` is shown as true and Client ID and Deployment ID are populated

---

## Section 5 — Add Provider — Manual LTI 1.3

- [ ] On `/`, fill in the "Manually Add" form with LTI 1.3 fields enabled:
  - Name: `Test LTI 1.3 Provider`
  - Launch URL: `PROVIDER_DOMAIN/lti/provider/launch`
  - Domain: provider domain
  - Key and Secret: any values (used for LTI 1.0 fallback; generated if blank)
  - Check "LTI 1.3 Enabled"
  - JWKS URL: `PROVIDER_DOMAIN/lti/provider/jwks`
  - Auth URL: `PROVIDER_DOMAIN/lti/provider/login`
  - Redirect URLs: `PROVIDER_DOMAIN/lti/provider/launch`
- [ ] Submit — provider appears in the list with `lti13: true`

---

## Section 6 — Provider Detail Page

- [ ] Click any provider in the list — `/provider/:id` loads
- [ ] Name, Launch URL, Key, masked Secret, Custom, LTI 1.3 flag, Client ID, and Deployment ID are shown
- [ ] "Reveal full secret" disclosure works and shows the full secret
- [ ] Launch configuration form (context, resource, user, instructor flag, gradebook key) is present
- [ ] For an LTI 1.3 provider: "Deep Link Request" section is visible
- [ ] "Edit Provider" form is present with current values pre-filled
- [ ] "Rotate Secret / Key Pair" form is present
- [ ] "Delete Provider" form is present
- [ ] Debugging section at the bottom can be expanded and shows provider JSON

---

## Section 7 — LTI 1.0 Launch

Requires the LTI 1.0 provider from Section 2 or 3.

- [ ] On the provider detail page, fill in context, resource, and user fields (defaults are fine)
- [ ] Leave "Instructor?" unchecked; click Submit — a **new tab** opens on the provider's student view
  - [ ] Student user name and email match the values entered in the form
  - [ ] Course name and label match the context fields
  - [ ] Assignment name matches the resource name
  - [ ] `launch_type` in the debugging section is `"lti1.0"`
- [ ] Repeat with "Instructor?" checked — `/instructor` view loads in the provider
  - [ ] "Read Grade from LMS" and "Delete Grade from LMS" buttons appear
  - [ ] No "LTI 1.3 AGS" section appears

---

## Section 8 — LTI 1.0 Grade Passback

Requires a student launch from Section 7.

### 8A — Student submits a grade

- [ ] In the provider's student view, enter a grade (0.00–1.00) and submit
- [ ] Success message appears in the provider app
- [ ] In the consumer app, open `/grades`
- [ ] The grade is listed under the correct course, assignment, and user with score, activity progress, grading progress, and timestamp

### 8B — Instructor updates a grade

- [ ] In the consumer app, re-launch the same provider as instructor
- [ ] In the provider's instructor view, update the student's grade to a new value
- [ ] In the consumer app, open `/grades` — grade is updated

---

## Section 9 — LTI 1.3 Launch

Requires the LTI 1.3 provider from Section 4 or 5 with a matching consumer record configured in the provider app. See the Provider testing plan Section 3 for how to configure the consumer record on the provider side.

- [ ] On the LTI 1.3 provider detail page, fill in context, resource, and user fields
- [ ] Leave "Instructor?" unchecked; click Submit — a **new tab** opens on the provider's student view
  - [ ] `launch_type` in debugging is `"lti1.3"`
  - [ ] Activity Progress and Grading Progress dropdowns appear
- [ ] Repeat with "Instructor?" checked — `/instructor` view loads in the provider
  - [ ] "LTI 1.3 Assignment and Grade Services (AGS)" section appears
  - [ ] Line Item info (label and score maximum) is displayed
  - [ ] Results table is shown (empty until a student submits)
  - [ ] "All Line Items in Course" table lists all assignments for the context key

---

## Section 10 — LTI 1.3 Grade Passback

Requires an LTI 1.3 student launch from Section 9.

- [ ] In the provider's student view, select progress values and enter a grade; submit
- [ ] Success message appears in the provider app
- [ ] In the consumer app, open `/grades`
- [ ] Grade appears with `scoreGiven`, `scoreMaximum`, `activityProgress`, `gradingProgress`, and `timestamp`

---

## Section 11 — LTI 1.3 Deep Linking

Requires an LTI 1.3 provider (Section 4 or 5) and a matching LTI 1.3 consumer record in the provider app.

- [ ] On the LTI 1.3 provider detail page, scroll to "Deep Link Request"
- [ ] Fill in context and user fields; click "Launch Deep Link"
- [ ] Provider's `/deeplink` view opens (in the same tab)
  - [ ] User name and course info are shown
  - [ ] "Create a New Assignment" form with Title and ID fields is present
  - [ ] Deep Link launch data is visible in the debugging section
- [ ] Enter a title (e.g. `Test Assignment`) and an ID (e.g. `assign001`); click Submit
- [ ] Browser is redirected to `/deeplink-result` on the **consumer** app
  - [ ] The page shows the returned content items (title and URL/ID returned by the provider)

---

## Section 12 — Provider Management

### 12A — Edit provider

- [ ] On `/provider/:id`, change the name in the "Edit Provider" form and submit
- [ ] Page reloads with a success message and the updated name is shown
- [ ] The updated name appears in the provider list on the home page

### 12B — Rotate credentials

- [ ] On `/provider/:id`, click "Rotate Credentials"
- [ ] Page reloads; new Key and Secret are shown (different from the previous values)
- [ ] Note: after rotating credentials on an LTI 1.0 provider, any new launches from the consumer must use the new key/secret. Re-launch to confirm the new credentials work.

### 12C — Delete provider

- [ ] On `/provider/:id`, click "Delete Provider" — a browser confirm dialog appears
- [ ] Click Cancel — provider is not deleted, page stays
- [ ] Click "Delete Provider" again, then OK — redirected to `/` (home page)
- [ ] Provider no longer appears in the list on the home page

---

## Section 13 — Gradebook

- [ ] Navigate to `/grades`
- [ ] All grade submissions received so far appear, grouped by course, assignment, and user
- [ ] Each grade entry shows: score given, score maximum, activity progress, grading progress, timestamp, and user ID
- [ ] An empty gradebook shows "No courses found!"
- [ ] After fresh grade submissions (from any test above), refresh the page and confirm new entries appear
