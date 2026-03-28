---
name: detecting-test-theater
description: Use when the user asks to scan, find, audit, or analyze test files for test theater — tests that pass but don't verify real behavior. Triggers on phrases like "scan my tests", "find test theater", "audit test quality", "check for hollow tests", "review test suite for problems", or any request to evaluate whether a repository's tests are meaningful. Also triggers when the user says a test suite looks fine but failures are being missed.
---

# Detecting Test Theater

## Overview

Scans a repository's test suite for 8 categories of low-value tests, producing a prioritized findings report with file paths, line references, severity ratings, and recommended actions per finding.

**Pattern library**: Loaded at session start via SessionStart hook. If not visible in context, read `references/pattern-library.md` before scanning — it contains detection heuristics and examples for all 8 patterns.

## When to Use

- User wants to scan a single repository or the current workspace
- User wants to evaluate test quality before a review, release, or audit
- User suspects tests are passing without verifying real behavior
- **Not this skill**: Use `learning-test-theater-patterns` when user wants to mine post-mortems or retrospectives for new patterns

## Core Pattern

```
1. Discover test files (by naming conventions + active language config)
2. For each file: read → apply all 8 pattern heuristics → record findings
3. Skip unparseable / unrecognized files with a warning; continue
4. Report progress every 10 files
5. Sort and present findings: critical → warning → info, then by file path
```

## Quick Reference

| Step | Tool + Detail |
|------|---------------|
| Discover Python | `Get-ChildItem -Recurse -Include "test_*.py","*_test.py"` |
| Discover JS/TS | `Get-ChildItem -Recurse -Include "*.test.js","*.spec.ts"` (and `.js`,`.ts` variants) |
| Discover C# | `Get-ChildItem -Recurse -Include "*Tests.cs","*Test.cs"` |
| Discover PowerShell | `Get-ChildItem -Recurse -Include "*.Tests.ps1","*-test.ps1"` |
| Exclude dirs | Filter out: `node_modules`, `.git`, `vendor`, `dist`, `build` (see active config) |
| Progress | After every 10 files: "Scanning: {N}/{M} files, {K} findings so far…" |
| Multi-category | One test may match multiple patterns — report ALL that apply (edge case: overlapping categories) |

## Implementation

### Discovery

Use the terminal tool. Apply `exclude_paths` from active config (injected by SessionStart). Search from repo root.

### Analysis

Read each discovered file using `read_file`. Apply each of the 8 pattern heuristics from the pattern library. For each match, record:
- `file_path` — repo-relative path
- `line_start` / `line_end` — 1-based line numbers
- `pattern_id` — e.g., `tautological-assertion`
- `severity` — from pattern library default (may be overridden by active config)
- `explanation` — plain-language reason this instance qualifies as test theater

### Output Format

Present as a sorted findings list after scanning completes:

```markdown
## Findings: {repo_name}
**{N} findings** ({critical} critical, {warning} warning, {info} info)

### [CRITICAL] tautological-assertion — tests/test_auth.py:42
**Explanation**: `assert True` always passes regardless of the code under test.
**Recommended action**: Replace with an assertion on the actual return value of the function.
```

Then an **Action Checklist** at the end:
```markdown
## Action Checklist
- [ ] [CRITICAL] tests/test_auth.py:42 — tautological-assertion
```

### Finding Markers (required for Stop hook)

After presenting each finding in chat, **immediately emit** a structured HTML comment marker. The Stop hook parses these to compile the report when the session ends.

```html
<!-- FINDING: {"file_path":"tests/test_auth.py","line_start":42,"line_end":42,"pattern_id":"tautological-assertion","severity":"critical","explanation":"assert True always passes","status":"open","recommended_action":"Replace with assertion on actual return value"} -->
```

Emit one marker per finding, on its own line, immediately after the finding's "Recommended action" line. Do not omit markers — they are the Stop hook's only reliable data source.

After presenting **all findings for a repository**, emit a single scan-complete marker with the file counts for that repo:

```html
<!-- SCAN_COMPLETE: {"repo":"C:\\Repos\\MyProject","files_scanned":14,"files_skipped":2} -->
```

- `repo` — absolute path of the repository root (or `"."` if single-repo mode with no explicit path)
- `files_scanned` — count of files successfully read and analyzed
- `files_skipped` — count of files skipped due to parse errors or unrecognized format

Emit this marker once per repository, after all findings for that repo have been emitted.

## Common Mistakes

- **Copying pattern heuristics inline**: They live in `references/pattern-library.md`. Load the file; do not duplicate it.
- **Stopping after one parse error**: Log "WARNING: skipped {file} — {reason}" and continue scanning all remaining files.
- **Ignoring multi-category overlaps**: A test with `assert True` inside an empty mock setup can be both `tautological-assertion` and `over-mocked-test`. Report both.
- **Flagging test helpers as findings**: Skip files like `conftest.py` or `test_helpers.py` that contain utilities but no test functions (`def test_*` / `it(` / `[Fact]`).

## Multi-Repo Mode

When the user specifies a parent directory (e.g., `C:\Repos`) instead of a single repo:

### 1 — Enumerate repositories

```powershell
Get-ChildItem -Path "C:\Repos" -Directory |
  Where-Object { Test-Path (Join-Path $_.FullName '.git') }
```

Filter out any repository matching a user-specified exclusion pattern. Announce discovered repos before scanning: "Found N repositories. Scanning…"

### 2 — Apply inclusion/exclusion patterns

If the user specifies `--include` or `--exclude` patterns (glob), filter the list before scanning. Example: `--exclude vendor-*` skips repos whose directory name matches `vendor-*`.

### 3 — Scan each repository sequentially

Apply the single-repo workflow to each discovered repo. Announce progress between repos: "Completed {N}/{M} repos…"

- **No test files found**: Report "no tests found" for that repo — do not error.
- **Permission denied / access error**: Log "WARNING: skipped {repo} — access denied" and continue.

### 4 — Emit per-repo finding markers with repo context

Include `"repo_path"` in every finding marker when in multi-repo mode so the Stop hook can group reports by repository:

```html
<!-- FINDING: {"repo_path":"C:\\Repos\\MyProject","file_path":"tests/test_auth.py","line_start":42,"line_end":42,"pattern_id":"tautological-assertion","severity":"critical","explanation":"assert True always passes","status":"open"} -->
```

### 5 — Cross-repo aggregate summary

After all repositories are scanned, present a summary table before individual findings:

```markdown
## Cross-Repository Summary

| Repository | Files Scanned | Findings | Critical | Warning | Info |
|------------|---------------|----------|----------|---------|------|
| MyProject  | 14            | 3        | 1        | 2       | 0    |
| OtherRepo  | 8             | 0        | 0        | 0       | 0    |
| **Total**  | 22            | 3        | 1        | 2       | 0    |
```