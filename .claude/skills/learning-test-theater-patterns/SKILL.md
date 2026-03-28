---
name: learning-test-theater-patterns
description: Use when the user wants to mine a repository's project artifacts — post-mortem reports, tech-debt reports, retrospectives, or task.md files — to discover new test theater patterns or examples. Triggers on phrases like "learn patterns from artifacts", "mine retrospectives for test issues", "update the pattern library", "find new test antipatterns in our docs", or when the user mentions a post-mortem or retrospective that discussed missed tests.
---

# Learning Test Theater Patterns

## Overview

Mines a repository's project documents (post-mortems, retrospectives, tech-debt reports, task.md updates) to extract candidate test theater patterns; presents each candidate for user review before adding it to the active pattern library.

**Pattern library**: Read `references/pattern-library.md` before running this workflow — candidates must be checked for overlap with existing patterns before proposing new ones.

## When to Use

- User wants to update the pattern library with project-specific antipatterns
- User references a retro, post-mortem, or tech-debt doc that discussed testing gaps
- User ran `/speckit.tasks` and found "additional tests that should have been included"
- **Not this skill**: Use `detecting-test-theater` when scanning test files for existing patterns

## Core Pattern

```
1. Discover learnable artifacts in the repository
2. For each artifact: extract mentions of missed, weak, or absent tests
3. Check each candidate against existing patterns (merge if overlap; create if new)
4. Present all candidates for user review — never add to pattern library without approval
5. On approval: write verified entry to references/pattern-library.md
```

## Quick Reference

| Artifact Type | File Patterns to Search |
|---------------|------------------------|
| Post-mortem   | `*post-mortem*`, `*postmortem*`, `*incident*`, `*blameless*` |
| Tech-debt     | `*tech-debt*`, `*technical-debt*`, `*debt*` |
| Retrospective | `*retro*`, `*retrospective*`, `*lessons-learned*` |
| Task updates  | `task.md`, `tasks.md` (look for additions after initial commit) |

Search directories: project root, `docs/`, `notes/`, `.github/`, `process/`

## Implementation

### 1 — Discover artifacts

Use the terminal tool to search the repo:
```powershell
Get-ChildItem -Recurse -File | Where-Object {
    $_.Name -match 'post.mortem|retro|tech.debt|task' -and
    $_.Extension -match '\.(md|txt|docx)'
} | Select-Object -ExpandProperty FullName
```

If no artifacts found: report "no learnable artifacts found in {repo}" and stop.

### 2 — Extract candidates

Read each discovered file. Look for language indicating:
- Tests that were missing ("we should have had a test for...", "no test covered...")
- Test failures caused by weak assertions ("the test passed but the bug shipped...")
- Categories of tests never written ("integration tests for X were skipped...")
- Post-implementation additions ("added test for Y, originally missed")

For each candidate, record:
- `source_file` — path to the artifact
- `source_excerpt` — the relevant passage (≤ 5 lines)
- `candidate_name` — proposed pattern name (gerund form, e.g., "missing-integration-boundary-test")
- `candidate_description` — what this pattern looks like in code
- `detection_heuristic` — how to spot it during a scan

### 3 — Check for overlap

Read `references/pattern-library.md`. For each candidate:
- **Exact match**: skip (already covered)
- **Partial overlap**: propose merging as a new example into the existing pattern
- **No overlap**: propose as a new pattern entry

### 4 — Present for review

Present all candidates in a review table before any changes:

```markdown
## Candidate Patterns for Review

| # | Candidate | Source | Action |
|---|-----------|--------|--------|
| 1 | missing-integration-boundary-test | docs/retro-q1.md:L42 | NEW pattern |
| 2 | mock-return-assertion (example) | post-mortem-2026.md:L18 | MERGE into existing |

Do you want to:
(a) Accept all  (b) Accept individually  (c) Reject all
```

### 5 — Apply approved changes

On user approval, update `references/pattern-library.md`:
- **New pattern**: append a full entry following the existing format (all required fields)
- **Merged example**: add the new `example_bad` snippet under the existing pattern

## Common Mistakes

- **Adding patterns without review**: Always present candidates first; never auto-update the pattern library.
- **Duplicating existing patterns**: Check the full pattern library before proposing "new" patterns — weak assertion variants often map to `tautological-assertion`.
- **Mining test files instead of project docs**: This skill reads post-mortems and retrospectives, not test code. Use `detecting-test-theater` for test file analysis.
- **Empty source attribution**: Every candidate must include the source file path and a relevant excerpt. Unattributed candidates must not be proposed.