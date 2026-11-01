# Frontend Smoke Verification Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add reliable frontend smoke verification scripts that avoid the local `npm.ps1`, duplicate `Path`/`PATH`, and sandboxed Vite launch issues.

**Architecture:** Use PowerShell scripts to start and stop Vite through `npm.cmd` in a sanitized child process, with PID and logs stored under `frontend/.smoke/`. Use a route smoke script for HTTP-level SPA fallback checks and a dependency-free Node verifier for truth-pass regression checks.

**Tech Stack:** PowerShell, Node.js built-ins, Vite, existing frontend package scripts.

---

## File Structure
- Create: `frontend/scripts/start_smoke_server.ps1` starts Vite on `127.0.0.1:5173`, sanitizes duplicate path env vars, writes PID/log metadata.
- Create: `frontend/scripts/stop_smoke_server.ps1` stops the PID tree recorded by the smoke server.
- Create: `frontend/scripts/smoke_routes.ps1` checks key route responses and can stop the server after the run.
- Create: `frontend/scripts/verify_truth_pass.mjs` checks that fake marketplace/position payloads have not returned.
- Modify: `frontend/package.json` adds `smoke:start`, `smoke:stop`, `smoke:routes`, and `verify:truth-pass`.
- Modify: `frontend/.gitignore` ignores `.smoke/`.
- Modify: `AGENT_TODO.md` records the verification workflow.

## Tasks

### Task 1: Smoke Server Scripts
- [ ] Run a failing check that `frontend/scripts/smoke_routes.ps1` does not exist yet.
- [ ] Create start/stop scripts that use `npm.cmd`, a sanitized process environment, and local `.smoke` metadata.
- [ ] Verify `start_smoke_server.ps1` starts a Vite server when run outside the sandbox approval path.
- [ ] Verify `stop_smoke_server.ps1` cleans up the recorded process.

### Task 2: Route Smoke Script
- [ ] Create `smoke_routes.ps1` to start the server if needed, check `/`, `/explore`, `/asset/smoke-test`, `/portfolio`, and `/holding/smoke-test`, and optionally stop afterward.
- [ ] Verify it reports concise PASS/FAIL output.

### Task 3: Truth-Pass Regression Verifier
- [ ] Run a failing check that `frontend/scripts/verify_truth_pass.mjs` does not exist yet.
- [ ] Create a Node script that rejects known fake payload strings and requires unavailable-state contracts in the relevant hooks/pages.
- [ ] Add package scripts for smoke and truth verification.
- [ ] Verify with `node ./scripts/verify_truth_pass.mjs`.

### Task 4: Final Verification
- [ ] Run `npm.cmd run build`.
- [ ] Run `.\node_modules\.bin\eslint.cmd .`.
- [ ] Run `node ./scripts/verify_truth_pass.mjs`.
- [ ] Run `.\scripts\smoke_routes.ps1 -StopAfter` through the approved dev-server path if needed.
- [ ] Update `AGENT_TODO.md`.
- [ ] Do not run git commands.
