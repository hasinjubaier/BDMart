# Security and Privacy Documentation — Category Overview

## Purpose
The `security-and-privacy/` category defines the security boundaries, Role-Based Access Control (RBAC) authorization matrix, PII and sensitive document protection standards, OWASP Top 10 defenses, and regulatory compliance requirements for BD Mart.

---

## Documents in this Category

| Document | Purpose | Primary Role |
|---|---|---|
| [rbac-matrix.md](file:///d:/Project/BDMart/docs/security-and-privacy/rbac-matrix.md) | Granular permission matrix across all actors, ownership checks, and B2B organizational isolation. | Security Lead / Architect |
| [sensitive-data-and-compliance.md](file:///d:/Project/BDMart/docs/security-and-privacy/sensitive-data-and-compliance.md) | PII protection, secure KYC document handling in private storage buckets, session security, and OWASP Top 10 controls. | Security Officer / Privacy Lead |
| [audit-logging-and-fraud.md](file:///d:/Project/BDMart/docs/security-and-privacy/audit-logging-and-fraud.md) | Immutable audit trails, payment fraud detection, collusion prevention, and compliance with Bangladesh Digital Commerce Guidelines (2021). | Compliance Officer / DevOps |

---

## When Each Document is Useful
- Use **`rbac-matrix.md`** when implementing `requireRole()` checks, writing route protection middleware, or preventing horizontal privilege escalation.
- Use **`sensitive-data-and-compliance.md`** when designing Firebase Storage security rules, configuring Content Security Policy (CSP) headers, or handling customer phone numbers and NIDs.
- Use **`audit-logging-and-fraud.md`** when instrumentation audit logging in Server Actions or preparing for compliance audits.

---

## Dependencies & Open Decisions
- **Dependencies:** Enforces security across [docs/data-and-api/](file:///d:/Project/BDMart/docs/data-and-api/README.md) and [docs/architecture/](file:///d:/Project/BDMart/docs/architecture/README.md).
- **Outstanding Decisions:** Refer to [decision-log.md](file:///d:/Project/BDMart/docs/quality-and-delivery/decision-log.md) regarding data retention limits for audit logs and customer account anonymization requests.
