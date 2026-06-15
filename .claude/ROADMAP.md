# LTI Toolkit Roadmap

Outstanding work items discovered during the 1.1 audit. Each entry includes the relevant source location, the current behavior, and implementation notes.

---

## 1. AGS grade post: configurable activity and grading progress

**File:** `src/lib/lti13.js` — `postAGSGrade()`

**Current behavior:** `activityProgress` and `gradingProgress` are hardcoded to `"Submitted"` and `"FullyGraded"` for every grade post.

**Why it matters:** The LTI 1.3 AGS spec defines multiple valid values for each field. Some tools distinguish between a submission that is still being graded (`gradingProgress: "Pending"`) versus one that is complete, or between an in-progress attempt (`activityProgress: "InProgress"`) versus a final submission. Hardcoding prevents tools that do multi-attempt or async grading from expressing the correct state.

**Implementation suggestion:** Add optional `activityProgress` and `gradingProgress` parameters to `postAGSGrade()` (and by extension to `LTIProviderController.postGrade()`), defaulting to the current values so existing callers are unaffected. Validate the values against the spec-defined enumerations before sending:
- `activityProgress`: `"Initialized"`, `"Started"`, `"InProgress"`, `"Submitted"`, `"Completed"`
- `gradingProgress`: `"FullyGraded"`, `"Pending"`, `"PendingManual"`, `"Failed"`, `"NotReady"`

---

## 2. AGS endpoint claim: include `lineitems` URL

**File:** `src/lib/lti13.js` — `buildLaunchJWT()`

**Current behavior:** The `lineitems` collection URL is commented out in the AGS endpoint claim. Only the specific `lineitem` URL is included.

**Why it matters:** The `lineitems` URL allows a tool to enumerate and manage all line items for a context (course), not just the one linked to the current launch. This is required by tools that need to create or list grade columns dynamically. The spec includes it in the endpoint claim when the platform supports it.

**Implementation suggestion:** Uncomment and wire up the `lineitems` URL pointing to a new route (e.g., `/lti/consumer/ags/:context_key/line_items`). That route would need a handler that at minimum returns the single line item for the context in the correct `application/vnd.ims.lis.v2.lineitemcontainer+json` format. This is a larger change that also requires a new route and controller method.

---

## 3. LTI 1.0 Basic Outcomes: support `readResult` and `deleteResult`

**File:** `src/controllers/lti-lms.js` — `basicOutcomesHandler()`

**Current behavior:** Only `replaceResultRequest` is handled. Any other operation (`readResultRequest`, `deleteResultRequest`) returns an `"unsupported"` response.

**Why it matters:** Some LMS platforms or tool providers may call `readResult` to check a previously submitted grade, or `deleteResult` to clear one. Without these, grade synchronization in both directions is incomplete.

**Implementation suggestion:** Add `readResultRequest` and `deleteResultRequest` cases in `basicOutcomesHandler()`, parallel to the existing `replaceResultRequest` branch. Each will need a corresponding handler method and a callback into the consuming application (similar to `postProviderGrade`) so the host app can look up or clear the grade in its own data store. Add `consumer.readProviderGrade` and `consumer.deleteProviderGrade` as optional config functions, and document them alongside `postProviderGrade`.

---

## 4. Token endpoint: expand supported scopes

**File:** `src/controllers/lti-lms.js` — `getOpenIDConfiguration()`  
**File:** `src/lib/lti13.js` — `validateTokenRequest()`

**Current behavior:** `scopes_supported` in the OpenID configuration only advertises `openid` and the AGS score scope. `validateTokenRequest` only grants the score scope.

**Why it matters:** The LTI 1.3 AGS spec defines additional scopes: `lineitem` (for creating/managing grade columns) and `result.readonly` (for reading results). Tools that need to manage line items would request `lineitem` scope but the platform currently rejects it.

**Implementation suggestion:** Extend `allowedScopes` in `validateTokenRequest()` and `scopes_supported` in `getOpenIDConfiguration()` as new scopes are implemented. Keep the allowlist approach introduced in the 1.1 security fix — only add a scope to the list once the corresponding endpoint is implemented and protected by that scope check.

---

## 5. Dynamic registration response: filter to spec-required fields

**File:** `src/controllers/lti-lms.js` — `dynamicRegistrationHandler()`

**Current behavior:** The registration response echoes back the entire request body (with `client_id` and `deployment_id` added). Any fields sent by the registering tool that are not part of the spec are passed back verbatim.

**Why it matters:** The OpenID Connect Dynamic Client Registration spec defines a specific set of fields that should appear in the response. Returning unrecognized fields could confuse some LMS implementations, and it mirrors user-controlled data directly back, which is a minor hygiene concern.

**Implementation suggestion:** Build the response explicitly from the fields the platform recognizes and stores, rather than mutating and returning the request body. The response should include at minimum: `client_id`, `deployment_id`, `client_name`, `jwks_uri`, `initiate_login_uri`, `redirect_uris`, `token_endpoint_auth_method`, `scope`, and the `lti-tool-configuration` claim. Fields not present in the stored provider record should be omitted.

---

## 6. OAuth 1.0 signature base URI: reverse proxy support

**File:** `src/lib/lti10.js` — `oauth_sign()`

**Current behavior:** The OAuth signature base URI is always constructed from `this.#domain_name` (the configured domain). This is correct when the app is accessed directly, but wrong when running behind a reverse proxy where the internal URL differs from the public URL.

**Why it matters:** OAuth 1.0 signatures include the exact request URL. If a reverse proxy rewrites the host or scheme (e.g., the app sees `http://internal-host` but the LMS signed against `https://public.example.com`), signature validation will fail because the base strings won't match.

**Implementation suggestion:** When validating incoming signatures (tool consumer → this app as provider), use the `Host` request header and the `X-Forwarded-Proto` header (or `req.protocol`) to reconstruct the public-facing URL, rather than relying solely on `domain_name`. Guard this behind a config option (e.g., `trust_proxy: true`) so operators who are not behind a proxy are not affected, consistent with how Express's `trust proxy` setting works.
