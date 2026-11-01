# Token-Aware Agent Workflows Implementation Plan

> **For agentic workers:** Prefer inline execution for this plan. The plan itself is about reducing unnecessary subagent use; use subagents only if a later change crosses into Tier 2 or Tier 3 risk.

**Goal:** Reduce token usage while preserving useful agent collaboration, review quality, and verification evidence.

**Architecture:** Keep the coordinator responsible for high-level reasoning and use small, narrow helpers only when the task tier justifies it. Store reusable workflow policy in `AGENT_ROLES.md`, short operational reminders in `AGENTS.md`, and quiet command helpers in backend/frontend script folders.

**Tech Stack:** Markdown repo guidance, PowerShell helper scripts, pytest, npm/Vite/ESLint.

---

## Implemented Strategies

- [x] Added risk-based workflow tiers from inline work through full gated subagent workflows.
- [x] Added a model/reasoning ladder that keeps high-level thinking with the coordinator and pushes mechanical tasks to cheaper/low-reasoning helpers.
- [x] Added quiet verification scripts that write full logs to `.agent/logs/` and print concise success/failure summaries.
- [x] Added prompt-caching/context-pack guidance: stable instructions first, variable task context last, focused excerpts instead of full docs.
- [x] Added evidence budgets so task contracts name the smallest meaningful verification before work starts.
- [x] Added review compression rules for findings-only reviewer output.
- [x] Added scope locks for subagents, including allowed edits, max context, max commands, and no subagent spawning unless explicitly granted.
- [x] Added config hygiene rules so workflow updates land in the right repo guidance files and local tool caveats are recorded.

## Files

- Modified: `.gitignore` to ignore `.agent/` logs.
- Modified: `AGENT_ROLES.md` with token-aware workflow tiers, model ladder, context budgets, evidence budgets, quiet verification, review compression, scope locks, and config hygiene.
- Modified: `AGENTS.md` with short token-aware operating guidance and quiet command references.
- Created: `backend/scripts/verify_quiet.ps1` for quiet pytest verification.
- Created: `frontend/scripts/verify_quiet.ps1` for quiet build/lint/typecheck verification.

## Verification

- Read back the changed guidance and scripts.
- Run targeted `rg` checks for all eight named strategy areas.
- Run the quiet backend verification helper on a lightweight existing test.
- Run the quiet frontend helper in typecheck mode to verify script wiring without dumping build output.
