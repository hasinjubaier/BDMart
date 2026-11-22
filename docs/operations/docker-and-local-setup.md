# Native Windows Runtime and Local Setup Specification

## 1. Runtime Environment: Native Windows (No Docker)

> [!IMPORTANT]
> **Owner Decision:** Docker and WSL are **strictly excluded** from BD Mart. All development, testing, and execution run natively on Windows using PowerShell. This document supersedes earlier containerization proposals.

### Rationale:
1. **Serverless Database:** BD Mart connects directly to Neon Serverless PostgreSQL over TLS. There is no requirement for local containerized database daemons.
2. **Serverless Cloud Hosting:** Production deployment targets Firebase App Hosting / Vercel cloud builders directly from GitHub.
3. **Simplicity and Native Tooling:** Running directly on Windows eliminates hypervisor overhead, file-sharing latency, and container permission friction.

---

## 2. Windows Environment Prerequisites

- **Operating System:** Windows 10 / Windows 11 (x64)
- **Shell:** Windows PowerShell 5.1+ or PowerShell 7+
- **Node.js:** v20 LTS or v24 LTS (Active: v24.21.0)
- **Package Manager:** `pnpm` (Active: v12.18.0)
  ```powershell
  corepack enable
  corepack prepare pnpm@latest --activate
  ```

---

## 3. Local Setup & Execution Workflow

### 3.1. Install Dependencies
```powershell
pnpm install
```

### 3.2. Configure Environment
```powershell
Copy-Item .env.example .env.local
```
Populate `DATABASE_URL` in `.env.local` with your designated Neon development connection string.

### 3.3. Verify TypeScript and Code Style
```powershell
pnpm typecheck   # Runs tsc --noEmit (Strict mode)
pnpm lint        # Runs Next.js ESLint
pnpm build       # Compiles production build
```

### 3.4. Start Development Server
```powershell
pnpm dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### 3.5. Stop the Server
Press `Ctrl + C` in the active PowerShell console, then type `Y` to terminate the process.
