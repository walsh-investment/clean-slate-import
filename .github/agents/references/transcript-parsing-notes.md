# Transcript Parsing — Fragility Notes

**Relevant file**: `agents/test-theater/scripts/stop.ps1`
**Tech debt**: TD-002

## How the Stop Hook Works

`stop.ps1` receives a `transcript_path` from the VS Code Copilot hook runtime pointing to a JSON file containing the raw conversation transcript. The hook scans that file for `<!-- FINDING: {...} -->` and `<!-- SCAN_COMPLETE: {...} -->` HTML comment markers emitted inline by the agent during the session. These markers are the hook's **only** data source for disk report generation.

## Known Fragility Points

### 1 — Undocumented VS Code artifact

The transcript file is an internal VS Code implementation detail. Its schema, location on disk, and encoding are not part of any public API. A VS Code update may:
- Change the file path pattern or extension
- Change the JSON schema (e.g., rename the field that contains message text)
- Begin truncating long sessions before writing to disk
- Stop providing the field in the hook input entirely

**Symptom when broken**: `stop.ps1` produces a report with 0 findings and no error. The session conversation may contain correct findings that are simply never persisted.

**Mitigation added (2026-03-12)**: `stop.ps1` now emits an explicit `transcript_path was not provided` / `transcript appears empty or unusually short` warning in the report and system message rather than silently producing a 0-finding report.

### 2 — Long conversation truncation

VS Code may not flush the entire conversation to the transcript file before the Stop hook runs, or may cap transcript length. Findings emitted early in a very long scan session (e.g., cross-repo scan of 20+ repos) may be absent from the transcript.

**Symptom**: Disk report has fewer findings than the agent mentioned in conversation.

**No current mitigation.** If this is observed, the workaround is to keep scan sessions shorter (one repo at a time).

### 3 — Malformed JSON in a FINDING marker

If the agent emits a syntactically invalid JSON payload inside a `<!-- FINDING: ... -->` marker (e.g., unescaped double-quotes in an explanation), the `ConvertFrom-Json` call silently catches and skips that marker.

`stop.ps1` currently does:
```powershell
try {
    $finding = $m.Groups[1].Value | ConvertFrom-Json
    $findings += $finding
}
catch { <# skip malformed markers #> }
```

**Symptom**: One or more findings present in conversation do not appear in the disk report.

**No current mitigation.** The agent's Reporting Protocol section in `test-theater.agent.md` instructs it to use JSON-safe strings.

## Maintenance Guidance

If the Stop hook begins producing empty reports after a VS Code update:

1. Check that `transcript_path` is being provided: add `Write-Host "transcript_path: $transcriptPath"` temporarily to the top of `stop.ps1`.
2. If the path is provided, inspect the file content to see whether the FINDING markers are present.
3. If the schema changed (e.g., message text is now in a different field), update the marker extraction regex and the field access in `stop.ps1`.
4. If the path is no longer provided at all, the hook architecture needs to be redesigned to use a different persistence mechanism (e.g., a sidecar file written by the agent during the session).
