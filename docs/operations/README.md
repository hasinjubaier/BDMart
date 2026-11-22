# Operations Documentation — Category Overview

## Purpose
The `operations/` category details the operational runtime environment, Docker containerization, local development setup, secrets management, CI/CD pipeline automation, zero-downtime deployment, health monitoring, disaster recovery runbooks, and database backup verification for BD Mart.

---

## Documents in this Category

| Document | Purpose | Primary Role |
|---|---|---|
| [environment-and-secrets.md](file:///d:/Project/BDMart/docs/operations/environment-and-secrets.md) | Exhaustive environment variable inventory, `.env.example` structure, and runtime secret injection boundaries. | DevOps / Security Engineer |
| [docker-and-local-setup.md](file:///d:/Project/BDMart/docs/operations/docker-and-local-setup.md) | Multi-stage production Dockerfile, `docker-compose.yml` for local containerized development, and local non-Docker quickstart. | Infrastructure Lead |
| [ci-cd-and-deployment.md](file:///d:/Project/BDMart/docs/operations/ci-cd-and-deployment.md) | GitHub Actions CI workflow, PR gating, Neon database branching integration, and Firebase App Hosting / Vercel deployment. | Release Engineer / DevOps |
| [runbook-and-monitoring.md](file:///d:/Project/BDMart/docs/operations/runbook-and-monitoring.md) | Incident triage runbook (payment failure, courier outage, AI down), Sentry monitoring, health checks, and PITR backup recovery. | Site Reliability Engineer (SRE) |

---

## When Each Document is Useful
- Use **`environment-and-secrets.md`** when configuring local `.env.local` files, provisioning GitHub Actions secrets, or setting up Firebase/Vercel production environment keys.
- Use **`docker-and-local-setup.md`** when spinning up a containerized local testing environment or deploying BD Mart to container-orchestrated infrastructure (e.g., Kubernetes, Cloud Run, VPS).
- Use **`ci-cd-and-deployment.md`** when managing GitHub Actions workflows or verifying automated PR tests.
- Use **`runbook-and-monitoring.md`** during production incidents, scheduled disaster recovery drills, or when configuring `/api/health` probes.

---

## Dependencies & Open Decisions
- **Dependencies:** Translates architectural models from [docs/architecture/](file:///d:/Project/BDMart/docs/architecture/README.md) into concrete deployment manifests and automation pipelines.
- **Outstanding Decisions:** Refer to [decision-log.md](file:///d:/Project/BDMart/docs/quality-and-delivery/decision-log.md) regarding default automated rollback triggers upon Sentry error rate spikes.
