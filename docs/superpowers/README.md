# Superpowers Workstream Docs

This directory is the tracked planning and implementation handoff area for TheBlueMaroon. It complements the local, gitignored `AGENT_TODO.md`.

## Directory Layout

- `specs/`: Approved or proposed design specs that describe what should be built and why.
- `plans/`: Step-by-step implementation plans derived from approved specs.
- `reviews/`: Review notes, verification summaries, and follow-up audits.

## Agent Workflow

1. Read `AGENTS.md`, `AGENT_ROLES.md`, and `AGENT_TODO.md` first.
2. For new multi-step work, write or update a spec in `specs/`.
3. After the spec is reviewed, write an implementation plan in `plans/`.
4. During implementation, keep changes scoped to the plan and record meaningful verification in `reviews/` when useful.
5. Keep docs short enough to scan. Prefer focused task contracts over large permanent agent files.
6. Follow `AGENT_ROLES.md` token-aware tiers before spawning agents. Use quiet verification wrappers when successful command output would be noisy.
