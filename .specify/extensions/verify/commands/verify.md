---
description: Post-implementation spec compliance verification with task augmentation
scripts:
  sh: scripts/bash/check-prerequisites.sh --json --require-tasks --include-tasks
  ps: scripts/powershell/check-prerequisites.ps1 -Json -RequireTasks -IncludeTasks
handoffs:
  - label: Re-implement follow-up verify tasks
    agent: speckit.implement
    prompt: Address the follow-up tasks generated during verification
  - label: Run cleanup quality gate
    agent: speckit.cleanup
    prompt: Run post-implementation cleanup after verification is complete
---

## User Input

```text
$ARGUMENTS
```

You **MUST** consider the user input before proceeding (if not empty).

## Goal

Evaluate the implemented feature against its specification artifacts. Produce a structured findings report, append actionable follow-up tasks to `tasks.md` for any taskable findings, and output an augmentation summary.

This command runs the wrapper implementation of [`spec-kit-verify`](https://github.com/ismaelJimenez/spec-kit-verify) — the upstream extension runs as a read-only analysis step and its findings are post-processed by this augmentation layer.

---

## Step 1: Load Feature Artifacts

Load the following from FEATURE_DIR (resolved by the calling agent via `check-prerequisites.ps1`):

**Required** (fail with remediation guidance if missing):
- `spec.md` — authoritative feature requirements and user stories
- `plan.md` — implementation plan and technical decisions
- `tasks.md` — task breakdown (must exist; do NOT create if missing)

**If exists**:
- `data-model.md` — entity definitions and relationships
- `contracts/` — API/workflow contracts (all `.md` files)
- `research.md` — technical decisions and constraints
- `quickstart.md` — validation scenarios

**Failure conditions**:
- If `spec.md` or `plan.md` is missing: STOP and report `"Required artifact missing: [file] — cannot run verification without specification context."`
- If `tasks.md` is missing: STOP and report `"tasks.md not found in feature directory — run /speckit.tasks first"` — do NOT create the file.

---

## Step 2: Evaluate Against Seven Verification Categories

Analyze the implemented feature artifacts (including actual files created/modified, as described in tasks.md and plan.md) against the loaded spec artifacts across these seven categories:

| # | Category                      | What to check                                                                                       |
|---|-------------------------------|-----------------------------------------------------------------------------------------------------|
| 1 | Task Completion               | Are all tasks in tasks.md marked `[x]`? Are any tasks skipped without justification?              |
| 2 | File Existence                | Do all files referenced in plan.md project structure and tasks actually exist on disk?             |
| 3 | Requirement Coverage          | Does at least one implemented artifact trace to each functional requirement (FR-NNN)?              |
| 4 | Scenario & Test Coverage      | Does at least one implemented task or artifact address each acceptance scenario and edge case?     |
| 5 | Spec Intent Alignment         | Does the implemented behavior match the user stories and measurable outcomes in spec.md?           |
| 6 | Constitution Alignment        | Do all implementation decisions comply with all 7 principles in `.specify/memory/constitution.md`? |
| 7 | Design & Structure Consistency| Do implemented files match the project structure in plan.md? Are naming conventions consistent?    |

---

## Step 3: Produce Structured Findings Report

Output a findings table. Each finding must include all fields:

```markdown
## Verification Findings

| ID    | Category    | Severity | Location                   | Summary                             | Recommendation                          | Taskable |
|-------|-------------|----------|----------------------------|-------------------------------------|-----------------------------------------|----------|
| VF-001| traceability| high     | tasks.md#US2               | Story lacks independent test...     | Add task(s) that validate...            | true     |
```

**Severity levels**: `critical`, `high`, `medium`, `low`, `info`

**Category values**: `coverage`, `contradiction`, `ambiguity`, `traceability`, `quality`, `governance`, `other`

**Fingerprint** (for deduplication, not shown in table but computed internally):
Format: `{category}|{normalized_location}|{normalized_intent}`
- normalize location: lowercase, strip line numbers, use relative paths
- normalize intent: lowercase, strip articles/prepositions, truncate to 80 characters
- fingerprint must be deterministic for semantically equivalent findings

Then output a severity summary:

```markdown
## Findings Summary

| Severity | Count |
|----------|-------|
| critical | 0     |
| high     | 1     |
| medium   | 2     |
| low      | 1     |
| info     | 0     |
| **Total**| **4** |
```

---

## Step 4: Task Augmentation

After producing findings, process taskable findings into `tasks.md` entries.

### 4a. Filter and Deduplicate

1. Select only findings where `taskable = true`.
2. For each candidate finding, compute its fingerprint (as described in Step 3).
3. Read current `tasks.md` and extract existing fingerprints from the `## Generated Follow-Up Tasks (Verify)` section.
   - Fingerprints are embedded as HTML comments: `<!-- fingerprint: {value} -->`
4. If a candidate's fingerprint matches an existing open task fingerprint → skip (`duplicate_skipped`).
5. If a candidate is new → prepare to append.

### 4b. Task Format

Each generated task appended under `## Generated Follow-Up Tasks (Verify)` must use this exact format:

```markdown
- [ ] [VF-{id}] [{category}] {clear action statement} in {file path} — Rationale: {concise rationale from finding recommendation}
<!-- fingerprint: {fingerprint_value} -->
```

Example:
```markdown
- [ ] [VF-003] [coverage] Add integration test for rollout error handling in .specify/scripts/powershell/update-speckit.ps1 — Rationale: FR-010 requires per-repo error reporting but no test exercises the error path
<!-- fingerprint: coverage|update-speckit.ps1|add per-repo error reporting test -->
```

### 4c. Append to tasks.md

- If the `## Generated Follow-Up Tasks (Verify)` section does not exist, add it at the end of `tasks.md`.
- Append only new (non-duplicate) tasks under this section.
- Leave ALL content outside this section completely unchanged.
- If no taskable findings exist, do NOT modify `tasks.md`; log: `"No actionable findings — tasks.md unchanged"`.

### Fingerprint normalization rules

**Purpose**: Fingerprints enable cross-run deduplication. The same logical finding discovered across multiple verify passes produces the same fingerprint, so it is appended only once. Subsequent runs skip it when an open task with a matching fingerprint already exists in `tasks.md`.

Format: `{category}|{normalized_location}|{normalized_intent}`

**Normalize location**:
- Lowercase the full path
- Remove line number references (e.g., `#L42`, `#US2`)
- Use relative paths from repo root

**Normalize intent** (from recommendation text):
- Lowercase
- Strip common articles: a, an, the, and, or, of, to, in, for, with, that
- Strip leading/trailing whitespace
- Truncate to 80 characters

**Semantically equivalent** means: two findings are considered the same if they share the same category, refer to the same file (normalized), and express the same remediation intent (normalized). Differences in phrasing, severity, or run order do not make them distinct — only category + location + intent uniqueness matters.

Example: `"Add integration test for rollout error handling"` → `"add integration test rollout error handling"`

Final fingerprint: `coverage|update-speckit.ps1|add integration test rollout error handling`

---

## Step 5: Output Augmentation Summary

After task augmentation completes (or is skipped), output this summary:

```markdown
## Augmentation Summary

| Metric             | Count |
|--------------------|-------|
| candidates         | N     |
| appended           | N     |
| duplicate_skipped  | N     |
| not_taskable       | N     |
```

---

## Step 6: Failure Handling

| Condition                          | Behavior                                                                                         |
|------------------------------------|--------------------------------------------------------------------------------------------------|
| `spec.md` or `plan.md` missing     | STOP. Report: `"Required artifact missing: [file]"`. Do not produce findings.                   |
| `tasks.md` missing                 | STOP. Report: `"tasks.md not found — run /speckit.tasks first"`. Do not create the file.        |
| `tasks.md` malformed (no sections) | STOP. Report parse guidance. Do not destructively rewrite.                                       |
| Findings schema invalid            | STOP. Report schema mismatch. Do not append tasks.                                               |
| No actionable findings             | Complete successfully. Log "No actionable findings — tasks.md unchanged". Do NOT modify the file.|
