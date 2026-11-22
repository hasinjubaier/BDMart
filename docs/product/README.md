# Product Documentation — Category Overview

## Purpose
The `product/` category defines the foundational business scope, participant actors, commercial boundaries, functional requirements matrix, and domain glossary for the BD Mart dual-engine marketplace.

---

## Documents in this Category

| Document | Purpose | Primary Role |
|---|---|---|
| [scope-and-boundaries.md](file:///d:/Project/BDMart/docs/product/scope-and-boundaries.md) | Release 1 scope, in-scope capabilities, and explicit non-goals (deferred features). | Product Manager / Architect |
| [users-and-roles.md](file:///d:/Project/BDMart/docs/product/users-and-roles.md) | Detailed actor personas, authentication models, onboarding journeys, and permission boundaries. | Business Analyst / Security Lead |
| [requirements-matrix.md](file:///d:/Project/BDMart/docs/product/requirements-matrix.md) | Stable-ID functional requirements (`REQ-*`) with acceptance criteria and priority. | Lead Product Manager / QA Lead |
| [glossary.md](file:///d:/Project/BDMart/docs/product/glossary.md) | Standardized domain terms, acronyms, and legal/financial terminology for Bangladesh commerce. | Business Analyst / Commerce Lead |

---

## When Each Document is Useful
- Use **`scope-and-boundaries.md`** when assessing whether a requested feature belongs in the MVP or Phase 1 release, or when reviewing deferred capabilities.
- Use **`users-and-roles.md`** when designing authorization guards, user session contexts, or registration and KYC flows.
- Use **`requirements-matrix.md`** when writing test plans, planning development sprints, or mapping test suites to functional deliverables.
- Use **`glossary.md`** to disambiguate domain terms (such as Poisha, BIN, TIN, RFQ, Escrow, or Trade License).

---

## Dependencies & Open Decisions
- **Dependencies:** Serves as the upstream specification for [Commerce](file:///d:/Project/BDMart/docs/commerce/README.md), [UX](file:///d:/Project/BDMart/docs/ux/README.md), and [Architecture](file:///d:/Project/BDMart/docs/architecture/README.md).
- **Outstanding Decisions:** Refer to [decision-log.md](file:///d:/Project/BDMart/docs/quality-and-delivery/decision-log.md) for open decisions regarding default marketplace commission percentages and customer return inspection windows.
