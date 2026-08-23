# Database Cleanliness Audit Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bring the configured dev database schema up to the app's Alembic head and add a repeatable read-only audit for database cleanliness.

**Architecture:** Use Alembic for schema migration and a dependency-light Python audit script for safe inspection. The audit script reads backend settings, masks secrets, creates a no-echo SQLAlchemy connection, checks Alembic current vs local head, validates app-critical tables/columns, and reports aggregate cleanup signals only.

**Tech Stack:** FastAPI backend settings, SQLAlchemy async engine, Alembic script metadata, pytest, PowerShell wrapper.

---

## File Structure
- Create: `backend/scripts/db_audit.py` for read-only database audit checks.
- Create: `backend/scripts/db_audit.ps1` for a quiet Windows-friendly wrapper.
- Create: `backend/tests/test_db_audit_script.py` for sanitization and audit-summary unit coverage.
- Modify: `AGENT_TODO.md` to record schema drift remediation and audit workflow.

## Tasks

### Task 1: Audit Script Test
- [ ] Write tests for URL sanitization, target summary, and drift classification.
- [ ] Run the new focused test and confirm it fails because `db_audit.py` does not exist yet.

### Task 2: Audit Script
- [ ] Implement `db_audit.py` with no row-content output.
- [ ] Add `--json` and `--fail-on-drift` options.
- [ ] Implement column/table checks for `users`, `wallets`, `app_assets`, `fractional_listings`, `transactions`, `user_verification`, `listings`, `orders`, `roles`, and `user_roles`.
- [ ] Implement aggregate quality checks for orphan rows, expired drafts, duplicate email groups, missing email users, and marketplace groundwork counts.

### Task 3: Apply Migration
- [ ] Run read-only `alembic current` against the configured dev DB.
- [ ] Apply `alembic upgrade head` against the configured dev DB.
- [ ] Run `db_audit.py --fail-on-drift` to confirm the DB is at local head and expected columns exist.

### Task 4: Verify And Record
- [ ] Run focused audit-script tests.
- [ ] Run backend quiet tests.
- [ ] Update `AGENT_TODO.md`.
- [ ] Do not run git commands.
