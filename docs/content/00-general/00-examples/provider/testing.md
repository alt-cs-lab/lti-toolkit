---
title: "Provider Testing Plan"
pre: "A2. "
weight: 11
hidden: true
---

This is a manual browser-based testing checklist for the Tool Provider example application (`/examples/provider`). Work through each section in order; later sections depend on state set up by earlier ones.

The provider can be tested in two configurations:

- **Against Canvas LMS** — use a real Canvas instance as the LTI Tool Consumer
- **Against the Tool Consumer example** — use the companion Consumer example app as the LTI Tool Consumer

Both configurations are covered below. A fresh provider app (empty database) is assumed at the start.

---

## Prerequisites

Before running any tests, confirm the following:

- [ ] Provider app is running and accessible at its configured `DOMAIN_NAME`
- [ ] `.env` is populated: `DOMAIN_NAME`, `LTI_CONSUMER_KEY`, `LTI_CONSUMER_SECRET`, `LTI_13_LMS_DOMAIN`, `SESSION_SECRET`, `ENCRYPTION_KEY`
- [ ] Visiting `/` shows the home page with the LTI 1.0 key, secret, XML URL, and launch URL

---

## Section 1 — Home Page

- [ ] `/` loads without error
- [ ] LTI 1.0 key and secret are displayed
- [ ] XML configuration URL (`/lti/provider/config.xml`) is shown
- [ ] Launch URL (`/lti/provider/launch`) is shown
- [ ] Link to the admin page is present

---

## Section 2 — Admin Page

- [ ] `/admin` loads and shows "Available LTI Tool Consumers" (empty list on first run)
- [ ] LTI 1.3 dynamic registration URL (`/lti/provider/register`) is shown
- [ ] Manual configuration fields (Client ID, Platform ID, Deployment ID, Keyset URL, Token URL, Auth URL) are present with default Canvas values pre-filled

---

## Section 3 — LTI 1.3 Consumer Setup (Provider Admin)

This section configures the Canvas-side consumer record in the provider's database. Skip if testing LTI 1.0 only.

### 3A — Create consumer record via Admin page

- [ ] On `/admin`, click an existing consumer (if one was auto-created) or follow the steps shown to register the tool in Canvas first
- [ ] After Canvas registration, fill in Client ID, Platform ID, Deployment ID, Keyset URL, Token URL, and Auth URL on `/admin`
- [ ] Submit the form — page reloads with a success message
- [ ] Consumer appears in the "Available LTI Tool Consumers" list

### 3B — View consumer detail

- [ ] Click the consumer name in the list — `/consumer/:id` loads
- [ ] Name, Key, masked Secret, and all LTI 1.3 fields are shown
- [ ] "Reveal full secret" disclosure works and shows the full secret
- [ ] Debugging section at the bottom can be expanded and shows the consumer JSON

---

## Section 4 — Consumer Management (CRUD)

### 4A — Update consumer configuration

- [ ] On `/consumer/:id`, fill in the LTI 1.3 configuration form (change at least one field)
- [ ] Submit — page reloads with a success message and the updated values are shown

### 4B — Rotate credentials

- [ ] Click "Rotate Credentials" — page reloads showing new key and secret values
- [ ] Old key/secret no longer match; new ones are shown in the settings section
- [ ] Confirm dialog is **not** shown (this form has no confirmation prompt)

### 4C — Delete consumer

- [ ] Click "Delete Consumer" — a browser confirm dialog appears
- [ ] Click Cancel — consumer is not deleted, page stays
- [ ] Click "Delete Consumer" again, then OK — redirected to `/admin`
- [ ] Consumer no longer appears in the list on `/admin`

---

## Section 5 — LTI 1.0 Launch (Canvas)

Requires a Canvas LTI 1.0 external tool assignment. Use the key/secret from `/`.

- [ ] In Canvas, configure an LTI 1.0 external tool using the key, secret, and launch URL
- [ ] As a **student**, click the assignment — provider redirects to `/student`
  - [ ] Student name and email are shown (if privacy level is "Public")
  - [ ] Course name and assignment name are shown
  - [ ] Grade submission form is present
- [ ] As an **instructor**, open the same assignment — provider redirects to `/instructor`
  - [ ] Instructor name and email are shown
  - [ ] Course and assignment sections are shown
  - [ ] "Read Grade from LMS" and "Delete Grade from LMS" buttons appear (LTI 1.0 only)
  - [ ] Debugging section can be expanded

---

## Section 6 — LTI 1.0 Grade Passback (Canvas)

Requires at least one student launch from Section 5.

### 6A — Student submits a grade

- [ ] As a student on `/student`, enter a grade between 0.00 and 1.00
- [ ] Submit — page reloads with a success message
- [ ] Grade appears in the Canvas gradebook for that student

### 6B — Instructor reads and modifies grades

- [ ] As instructor on `/instructor`, find the student row
- [ ] Enter a new grade value and click Submit — success message shown, Canvas gradebook updates
- [ ] Click "Read Grade from LMS" — the current score from Canvas is shown as a message
- [ ] Click "Delete Grade from LMS" — success message shown, grade is removed from Canvas gradebook

---

## Section 7 — LTI 1.3 Dynamic Registration (Canvas)

- [ ] In Canvas Admin → Developer Keys, add a new LTI Registration using the registration URL shown on `/admin` (`/lti/provider/register`)
- [ ] Canvas completes registration; click "Enable and Close"
- [ ] A new consumer record appears automatically in the `/admin` consumer list
- [ ] Click the consumer to verify Client ID, Platform ID, Deployment ID, Keyset URL, Token URL, and Auth URL are all populated

---

## Section 8 — LTI 1.3 Manual Registration (Canvas)

If dynamic registration is not available, configure manually via Canvas Developer Keys → New LTI Key.

- [ ] In Canvas, create a new LTI Key with:
  - Redirect URI: `DOMAIN/lti/provider/launch`
  - Target Link URI: `DOMAIN/lti/provider/launch`
  - OIDC Initiation URL: `DOMAIN/lti/provider/login`
  - JWK URL: `DOMAIN/lti/provider/jwks`
  - LTI Advantage: "Create and update submission results" enabled
- [ ] Note the Client ID and Deployment ID from Canvas
- [ ] On `/admin`, enter all values in the manual configuration form and submit
- [ ] Consumer appears in the list; click it to verify all fields

---

## Section 9 — LTI 1.3 Launch (Canvas)

Requires consumer record from Section 7 or 8 and a Canvas LTI 1.3 assignment.

- [ ] In Canvas, create an assignment using the LTI 1.3 external tool and set the launch URL to `DOMAIN/lti/provider/launch`
- [ ] As a **student**, click the assignment — provider redirects to `/student`
  - [ ] Student name and email are shown
  - [ ] Course name and assignment name are shown
  - [ ] Activity Progress and Grading Progress dropdowns appear (LTI 1.3 only)
  - [ ] Debugging section shows `launch_type: "lti1.3"`
- [ ] As an **instructor**, open the same assignment — provider redirects to `/instructor`
  - [ ] "LTI 1.3 Assignment and Grade Services (AGS)" section appears
  - [ ] Line Item info (label and score maximum) is shown
  - [ ] Results table is shown (empty until a student submits)
  - [ ] "All Line Items in Course" table shows all assignments in the course
  - [ ] Activity Progress and Grading Progress selectors appear in grade form

---

## Section 10 — LTI 1.3 Grade Passback (Canvas)

### 10A — Student submits a grade

- [ ] As a student on `/student`, select activity/grading progress values and enter a grade (0.00–1.00)
- [ ] Submit — success message shown; Canvas gradebook updates

### 10B — Instructor reviews and re-grades

- [ ] As instructor on `/instructor`, the Results table now shows the student's submission
- [ ] Enter a new grade for the student and submit — success message shown; Canvas gradebook updates

---

## Section 11 — LTI 1.3 Deep Linking (Canvas)

Requires LTI 1.3 consumer with Deep Linking scope enabled in Canvas.

- [ ] In Canvas, initiate a Deep Link assignment (add a module item using the LTI tool's "Find" option, or use the Rich Content Editor)
- [ ] Provider redirects to `/deeplink`
  - [ ] User name and course name are shown
  - [ ] "Create a New Assignment" form with Title and ID fields is present
  - [ ] Debugging section shows Deep Link launch data
- [ ] Enter a title and ID, then click Submit
- [ ] Canvas receives the deep link response and the content item appears in the module/editor

---

## Section 12 — Testing Against the Tool Consumer Example

The following tests use the companion Consumer example (`/examples/consumer`) as the LTI Tool Consumer instead of Canvas. Both apps must be running.

### 12A — LTI 1.0 launch from Consumer

- [ ] In the Consumer app, add the Provider as an LTI 1.0 tool (manually or via XML)
- [ ] On the Consumer's provider detail page, fill in context, resource, and user fields
- [ ] Leave "Instructor?" unchecked; click Submit — new tab opens on provider's `/student` view
  - [ ] Course name, assignment name, and user name/email are shown
  - [ ] `launch_type` in debugging is `"lti1.0"`
- [ ] Repeat with "Instructor?" checked — `/instructor` view loads
  - [ ] "Read Grade" and "Delete Grade" buttons are visible (LTI 1.0 only)

### 12B — LTI 1.0 grade passback to Consumer

- [ ] As a student in the provider, submit a grade
- [ ] In the Consumer app, open `/grades`
- [ ] The grade appears under the correct course, assignment, and user

### 12C — LTI 1.3 launch from Consumer

- [ ] In the Consumer app, add the Provider as an LTI 1.3 tool (or use Dynamic Registration)
- [ ] On the Consumer's provider detail page, fill in context, resource, and user fields
- [ ] Click Submit — new tab opens on provider's `/student` view
  - [ ] Activity Progress and Grading Progress dropdowns appear
  - [ ] `launch_type` in debugging is `"lti1.3"`
- [ ] Repeat with "Instructor?" checked — `/instructor` view loads
  - [ ] AGS section appears (line item, results, all line items)

### 12D — LTI 1.3 grade passback to Consumer

- [ ] As a student in the provider, submit a grade with progress values
- [ ] In the Consumer app, open `/grades`
- [ ] Grade appears with score, activity progress, grading progress, and timestamp

### 12E — LTI 1.3 Deep Link from Consumer

- [ ] On the Consumer's provider detail page, fill in the Deep Link context and user fields
- [ ] Click "Launch Deep Link" — provider's `/deeplink` view opens
- [ ] Enter a title and ID; click Submit
- [ ] Consumer redirects to `/deeplink-result` (or the configured redirect) and shows the returned content items
