---
description: Run post-implementation verification against spec artifacts and generate follow-up tasks
---

<!-- REPO CONTEXT START -->
<!-- Add repo-specific context paths here. Content inside these markers is preserved during speckit updates. -->
<!-- REPO CONTEXT END -->

## User Input

```text
$ARGUMENTS
```

You **MUST** consider the user input before proceeding (if not empty).

## Step 0: Load Repo Context

Before proceeding, read the following required context files. If any required file is missing, **STOP** and report the error — do not proceed with reduced context.

**Required**:
- `specs/NNN-name/tasks.md` — task breakdown
- `specs/NNN-name/plan.md` — implementation plan
- `specs/NNN-name/spec.md` — feature specification

**If exists**:
- `specs/NNN-name/data-model.md` — entity definitions
- `specs/NNN-name/contracts/` — API/workflow contracts
- `specs/NNN-name/research.md` — technical decisions

## Outline

1. Run `.specify/scripts/powershell/check-prerequisites.ps1 -Json -RequireTasks -IncludeTasks` from repo root and parse FEATURE_DIR and AVAILABLE_DOCS list.

2. Load feature spec artifacts from FEATURE_DIR:
   - **REQUIRED**: `spec.md`, `plan.md`, `tasks.md`
   - **IF EXISTS**: `data-model.md`, `contracts/`, `research.md`

3. Load verify command instructions from `.specify/extensions/verify/commands/verify.md`.

4. Execute the full verification workflow as defined in `commands/verify.md`.
