# Neon PostgreSQL Isolated Connectivity Check

A lightweight, standalone verification script to test PostgreSQL database connectivity from your local Windows development environment to your Neon PostgreSQL instance.

---

## 1. Overview & Security Guarantees

- **Isolated & Lightweight:** Uses only two runtime dependencies (`pg` and `dotenv`). Contains zero heavy application frameworks (No NestJS, No Prisma, No Next.js, No Docker).
- **Read-Only Verification:** Executes only `SELECT 1 AS connected, current_database() AS database_name, current_user AS database_role, NOW() AS server_time;`. Never creates, alters, or drops any tables or records.
- **Zero Credential Exposure:** Passwords, connection strings, and hosts are **never** logged to the terminal or exposed in error messages. All connection failures are categorized into sanitized codes with practical troubleshooting instructions.
- **Excluded by Git:** Protected by root `.gitignore` to prevent accidental credential commits.

---

## 2. Prerequisites

- **Node.js:** v18.0.0+ (Tested on Node.js 24 LTS).
- **npm:** v9.0.0+.
- An active Neon PostgreSQL project and credentials copied from the [Neon Console](https://console.neon.tech).

---

## 3. Setup & Execution Instructions

Follow these steps in your terminal:

### Step 1: Navigate to the tool directory
```powershell
cd D:\Project\BDMart\tools\neon-connectivity-check
```

### Step 2: Install runtime dependencies
Install only `pg` and `dotenv`:
```powershell
npm install
```

### Step 3: Configure your environment variables
Create your local `.env` file from `.env.example`:
```powershell
Copy-Item .env.example .env
```

Open `.env` in your editor and insert your two Neon connection strings:
```ini
# Pooled Connection String (Host contains '-pooler', used for web/API application queries)
POOLED_DATABASE_URL="postgresql://username:password@ep-your-endpoint-pooler.region.aws.neon.tech/neondb?sslmode=require"

# Direct Connection String (Host does NOT contain '-pooler', used for migrations and DDL)
DIRECT_DATABASE_URL="postgresql://username:password@ep-your-endpoint.region.aws.neon.tech/neondb?sslmode=require"
```

> **Where to find these in Neon Console:**
> 1. Open your project on [console.neon.tech](https://console.neon.tech).
> 2. On the **Dashboard**, locate the **Connection Details** widget.
> 3. For `POOLED_DATABASE_URL`, toggle the connection mode to **Pooled connection** and click copy.
> 4. For `DIRECT_DATABASE_URL`, toggle the connection mode to **Direct connection** and click copy.

### Step 4: Run the connectivity test
```powershell
npm test
```
*(Or run directly: `node check.mjs`)*

---

## 4. Expected Output Format

### Successful Run (Both Connections Active)
```
================================================================================
NEON DATABASE CONNECTIVITY REPORT
================================================================================

Pooled connection: PASS
Direct connection: PASS

Database name: neondb
Database role: neondb_owner
Server timestamp: 2026-11-12T04:30:00.000Z

Final result:
- Both connections working.

================================================================================
```
*Process exits with code `0`.*

### Partial or Failed Run
If a connection fails (e.g., due to an incorrect password, scale-to-zero timeout, or missing variable), the script reports `FAIL`, identifies the sanitized category, provides troubleshooting steps, and exits with code `1`:

```
================================================================================
NEON DATABASE CONNECTIVITY REPORT
================================================================================

Pooled connection: PASS
Direct connection: FAIL

Database name: neondb
Database role: neondb_owner
Server timestamp: 2026-11-12T04:30:00.000Z

Final result:
- Only pooled connection working.

--------------------------------------------------------------------------------
TROUBLESHOOTING & DIAGNOSTIC DETAILS (SANITIZED)
--------------------------------------------------------------------------------

[Direct Connection Failure]
Category: AUTHENTICATION_FAILED
Reason:   Password authentication failed for the specified database user.
Action:   Verify your database username and password in the Neon Console. If unsure, reset your role password in the Neon dashboard.
--------------------------------------------------------------------------------
================================================================================
```

---

## 5. Error Categories & Troubleshooting Guide

| Error Category | Typical Cause | Resolution |
|---|---|---|
| `MISSING_VARIABLE` | Variable not present in `.env`. | Ensure `POOLED_DATABASE_URL` and `DIRECT_DATABASE_URL` are defined in `.env`. |
| `AUTHENTICATION_FAILED` | Incorrect username or password. | Re-copy connection strings from the Neon Console or reset the password for the role. |
| `DATABASE_NOT_FOUND` | Typo in database name in URL path. | Verify that the database name matches an existing database (default is `neondb`). |
| `HOST_UNREACHABLE` | DNS lookup failure or invalid domain. | Verify internet access and check the endpoint hostname spelling. |
| `CONNECTION_TIMEOUT` | Compute asleep or firewall/VPN blocking outbound port 5432. | Wait 5 seconds for compute to wake up, or check local Windows Defender / corporate VPN firewall rules for port 5432. |
| `TLS_CONFIGURATION_ERROR` | TLS handshake issue or clock drift. | Ensure `?sslmode=require` is present at the end of the connection string. |

