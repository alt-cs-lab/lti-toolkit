# Changelog

All notable changes to this project will be documented in this file. This project follows [Semantic Versioning](https://semver.org/) and the format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

## [1.1.0] — 2026-06-18

### Added

- **LTI 1.3 Tool Consumer** — the library can now initiate LTI 1.3 launches to registered Tool Providers using the OIDC login flow (`generateLTI13LaunchFormData`)
- **LTI 1.3 Tool Consumer grade passback** — Tool Providers can now post grades back via AGS; the consumer router handles score, line item, and results endpoints
- **LTI 1.3 Dynamic Registration as a consumer** — register remote Tool Providers by sending them an OpenID Configuration URL (`lti13dynamicregistration`)
- **LTI 1.3 Deep Linking as a consumer** — initiate Deep Linking requests to Tool Providers (`generateLTI13DeepLinkFormData`) and receive content items back via the `handleDeeplink` consumer config callback
- **`postGrade()` activity and grading progress** — `LTIProviderController.postGrade()` now accepts optional `activityProgress` and `gradingProgress` parameters validated against the LTI AGS spec; defaults are `"Submitted"` and `"FullyGraded"`
- **`getLineItems()`** — new `LTIProviderController` method to fetch the full AGS line items collection from a consumer; the AGS JWT claim now includes the `lineitems` collection URL alongside `lineitem`
- **`readGrade()` and `deleteGrade()`** — new `LTIProviderController` methods for LTI 1.0 Basic Outcomes `readResult` and `deleteResult` operations
- **`readProviderGrade` and `deleteProviderGrade` callbacks** — optional consumer config callbacks to serve `readResult`/`deleteResult` Basic Outcomes requests from Tool Providers
- **`getResults()`** — new `LTIProviderController` method to fetch AGS submission results from a consumer
- **`getProviderLineItem` and `getProviderLineItems` callbacks** — optional consumer config callbacks to serve AGS line item requests from Tool Providers
- **At-rest encryption** — all stored secrets and RSA private keys are now encrypted using AES-256-GCM; requires a new `encryption_key` config option (64-character hex string, generate with `openssl rand -hex 32`)
- **External database support** — pass a pre-configured Sequelize instance as `database` in the config to use any Sequelize-supported database instead of the built-in SQLite
- **TypeScript type declarations** — `index.d.ts` now includes typed interfaces for all four controllers (`ConsumerRegistryController`, `ProviderRegistryController`, `LTIConsumerController`, `LTIProviderController`) and their return shapes
- **Callback return validation** — all user-provided callbacks are now validated at runtime; missing or wrong-typed fields produce descriptive errors rather than silent failures downstream

### Changed

- **Controller accessor paths** ⚠️ **Breaking** — `lti.controllers.provider` (was `lti.controllers.lti.provider`) and `lti.controllers.consumer` (was `lti.controllers.lti.consumer`); the intermediate `.lti` segment has been removed
- **AGS token scopes** — the token endpoint now advertises all three scopes this library implements: `score`, `lineitem.readonly`, and `result.readonly`
- **Dynamic Registration response** — filtered to spec-required fields only, dropping extra fields that caused errors with some Tool Providers
- **OAuth 1.0 signature base URI** — now reads `X-Forwarded-Proto` and `X-Forwarded-Host` headers so signature verification works correctly behind a reverse proxy
- **Dynamic Registration URL validation** — endpoint URL now validated by origin comparison rather than a `startsWith` prefix check

### Removed

- **`provider.key` / `provider.secret` config shortcut** ⚠️ **Breaking** — this option previously created a single LTI 1.0 consumer at startup but also destroyed all other consumers on every restart. Use `consumerRegistry.createConsumer()` in application startup code instead.

### Fixed

- LTI 1.3 launches now validate `deployment_id` against the stored consumer record; mismatches are rejected
- LTI 1.3 login state is no longer destroyed before `deployment_id` validation
- LTI 1.0 XML configuration now properly XML-escapes custom parameter keys and values
- The `redirect_urls` provider field was stored under an incorrect key in v1.0; it is now stored correctly

### Security

- All shared secrets and RSA private keys are now encrypted at rest using AES-256-GCM. Existing plaintext values in v1.0 databases must be re-entered after upgrading.
- LTI 1.3 `deployment_id` is now validated on every launch, preventing launches from unregistered deployments.

## [1.0.0] — 2025-02-04

Initial release.

- LTI 1.0 Tool Provider support (launch, grade passback via Basic Outcomes, XML configuration)
- LTI 1.3 Tool Provider support (OIDC login, JWT launch, AGS grade passback, Dynamic Registration, Deep Linking)
- LTI 1.0 Tool Consumer support (launch, grade passback via Basic Outcomes)
- SQLite-backed consumer and provider registries
- Express router integration

[Unreleased]: https://github.com/alt-cs-lab/lti-toolkit/compare/v1.1.0...HEAD
[1.1.0]: https://github.com/alt-cs-lab/lti-toolkit/compare/v1.0.0...v1.1.0
[1.0.0]: https://github.com/alt-cs-lab/lti-toolkit/releases/tag/v1.0.0
