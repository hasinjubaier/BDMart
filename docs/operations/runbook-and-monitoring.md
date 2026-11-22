# Runbook and Monitoring Specification

## 1. Health Checks and Telemetry Probes

BD Mart exposes an active health check endpoint at `/api/health`:
- **Endpoint:** `GET /api/health`
- **Response Format:**
  ```json
  {
    "status": "healthy",
    "timestamp": "2026-11-23T04:00:00.000Z",
    "version": "1.0.0",
    "checks": {
      "database": { "status": "up", "latencyMs": 14 },
      "firebaseAuth": { "status": "up" },
      "paymentGateway": { "status": "up" },
      "courierApi": { "status": "up" }
    }
  }
  ```
- **Probe Interval:** Synthetics poll every 30 seconds. A non-200 response triggers an urgent P1 pager alert to on-call engineering.

---

## 2. Incident Response Runbooks

### Incident 1: Payment Gateway Downtime / Webhook Failure
- **Symptom:** Buyers report completed MFS payments (bKash/Nagad), but order remains in `PENDING` status.
- **Diagnostic Procedure:**
  1. Check Sentry for IPN webhook timeout exceptions (`POST /api/webhooks/payment`).
  2. Inspect payment gateway merchant portal to verify transaction authorization status.
  3. Run the automated reconciliation script:
     ```bash
     pnpm run reconcile:payments --orderId=<ORDER_UUID>
     ```
  4. The script queries the gateway verification API directly, updates `orders.status` to `CONFIRMED`, and creates the corresponding `escrow_ledger` entry in `held` state.
- **Failover Action:** If primary gateway experiences an extended outage, switch `PAYMENT_GATEWAY=aamarpay` in environment variables and trigger zero-downtime redeploy.

---

### Incident 2: 3PL Courier API Outage
- **Symptom:** Sellers cannot request courier pickup; consignment IDs are not returned.
- **Remediation:**
  1. Check `lib/couriers/` Sentry error logs.
  2. The system automatically places failed courier dispatch requests into a retry queue with exponential backoff (retries at 5m, 15m, 1h).
  3. Sellers receive an in-app notice: "Courier network experiencing delays; pickup requested and will process automatically."

---

### Incident 3: Anthropic Claude API Rate Limit / Failure
- **Symptom:** Claude API returns HTTP 429 or 503 during product description generation or smart search.
- **Architectural Safeguard:**
  - AI features are non-critical enhancements. The platform employs **Graceful Fallback**:
    - If Smart Search AI fails, the system transparently falls back to PostgreSQL Full-Text Search (`tsvector`) without displaying any error to the user.
    - If Product Description Generator fails, the seller is presented with standard text fields with an informational toast: "AI assistance temporarily unavailable; manual input enabled."

---

## 3. Disaster Recovery & Backup Verification

### Backup Targets & Objectives:
- **Recovery Point Objective (RPO):** < 5 minutes of data loss.
- **Recovery Time Objective (RTO):** < 30 minutes to restore service.

### Backup Architecture:
1. **Neon Point-in-Time Recovery (PITR):** Neon provides continuous write-ahead log (WAL) archiving, allowing instant state restoration to any exact second within the retention window.
2. **Daily Logical Dumps:** Automated GitHub Actions cron runs `pg_dump` daily at 02:00 Asia/Dhaka time, encrypting the dump file with GPG and archiving to an isolated, immutable cloud storage bucket.
3. **Disaster Recovery Drill:** SRE team performs a scheduled restoration drill biannually, restoring a production dump onto an isolated Neon branch and executing the full Playwright test suite to verify data integrity.
