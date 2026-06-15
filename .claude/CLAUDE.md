# CLAUDE.md

Behavioral guidelines to reduce common LLM coding mistakes. Merge with project-specific instructions as needed.

**Tradeoff:** These guidelines bias toward caution over speed. For trivial tasks, use judgment.

## 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:
- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them - don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

## 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

## 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:
- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it - don't delete it.

When your changes create orphans:
- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: Every changed line should trace directly to the user's request.

## 4. Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:
- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:
```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.

---

**These guidelines are working if:** fewer unnecessary changes in diffs, fewer rewrites due to overcomplication, and clarifying questions come before implementation rather than after mistakes.

---

# This Project

This is an LTI 1.0 and LTI 1.3 library for JavaScript web applications. It implements some but not all of the features of the LTI 1.0 and LTI 1.3 protocols for communicating between a learning management system (an LTI Tool Consumer) and an educational tool (an LTI Tool Provider). 

The primary use of this tool will be to connect to the Instructure Canvas learning management system as a tool provider, and then act as a tool consumer when connecting to other LTI tools that are either built using this library or are stand-alone tools. 

This tool implements enough of the LTI protocols to handle a launch from a tool consumer to a tool provider, handle simple grade passing from a tool provider to a tool consumer, and handle automatic tool configuration (via XML for LTI 1.0 or via Dynamic Registration via LTI 1.3). 

Where possible this tool validates all expected LTI protocol items, but it does make a few assumptions about what functionality it provides and what outputs are expected by the Canvas LMS. For example, it does not carefully check scopes and claims in an LTI 1.3 launch or dynamic registration request.

# Current Status

A 1.0 release of this tool has already been made but is not in active use. I've been adding the LTI 1.3 features to the Tool Consumer side of this library and am ready to finalize and deploy that update as version 1.1. 

# Project Layout

- `docs` contains a documentation website written using the Hugo framework. Most of the information is in the `content` folder inside of that directory.
- `examples` contains a full example implementation of both the LTI Tool Consumer and LTI Tool Provider interfaces for this library
- `src` contains the source code of the library itself
- `test` contains full unit tests that achieve 100% code coverage for the entire program. Tests are organized to match the source file/folder structure

# Change Workflow

Most non-trivial changes touch all four areas in this order:

1. **Library source** (`src/`) — implement the change
2. **Tests** (`test/`) — update or add tests; run `npm run cov` to confirm 371+ tests pass and 100% coverage is maintained
3. **Examples** (`examples/`) — update both apps to demonstrate the new functionality
4. **Docs** (`docs/content/`) — update documentation to match

## Key Source Files

| File | Purpose |
|---|---|
| `src/lib/lti10.js` | LTI 1.0 protocol logic (OAuth signing, Basic Outcomes) |
| `src/lib/lti13.js` | LTI 1.3 protocol logic (OIDC, JWT, AGS, Dynamic Registration) |
| `src/controllers/lti-provider.js` | Public API for acting as a Tool Provider (e.g. `postGrade`) |
| `src/controllers/lti-lms.js` | Public API for acting as a Tool Consumer (grade passback handler, auth, AGS) |
| `src/controllers/consumer.js` | Database-backed consumer management |
| `src/controllers/provider.js` | Database-backed provider management |

## Key Example Files

### Tool Provider (`examples/provider/`)
| File | Purpose |
|---|---|
| `src/configs/lti.js` | LTI Toolkit initialization |
| `src/routes/lti-launch.js` | Handles incoming LTI launches; routes students vs. instructors |
| `src/routes/student.js` / `student-grade.js` | Student view and grade submission handler |
| `src/routes/instructor.js` / `instructor-grade.js` | Instructor view and grade submission handler |
| `src/views/student.njk` | Student view template |
| `src/views/instructor.njk` | Instructor view template |

### Tool Consumer (`examples/consumer/`)
| File | Purpose |
|---|---|
| `src/configs/lti.js` | LTI Toolkit initialization |
| `src/routes/post-grade.js` | `postProviderGrade` callback — receives incoming grades from providers |
| `src/routes/grades.js` | Gradebook page handler |
| `src/views/grades.njk` | Gradebook view template |

## Key Documentation Files

| File | Purpose |
|---|---|
| `docs/content/_index.md` | Main project page: feature list, full configuration reference, full API reference |
| `docs/content/00-general/00-examples/provider/index.md` | Tool Provider example walkthrough (includes code snippets from example app) |
| `docs/content/00-general/00-examples/consumer/index.md` | Tool Consumer example walkthrough (includes code snippets from example app) |
| `docs/content/02-lti/` | LTI protocol deep-dives (launch data, deeplink, registration, etc.) |

Screenshots in the documentation are intentionally **not** updated by code changes — the developer captures those manually during testing.