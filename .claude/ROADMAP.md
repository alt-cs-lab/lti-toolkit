# LTI Toolkit Roadmap

Outstanding work items discovered during the 1.1 audit. Each entry includes the relevant source location, the current behavior, and implementation notes.

---

## 1. AGS grade post: configurable activity and grading progress ✅ DONE (v1.1)

`postAGSGrade()` and `LTIProviderController.postGrade()` now accept optional `activityProgress`/`gradingProgress` parameters, validated against the spec-defined enumerations and defaulting to `"Submitted"`/`"FullyGraded"`. Covered by tests, the provider example (`student-grade.js`/`instructor-grade.js`), and documented in `docs/content/_index.md`.

---

## 2. AGS endpoint claim: include `lineitems` URL ✅ DONE (v1.1)

The AGS endpoint claim now includes the `lineitems` collection URL alongside `lineitem`. A new route/controller (`agsGetLineItemsHandler` in `src/controllers/lti-lms.js`, wired in `src/routes/consumer.js`) returns the line items collection, and `LTI13Utils.getAGSLineItems()` supports fetching/filtering it. Covered by tests and documented in `docs/content/_index.md`.

---

## 3. LTI 1.0 Basic Outcomes: support `readResult` and `deleteResult` ✅ DONE (v1.1)

`basicOutcomesHandler()` now handles `readResultRequest` and `deleteResultRequest` in addition to `replaceResultRequest`, backed by new `readOutcome()`/`deleteOutcome()` methods in `lti10.js` and optional `readProviderGrade`/`deleteProviderGrade` consumer config callbacks. Covered by tests, wired up in the consumer example (`post-grade.js`), and documented in `docs/content/_index.md`.

---

## 4. Token endpoint: expand supported scopes ✅ DONE (v1.1)

`allowedScopes` and `scopes_supported` now include all three scopes this library implements:

- `https://purl.imsglobal.org/spec/lti-ags/scope/score`
- `https://purl.imsglobal.org/spec/lti-ags/scope/lineitem.readonly`
- `https://purl.imsglobal.org/spec/lti-ags/scope/result.readonly`

The `lineitem` write scope is intentionally omitted — this library does not implement line item create/update/delete endpoints.

---

## 5. Dynamic registration response: filter to spec-required fields ✅ DONE (v1.1)

`dynamicRegistrationHandler()` now builds the response explicitly from stored provider fields and recognized request fields. Unknown vendor-specific fields sent by the registering tool are silently dropped. `deployment_id` is included at the top level (Canvas compatibility) and inside `lti-tool-configuration` (per IMS LTI DR spec).

---

## 6. OAuth 1.0 signature base URI: reverse proxy support ✅ DONE (v1.1)

The signature base URI is built from `domain_name`, which must be set to the public-facing URL. If `domain_name` is correct, the computed signature will always match the LMS-signed URL regardless of reverse proxy configuration. The TODO comment in `oauth_sign()` has been removed and the `domain_name` config reference now explicitly states it must be the public-facing URL.

---

## 7. Secrets stored in plaintext ✅ DONE (v1.1)

`ConsumerKeySchema`/`ProviderKeySchema` now encrypt the `secret` and `private` fields at rest using AES-256-GCM (new `src/lib/encryption.js`), via Sequelize getter/setter accessors that transparently encrypt on write and decrypt on read. The schemas were converted to factory functions (`(encryptionKey) => ({...})`) so `src/models/models.js#configureModels()` can close over a runtime-supplied key. A new **required** `encryption_key` config option (64-character hex string / 32 bytes, e.g. `openssl rand -hex 32`) is validated in `index.js` and converted to a `Buffer` before being passed to `configureModels()`. This is a breaking change — no automatic migration of existing plaintext data, acceptable pre-1.1 release. Covered by new tests (`test/lib/encryption.js`, encryption round-trip tests in `test/models.js`, config validation tests in `test/index.js`); both example apps' configs and `.env.example` files were updated; documented in `docs/content/_index.md` (feature list and config reference). `npm run cov` confirms 469 passing tests with 100% coverage.

---

## 8. LTI 1.3 launch: deployment_id not validated ✅ DONE (v1.1)

`authRequest()` now stores the matched consumer's `deployment_id` on the `ConsumerLogin` record (schema + initial migration updated; this is a breaking schema change, acceptable since there are no production deployments yet). `launchRequest()` compares the launch JWT's `deployment_id` claim against that stored value after JWT verification and rejects the launch if it's missing or doesn't match, alongside the existing `message_type`/`version` checks. Covered by new tests in `test/lib/lti13.js`; `test/models.js` fixtures updated for the new required column.

---

## 9. OAuth 1.0 nonces are never pruned ✅ DONE (already implemented)

This was already handled before this audit: `clearExpired()` in `src/models/models.js` destroys `OauthNonce` records older than 15 minutes, running on a 5-minute interval via `initializeExpiration()`. Since the OAuth 1.0 timestamp validation window in `lti10.js` is +60s/-600s (10 minutes), the 15-minute prune window comfortably covers it. No further work needed; the audit simply missed this existing mechanism.

---

## 10. Controller accessor path is redundant (`lti.controllers.lti.provider`) ✅ DONE (v1.1)

The `controllers` object is now flat: `controllers.provider` / `controllers.consumer` are the LTI protocol controllers (renamed from the old nested `controllers.lti.provider` / `controllers.lti.consumer`), and the CRUD registry controllers were renamed to `controllers.providerRegistry` / `controllers.consumerRegistry` (previously `controllers.provider` / `controllers.consumer`, which collided in name with the protocol controllers). This is a breaking change, acceptable pre-1.1 release. Updated in `index.js`, `test/index.js`, both example apps (`examples/consumer/src/routes/*.js`, `examples/provider/src/routes/*.js`), and the docs (`docs/content/_index.md` Usage section, both example walkthroughs). `npm run cov` confirms 458 passing tests with 100% coverage.

---

## 11. Callback contracts aren't formally typed or documented ✅ DONE (v1.1)

Implemented both complementary options from the original suggestion. A new `src/lib/callback-validation.js` module exports a small assertion function per callback return-shape family (`assertGradeResult`, `assertScoreResult`, `assertLineItem`, `assertLineItems`, `assertResults`, `assertRedirectUrl`), each throwing a descriptive `"Invalid <callback> return value: expected ..."` error when a required field is missing or the wrong type. These are called immediately after every callback invocation in `src/controllers/lti-lms.js` (`postProviderGrade`, `readProviderGrade`, `deleteProviderGrade`, `getProviderLineItem`, `getProviderLineItems`, `getProviderResults`) and `src/controllers/lti-launch.js` (`handleLaunch`, `handleDeeplink`), covering all 8 user-provided callbacks. `null`/`undefined` is still accepted where the docs explicitly allow it (e.g. "no grade on file"); display-only fields (`message`, `comment`) are left unchecked. A hand-written `index.d.ts` was added at the repo root (referenced via the new `"types"` field in `package.json`) with type declarations for the full config object and all 8 callback signatures, manually kept in sync with the JSDoc in `index.js` — no new dependencies or build step. Covered by new tests in `test/lib/callback-validation.js` plus negative tests at each controller call site in `test/controllers/lti-lms.js`/`test/controllers/lti-launch.js`; documented per-callback in `docs/content/_index.md`. Both example apps verified to boot and initialize successfully unchanged, since their callbacks already conform to the documented shapes. `npm run cov` confirms 500 passing tests with 100% coverage.

---

## 12. `use_section` provider config option is undocumented ✅ DONE (v1.1)

Investigation found `use_section` is a per-record field on the `Provider` model (set via the Provider Registry CRUD `createProvider`/`updateProvider` data, not a static `LtiToolkit()` init config option), and it has no effect within the library itself — it's a passthrough flag for host applications to use for their own logic. It was already partially documented (database schema doc, consumer example walkthrough) but with vague/inconsistent wording. Confirmed with the project owner that the original intent (likely an attempt-masking/grade-merging scheme for assignment retries, achievable today via the existing opaque `user.key`/`gradebook_key` launch parameters without any library changes) isn't being implemented right now — the field stays as-is for future use. Reworded the description consistently in all three places it's referenced: the `@swagger` JSDoc in `src/models/schemas.js`, `docs/content/00-general/01-database/index.md`, and `docs/content/00-general/00-examples/consumer/index.md`, now reading "flag to differentiate between LTI Tool Providers that may need different handling... available for applications built on this library to use as needed." No `src/` logic changes; `npm run cov` confirms 500 passing tests with 100% coverage maintained.

---

## 13. `redirect_urls` storage uses the wrong field name from the spec ✅ DONE (v1.1)

`dynamicRegistrationHandler()` now reads `body.redirect_uris` (the correct IMS LTI Dynamic Registration / OIDC spec field) when building the stored provider data, instead of the nonexistent `body.redirect_urls`. The stored model field name (`redirect_urls`) is unchanged — only the source read was wrong. Updated the existing regression test in `test/controllers/lti-lms.js` (previously named after the bug, sending `body.redirect_urls`) to send `body.redirect_uris` and assert it's correctly persisted. `npm run cov` confirms 500 passing tests with 100% coverage maintained.

---

## 14. Database support is SQLite-only ✅ DONE (v1.1)

Investigation found the real goal behind this item was for a host application to share a single Sequelize instance with this library (so the host's own models can form direct relationships with this library's models, e.g. `Course.belongsTo(lti.models.Consumer)`) — not specifically new `db_dialect`/host/port/credential config knobs. That sharing already worked: `validateDatabaseConfig()` only checks `database instanceof Sequelize`, and there was no dialect-specific code anywhere in `src/` except the hardcoded SQLite dialect used by the library's own internal convenience-default path (`db_storage`).

Verifying this with a real non-SQLite dialect (via `pg-mem`, a pure-JS Postgres-compatible engine used as a new devDependency, injected into Sequelize via `dialectModule` — no real Postgres server or Docker required) surfaced a real, previously-latent bug: `secret`/`public`/`private` on `ConsumerKeySchema`/`ProviderKeySchema`, and `custom`/`redirect_urls`/`scopes`/`claims` on `ProviderSchema`, were typed `Sequelize.STRING` (`VARCHAR(255)`). PEM-encoded RSA keys and AES-256-GCM-encrypted values (added in item 7) exceed 255 characters; SQLite never enforces `VARCHAR` length limits, so this worked by accident there but would hard-fail on Postgres (and likely MySQL in strict mode). Fixed by changing all of these fields to `Sequelize.TEXT` directly in `src/models/schemas.js` and the initial migrations (`src/migrations/00_consumers.js`/`00_providers.js`) — a breaking schema change, acceptable pre-1.1 per the precedent set by items 7/8/10.

Added a new test in `test/index.js` (`"should support a non-SQLite dialect (Postgres) via a custom Sequelize instance"`) that runs this library's real migrations and a full Consumer+key create/read round-trip against `pg-mem`, including asserting the previously-overflowing `private` field round-trips correctly at >255 characters. Documented the dialect-flexibility, cross-model-relationship, and migration-sequencing patterns in a new "Sharing a Database" section in `docs/content/_index.md`. No new `db_dialect`-style config knobs were added — bringing your own `Sequelize` instance via `config.database` remains the supported path, since baking convenience config in would be in tension with the actual "host app owns and shares the instance" goal. `npm run cov` confirms 501 passing tests with 100% coverage maintained.

---

## 15. No JWKS caching for LTI 1.3 token requests ✅ DONE (v1.1)

The library already used `jwks-rsa`'s `JwksClient` (which has built-in caching) at both JWKS-verification call sites in `src/lib/lti13.js` (`launchRequest()` and `validateTokenRequest()`) — the bug was that a brand-new `JwksClient` was constructed on every single call, so its cache was created empty and discarded immediately after use. Fixed by adding a new `src/lib/jwks-cache.js` module exporting `getJwksClient(jwksUri)`, which reuses one cached `JwksClient` instance per JWKS URL (module-level `Map`, `cacheMaxAge` hardcoded to 10 minutes) instead of constructing a fresh one each time. Both call sites in `lti13.js` now use `getJwksClient()` instead of `new JwksClient()`.

Fixing this surfaced a real interaction with how `jwks-rsa` itself works internally: `JwksClient`'s constructor captures and memoizes `getSigningKey` as an own-instance property (via `lru-memoizer`) at construction time, shadowing the prototype. This meant existing tests that stub `JwksClient.prototype.getSigningKey` relied on a fresh instance being constructed _after_ the stub was installed each test — which broke once instances started being reused across tests sharing a JWKS URL fixture. Fixed by also exporting `clearJwksCache()` from the new module and calling it in `test/hooks.js`'s global `afterEach`, so every test starts with an empty cache (no changes needed to the ~15 existing per-test stub call sites). `clearJwksCache()` is also a legitimate production capability — a host app can force-invalidate the cache after a known key rotation rather than waiting out the TTL.

Covered by a new `test/lib/jwks-cache.js` (instance reuse per URL, distinct instances per distinct URL, cache clearing). No new config surface — TTL is hardcoded, not exposed, per the agreed scope. `npm run cov` confirms 505 passing tests with 100% coverage maintained.

---

## 16. Example apps default to in-memory SQLite ✅ DONE (v1.1)

Both `examples/provider/src/configs/lti.js` and `examples/consumer/src/configs/lti.js` now have an expanded comment above `db_storage: ":memory:"` explaining it's for demo/testing purposes only (all registered consumers/providers/keys are lost on every restart), with the file-based alternative (`db_storage: "./data/lti.sqlite"`) shown commented out alongside it. No behavior change; both example apps confirmed booting successfully afterward.

---

## 17. Single LTI 1.0 consumer setup wipes all consumers on every restart ✅ DONE (v1.1)

The `config.provider.key` / `config.provider.secret` shortcut and the destructive `bulkDelete` + `createConsumer` block it triggered were removed entirely from the library (`index.js`, `index.d.ts`, `validateProviderConfig()`). The feature was too footgun-prone to fix in-place: any repair (opt-in flag, wipe-guard) still left a destructive code path in the library with no clear benefit over explicit startup code.

The replacement pattern — call `consumerRegistry.getByKey(key)` then `createConsumer(...)` if absent, immediately after `await LTIToolkit()` resolves — is equally concise, fully idempotent across restarts, safe on both in-memory and persistent databases, and requires no special library support. The provider example (`examples/provider/src/configs/lti.js`) was updated to demonstrate this pattern, gated on `LTI_CONSUMER_KEY`/`LTI_CONSUMER_SECRET` env vars (comments in `.env`/`.env.example` updated to explain their new role). The `key` prop that was being passed (but never used) in the `admin.js` and `consumer-config.js` render calls was also removed. The corresponding tests (type-error tests for `provider.key`/`provider.secret` and the "single consumer" initialization test) were removed; the minimal config example and full config reference in `docs/content/_index.md`, and the `lti.js` snippet and warning notice in the provider walkthrough, were all updated. `npm run cov` confirms 502 passing tests with 100% coverage.

---

## 18. No authentication on admin/configuration routes in example apps ✅ DONE (v1.1)

A new `requireAdmin` middleware (`src/middlewares/require-admin.js`) was added to both example apps. It implements HTTP Basic Auth checked against the `ADMIN_PASSWORD` environment variable using `crypto.timingSafeEqual` to prevent timing attacks. It fails closed: if `ADMIN_PASSWORD` is not set, all requests are rejected with 401. Any username is accepted; only the password is checked. The middleware includes a comment explaining it is the bare minimum for a demo and that real applications should use a proper auth/SSO system.

Protected routes:

- **Provider** (`examples/provider`): `GET /admin`, `GET /consumer/:id`, `POST /consumer/:id/config`
- **Consumer** (`examples/consumer`): `POST /configure`, `POST /configure/xml`, `POST /configure/dynamic`, `GET /provider/:id`, `POST /provider/:id/launch`, `GET /grades`

The index page (`GET /`) remains unprotected in both apps — it only shows public LTI configuration URLs and no secrets. `ADMIN_PASSWORD` was added to both `.env` and `.env.example` files with an explanatory comment, and both example walkthrough docs (`docs/content/00-general/00-examples/provider/index.md` and `docs/content/00-general/00-examples/consumer/index.md`) were updated with the new env var and an expanded `app.js` snippet showing the middleware wiring and a note about the auth approach.

---

## 19. `bin/www` references an undefined `logger` variable ✅ DONE (v1.1)

The dead try/catch wrapping `server.listen(port)` was removed from both `examples/provider/bin/www` and `examples/consumer/bin/www`. The `server.on('error', onError)` handler already covers the realistic failure path; `server.listen()` does not throw synchronously in practice. The `startup()` function now simply calls `server.listen(port)` directly, with the "Server Startup Functions Here" comment retained.

---

## 20. Fragile unguarded data-store access in example grade-handling routes ✅ DONE (v1.1)

Only `examples/provider/src/routes/instructor-grade.js` had the actual bug — the other three sibling files the roadmap flagged as "likely affected" were already guarded: `instructor-read-grade.js` and `instructor-delete-grade.js` both use optional chaining (`courses[courseId]?.assignments[assignmentId]`) with a subsequent `if (!studentGrade)` check, and `student-grade.js` doesn't access the data store in its main handler path at all.

Fixed in `instructor-grade.js` by converting the flat `if/else` into `if (!courses[courseId]) { error = "..." } else if (isNaN(grade) ...) { ... } else { ... }`, moving `const assignments = courses[courseId].assignments` inside the innermost `else` block where it's safe. The friendly error message matches the style already used in the handler for invalid grade values.

---

## 21. Secrets rendered directly in admin HTML views ✅ DONE (v1.1)

Each route handler that renders the affected view now computes a `maskedSecret` field (`"••••••••" + secret.slice(-4)`) alongside the existing `secret` field on the data object passed to the template:

- `examples/provider/src/routes/consumer.js` → `examples/provider/src/views/consumer.njk`
- `examples/consumer/src/routes/provider.js` → `examples/consumer/src/views/provider.njk`
- `examples/consumer/src/routes/provider-launch.js` → also renders `provider.njk` on validation errors, so it received the same change

Both templates now display `maskedSecret` (e.g. `••••••••abcd`) by default, with the full `secret` tucked inside a no-JS `<details><summary>Reveal full secret</summary>...</details>` toggle. The debug `{{ * | dump(2) | safe }}` section was left as-is per the agreed scope. The `provider-launch.js` code snippet in `docs/content/00-general/00-examples/consumer/index.md` was updated to include the new `maskedSecret` line.

---

## 22. Fragile custom-parameter parsing via string concatenation ✅ DONE (v1.1)

`JSON.parse("{" + req.body.custom + "}")` replaced with `JSON.parse(req.body.custom)` in both `examples/consumer/src/routes/configure.js` and `examples/consumer/src/routes/provider-launch.js`. The form field now expects a complete JSON object (`{"key": "value"}`) rather than bare fragments. Form labels in `examples/consumer/src/views/index.njk` and `examples/consumer/src/views/provider.njk` were updated to show the correct example format. The corresponding code snippets and prose description in `docs/content/00-general/00-examples/consumer/index.md` were updated to match.

---

## 23. No global error-handling middleware in example apps ✅ DONE (v1.1)

A 4-argument error-handling middleware was added at the end of both `examples/provider/src/app.js` and `examples/consumer/src/app.js`. It calls `console.error(err)` to log the full error server-side, then renders a new `error.njk` template (added to both apps' `src/views/`) with a generic "An unexpected error occurred" message — no `err.message` or stack trace is exposed to the browser. A comment in the handler explains the 4-argument requirement and notes that a real application should extend it with proper logging and error reporting. Both example walkthrough docs were updated to include the error handler in the `app.js` snippet.

---

## 24. Dynamic registration: registration endpoint validated with `startsWith` instead of URL origin comparison ✅ DONE (v1.1)

Replaced `response.registration_endpoint.startsWith(response.issuer)` in `getLMSDetails()` with a URL origin comparison (`new URL(...).origin !== new URL(...).origin`). The string-prefix check would incorrectly accept a registration endpoint like `https://canvas.edu.attacker.com/register` when the issuer is `https://canvas.edu` because the endpoint string starts with the issuer string. Origin comparison checks only the scheme+host+port, rejecting mismatched domains regardless of path sharing. Covered by a new test in `test/lib/lti13.js` that crafts exactly this subdomain-prefix bypass case. `npm run cov` confirms 504 passing tests with 100% coverage.

---

## 25. LTI 1.0 XML config: custom parameter keys and values are not XML-escaped ✅ DONE (v1.1)

Added a small inline `escapeXml` helper in `getLTI10Config()` that replaces `&`, `<`, `>`, and `"` with their XML entity equivalents (in that order, so `&` is escaped before the others to avoid double-escaping). Applied to both the attribute `name` (key) and text content (value) in the custom parameter template literal. Without this, an implementer whose `custom_params` values contain `&` or `<` (common in URL values) would silently produce malformed XML, causing Canvas to reject the tool config with a cryptic XML parse error. Covered by a new test in `test/controllers/lti-register.js` asserting that all four special characters are correctly escaped in both key and value positions. `npm run cov` confirms 504 passing tests with 100% coverage.

---

## 26. LTI 1.3 launch: login state destroyed before deployment_id validation ✅ DONE (v1.1)

Moved `await loginState.destroy()` in `launchRequest()` from immediately after JWT signature verification to after all three LTI-layer claim checks (message_type, version, deployment_id). Previously, if the JWT verified correctly but the deployment_id didn't match (a misconfiguration), the login state was already gone and the user received an error page with no recovery path short of clicking the LTI launch link again. Now state is only destroyed once the full launch is validated. Replay protection is unaffected — nonce verification is handled by `jsonwebtoken.verify` before any of this, and deployment_id mismatch is a configuration error rather than a replay scenario. No test changes needed; existing deployment_id failure tests don't assert whether destroy was called. `npm run cov` confirms 504 passing tests with 100% coverage.

---

## 27. LTI 1.3 deep linking from the consumer (LMS) side ✅ DONE (v1.1)

The library now supports the full consumer-side deep linking flow: initiating an `LtiDeepLinkingRequest` via the OIDC round-trip and receiving/verifying the `LtiDeepLinkingResponse` from the provider.

**Implementation:**

1. **`generateLTI13DeepLinkFormData(key, client_id, deployment_id, url, ret_url, context, user, settings?)`** in `src/controllers/lti-consumer.js` — Creates a `ProviderDeepLink` record (new table `lti_provider_deep_links`) to persist the context token, then creates a `ProviderLogin` record with `message_type: "LtiDeepLinkingRequest"` so the auth handler knows to build a deep-link JWT. Returns the OIDC login form fields.

2. **`buildDeepLinkJWT(authRequest, consumer_config)`** in `src/lib/lti13.js` — Signs a JWT with `LtiDeepLinkingRequest` message type, the `LtiDeepLinkingSettings` claim (with `deep_link_return_url` pointing to `POST /lti/consumer/deeplink/:token`), and context/user claims. No `resource_link` or AGS endpoint claims.

3. **`authRequestHandler`** in `src/controllers/lti-lms.js` — Branches on `loginState.data.message_type === "LtiDeepLinkingRequest"` to call `buildDeepLinkJWT` instead of `buildLaunchJWT`.

4. **`verifyDeepLinkResponse(req)`** in `src/lib/lti13.js` — Reads token from `req.params.token`, looks up the `ProviderDeepLink` record, fetches the provider's JWKS, verifies the JWT, extracts `content_items`, destroys the record, and returns `{ content_items, context }`.

5. **`deepLinkResponseHandler(req, res)`** in `src/controllers/lti-lms.js` — Calls `verifyDeepLinkResponse`, then the `consumer.handleDeeplink(content_items, context)` callback (validated by `assertRedirectUrl`), and redirects.

6. **`POST /lti/consumer/deeplink/:token`** in `src/routes/consumer.js` — Wires the response handler into the consumer router.

7. **`consumer.handleDeeplink?`** in `index.js`/`index.d.ts` — New optional consumer config field; defaults to `null` if absent; throws clearly if the route is hit without it configured.

8. **New `ProviderDeepLink` model and migration** in `src/models/` and `src/migrations/00_providers.js` — Table `lti_provider_deep_links` with `token` PK, `provider_key`, `context` JSON, and 15-minute expiration.

9. **Consumer example** — `src/routes/deeplink.js` (initiates deep link launch), `src/routes/deeplink-result.js` (handles callback and renders result), `src/views/deeplink-result.njk`, "Launch as Deep Link" form added to `src/views/provider.njk` (LTI 1.3 only), `handleDeeplink` registered in `src/configs/lti.js`, routes wired in `src/app.js`.

10. **Tests** — 530 tests passing, 100% coverage maintained across all files.

---

## 28. Provider example does not demonstrate `getLineItems` (AGS line items collection query) ✅ DONE (v1.1)

`lti.controllers.provider.getLineItems(consumer.key, launchData.outcome_lineitems)` is now called in `examples/provider/src/routes/instructor.js` alongside the existing `getLineItem`/`getResults` calls. The `outcome_lineitems` URL (from the AGS endpoint claim) is already stored in the launch session. A new "All Line Items in Course" table in `examples/provider/src/views/instructor.njk` renders the full collection (label, scoreMaximum, resourceKey, gradebookKey). No library or test changes needed.

---

## 30. TypeScript type declarations for `LtiToolkitInstance` are too loose ✅ DONE (v1.1)

`index.d.ts` now has fully typed interfaces for all four controllers and the data model shapes. `LtiToolkitInstance` replaces the `Record<string, unknown>` placeholders with:

- `ConsumerRegistryController` / `ProviderRegistryController` — all CRUD methods with typed return shapes (`ConsumerInstance`, `ProviderInstance`, `ConsumerKeyData`, `ProviderKeyData`)
- `LTIConsumerController` — `generateLTI10LaunchFormData`, `generateLTI13LaunchFormData`, `generateLTI13DeepLinkFormData`, `lti10configxml`, `lti13dynamicregistration`
- `LTIProviderController` — `postGrade`, `getLineItem`, `getLineItems`, `readGrade`, `deleteGrade`, `getResults`, `createDeepLink`
- `models` typed as `{ Consumer: unknown; Provider: unknown }` — names documented but Sequelize class internals left opaque
- `routers` left as `unknown` — no `@types/express` dependency added

All controllers are optional fields (not conditionally typed on config). Conditional typing was deferred as a future improvement.

**What was deferred:**

- Conditional presence of controllers based on config (complex generics, low real-world benefit)
- Tighter `createDeepLink` / Express `res` typing (requires `@types/express`)
- Sequelize model class typing for `lti.models.Consumer` (requires Sequelize types)

---

## 29. Registry update and delete operations not demonstrated in either example app ✅ DONE (v1.1)

All CRUD operations are now demonstrated in both example apps. No library or test changes were needed.

**Consumer example** — three new routes + forms on the provider detail page (`/provider/:id`):

- `POST /provider/:id/update` (`routes/provider-update.js`) — calls `providerRegistry.updateProvider(id, data)` for name/launch_url/domain/custom
- `POST /provider/:id/delete` (`routes/provider-delete.js`) — calls `providerRegistry.deleteProvider(id)`, redirects to `/`
- `POST /provider/:id/rotate` (`routes/provider-rotate.js`) — calls `providerRegistry.updateSecret(id)`, re-renders provider page with new credentials

**Provider example** — two new routes + forms on the consumer detail page (`/consumer/:id`):

- `POST /consumer/:id/rotate` (`routes/consumer-rotate.js`) — calls `consumerRegistry.updateSecret(id)`, re-renders consumer page with new credentials
- `POST /consumer/:id/delete` (`routes/consumer-delete.js`) — calls `consumerRegistry.deleteConsumer(id)`, redirects to `/admin`
- The existing `POST /consumer/:id/config` form now also updates `name` (the `disabled` attribute was removed from the name field in `consumer.njk` and `name` was added to `consumer-config.js`'s required fields and data object)
