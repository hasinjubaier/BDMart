# BD Mart — Master Documentation Index

Welcome to the central technical and business documentation repository for **BD Mart**, the dual-engine B2C retail and B2B wholesale e-commerce marketplace in Bangladesh.

---

## 1. Executive Summary

This documentation package is prepared by the Senior Full-Stack Architect to allow developers, technical leads, product managers, and AI coding agents to answer three critical questions prior to writing code:

1. **What exactly are we building for each type of buyer?**  
   We are building a unified, multi-vendor marketplace where retail buyers (`buyer`) purchase single-unit goods with transparent upfront delivery pricing, COD/digital payments, and escrow protection; and verified business buyers (`business_buyer`) purchase in bulk using tiered MOQ pricing, negotiate custom terms via a formal RFQ (Request for Quote) system, and receive automated VAT-compliant commercial invoices.
2. **Which business and technical decisions are confirmed, and which still need the owner's approval?**  
   All architecture, schema, state machine, and core commercial rules are fully baseline-confirmed based on the canonical project specification (`BD_Mart_Agent_Build_Spec.md` and Bengal Commerce Core design system). A discrete set of commercial policy options (such as default platform commission rates, dispute timeout windows, and VAT tax calculation presets) are documented in the [Decision Log](file:///d:/Project/BDMart/docs/quality-and-delivery/decision-log.md) with architectural recommendations awaiting Product Owner sign-off.
3. **What observable behavior will demonstrate that each critical requirement has been implemented correctly?**  
   Each requirement has a stable ID (`REQ-*`), an explicit acceptance criterion, an observable state transition, and an automated verification test scenario mapped in the [Traceability Matrix](file:///d:/Project/BDMart/docs/quality-and-delivery/traceability-matrix.md) and [End-to-End Purchase Walkthroughs](file:///d:/Project/BDMart/docs/quality-and-delivery/end-to-end-purchase-walkthroughs.md).

---

## 2. Documentation Inventory

| Category | Folder Link | Primary Responsibility | Key Contents | Status |
|---|---|---|---|---|
| **Product** | [docs/product/](file:///d:/Project/BDMart/docs/product/README.md) | Product Manager & Business Analyst | Scope boundaries, actor definitions, functional requirements matrix, domain glossary. | Complete |
| **Commerce** | [docs/commerce/](file:///d:/Project/BDMart/docs/commerce/README.md) | Commerce Domain Lead | Catalog, dual pricing, checkout, escrow ledger, logistics adapters, B2B RFQ engine. | Complete |
| **UI/UX** | [docs/ux/](file:///d:/Project/BDMart/docs/ux/README.md) | UI/UX Lead | Sitemap, Bengal Commerce Core tokens, screen catalog, critical user journeys, WCAG AA. | Complete |
| **Architecture** | [docs/architecture/](file:///d:/Project/BDMart/docs/architecture/README.md) | Full-Stack Architect | C4 system context, ADRs (ADR-001 through ADR-007), layer boundaries, service contracts. | Complete |
| **Data & API** | [docs/data-and-api/](file:///d:/Project/BDMart/docs/data-and-api/README.md) | Data Architect | Drizzle PostgreSQL schema, Zod API contracts, formal state machines, idempotency & concurrency. | Complete |
| **Security & Privacy** | [docs/security-and-privacy/](file:///d:/Project/BDMart/docs/security-and-privacy/README.md) | Security Lead | RBAC matrix, tenant isolation, KYC private bucket controls, OWASP Top 10, audit logging. | Complete |
| **Operations** | [docs/operations/](file:///d:/Project/BDMart/docs/operations/README.md) | Operations & DevOps Lead | Docker compose environment, serverless cloud deployment, CI/CD pipelines, disaster recovery runbooks. | Complete |
| **Quality & Delivery** | [docs/quality-and-delivery/](file:///d:/Project/BDMart/docs/quality-and-delivery/README.md) | QA Lead & Release Engineer | End-to-end purchase walkthroughs, traceability matrix, decision log, readiness report. | Complete |

---

## 3. Suggested Reading Order by Role

### For Developers & Coding Agents Starting Implementation:
1. [AGENTS.md](file:///d:/Project/BDMart/AGENTS.md) — Mandatory technical boundaries, coding standards, and Do/Don't constraints.
2. [docs/architecture/tech-stack-and-adrs.md](file:///d:/Project/BDMart/docs/architecture/tech-stack-and-adrs.md) — Foundational architectural decisions.
3. [docs/data-and-api/database-schema.md](file:///d:/Project/BDMart/docs/data-and-api/database-schema.md) — Exact PostgreSQL schema and table structures.
4. [docs/data-and-api/state-machines.md](file:///d:/Project/BDMart/docs/data-and-api/state-machines.md) — Valid transitions for Orders, Payments, Escrow, and RFQ.
5. [docs/commerce/payments-and-escrow.md](file:///d:/Project/BDMart/docs/commerce/payments-and-escrow.md) & [docs/commerce/checkout-and-orders.md](file:///d:/Project/BDMart/docs/commerce/checkout-and-orders.md) — Financial and transactional logic.
6. [docs/quality-and-delivery/end-to-end-purchase-walkthroughs.md](file:///d:/Project/BDMart/docs/quality-and-delivery/end-to-end-purchase-walkthroughs.md) — Detailed runtime expectations.

### For Product Owner & Business Stakeholders:
1. [docs/product/scope-and-boundaries.md](file:///d:/Project/BDMart/docs/product/scope-and-boundaries.md) — First-release boundaries and deferred features.
2. [docs/commerce/b2b-purchasing-and-rfq.md](file:///d:/Project/BDMart/docs/commerce/b2b-purchasing-and-rfq.md) — Wholesale and RFQ quotation workflows.
3. [docs/quality-and-delivery/decision-log.md](file:///d:/Project/BDMart/docs/quality-and-delivery/decision-log.md) — Pending commercial decisions requiring owner sign-off.
4. [docs/quality-and-delivery/implementation-readiness-report.md](file:///d:/Project/BDMart/docs/quality-and-delivery/implementation-readiness-report.md) — Overall build readiness verdict.

### For QA Engineers & Testers:
1. [docs/quality-and-delivery/test-strategy-and-coverage.md](file:///d:/Project/BDMart/docs/quality-and-delivery/test-strategy-and-coverage.md) — Testing pyramid and negative testing rules.
2. [docs/quality-and-delivery/traceability-matrix.md](file:///d:/Project/BDMart/docs/quality-and-delivery/traceability-matrix.md) — Requirement-to-test mapping.
3. [docs/quality-and-delivery/end-to-end-purchase-walkthroughs.md](file:///d:/Project/BDMart/docs/quality-and-delivery/end-to-end-purchase-walkthroughs.md) — Test cases for retail and wholesale checkout.

---

## 4. Quick Reference to Key Artifacts
- **Trace Two Purchases End-to-End:** [docs/quality-and-delivery/end-to-end-purchase-walkthroughs.md](file:///d:/Project/BDMart/docs/quality-and-delivery/end-to-end-purchase-walkthroughs.md)
- **Pending Owner Decisions:** [docs/quality-and-delivery/decision-log.md](file:///d:/Project/BDMart/docs/quality-and-delivery/decision-log.md)
- **Implementation Readiness Verdict:** [docs/quality-and-delivery/implementation-readiness-report.md](file:///d:/Project/BDMart/docs/quality-and-delivery/implementation-readiness-report.md)
- **Canonical Specification Archive:** [BD_Mart_Agent_Build_Spec.md](file:///d:/Project/BDMart/BD_Mart_Agent_Build_Spec.md)
