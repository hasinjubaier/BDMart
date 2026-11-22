# Architecture Documentation — Category Overview

## Purpose
The `architecture/` category documents the high-level system context, C4 structural diagrams, Architectural Decision Records (ADRs), layer separation boundaries, and service interaction models for the BD Mart platform.

---

## Documents in this Category

| Document | Purpose | Primary Role |
|---|---|---|
| [system-context.md](file:///d:/Project/BDMart/docs/architecture/system-context.md) | C4 Context and Container diagrams (Mermaid), boundary definitions, and external system integrations. | Lead Systems Architect |
| [tech-stack-and-adrs.md](file:///d:/Project/BDMart/docs/architecture/tech-stack-and-adrs.md) | Comprehensive Architectural Decision Records (ADR-001 through ADR-007) detailing technical choices and trade-offs. | Principal Full-Stack Architect |
| [service-boundaries-and-data-flow.md](file:///d:/Project/BDMart/docs/architecture/service-boundaries-and-data-flow.md) | Strict 4-layer architecture, data flow rules, ownership enforcement, and backend service contracts. | Software Architect / Backend Lead |

---

## When Each Document is Useful
- Use **`system-context.md`** when assessing external integration boundaries (SSLCommerz, Pathao, Firebase, Claude API) or understanding system data flows.
- Use **`tech-stack-and-adrs.md`** when questioning why specific libraries, frameworks, or storage patterns were selected over alternatives.
- Use **`service-boundaries-and-data-flow.md`** when writing backend business logic, deciding where validation or authorization occurs, or refactoring services.

---

## Dependencies & Open Decisions
- **Dependencies:** Translates business rules from [docs/commerce/](file:///d:/Project/BDMart/docs/commerce/README.md) into engineering structures. Establishes the technical foundation for [docs/data-and-api/](file:///d:/Project/BDMart/docs/data-and-api/README.md) and [docs/operations/](file:///d:/Project/BDMart/docs/operations/README.md).
- **Outstanding Decisions:** Refer to [decision-log.md](file:///d:/Project/BDMart/docs/quality-and-delivery/decision-log.md) regarding primary production hosting preference (Firebase App Hosting vs Vercel).
