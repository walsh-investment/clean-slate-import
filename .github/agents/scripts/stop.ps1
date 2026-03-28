# stop.ps1 — Test Theater Agent Stop Hook
# Triggered when the agent session ends. Reads the session transcript,
# extracts structured finding markers, and generates a scan report per
# contracts/hook-interface.md and contracts/report-interface.md.

param()

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

# --- Read hook input from stdin ---
$inputJson = $null
try {
    $rawInput = [Console]::In.ReadToEnd()
    if ($rawInput -and $rawInput.Trim() -ne '') {
        $inputJson = $rawInput | ConvertFrom-Json
    }
}
catch {
    # Non-blocking: if we can't read input, produce minimal output
}

$cwd          = if ($inputJson -and $inputJson.PSObject.Properties['cwd'])          { $inputJson.cwd }          else { Get-Location }
$transcriptPath = if ($inputJson -and $inputJson.PSObject.Properties['transcript_path']) { $inputJson.transcript_path } else { $null }
$timestamp    = Get-Date -Format 'yyyy-MM-ddTHH-mm-ss'
$agentVersion = '1.0.0'

# --- Helper: emit JSON result and exit ---
function Send-Result {
    param([bool]$Continue = $true, [string]$Message = '', [string]$StopReason = '')
    $result = @{ 'continue' = $Continue; 'systemMessage' = $Message }
    if ($StopReason) { $result['stopReason'] = $StopReason }
    $result | ConvertTo-Json -Compress | Write-Output
    exit 0
}

# --- Attempt to read transcript ---
$transcriptContent = ''
if ($transcriptPath -and (Test-Path $transcriptPath)) {
    try { $transcriptContent = Get-Content -Path $transcriptPath -Raw -Encoding UTF8 }
    catch { $transcriptContent = '' }
}

# --- Detect unreliable transcript scenarios (TD-002) ---
# The transcript is an internal VS Code artifact. Warn explicitly rather than silently
# producing a 0-finding report. See references/transcript-parsing-notes.md for context.
$transcriptWarning = $null
if (-not $transcriptPath) {
    $transcriptWarning = 'transcript_path was not provided by the hook runtime — finding markers could not be parsed. If the agent ran a scan, the report may show 0 findings incorrectly.'
} elseif (-not (Test-Path $transcriptPath)) {
    $transcriptWarning = "transcript not found at: $transcriptPath -- finding markers could not be parsed. If the agent ran a scan, the report may show 0 findings incorrectly."
} elseif (-not $transcriptContent -or $transcriptContent.Length -lt 200) {
    $transcriptWarning = "transcript at '$transcriptPath' appears empty or unusually short ($($transcriptContent.Length) bytes) -- report accuracy cannot be confirmed."
}

# --- Extract structured finding markers ---
# Format: <!-- FINDING: {"file_path":"...","line_start":N,"line_end":N,"pattern_id":"...","severity":"...","explanation":"...","status":"open"} -->
$findings = @()
if ($transcriptContent) {
    $markerPattern = '<!--\s*FINDING:\s*(\{[^}]+\})\s*-->'
    $matches = [regex]::Matches($transcriptContent, $markerPattern)
    foreach ($m in $matches) {
        try {
            $finding = $m.Groups[1].Value | ConvertFrom-Json
            $findings += $finding
        }
        catch { <# skip malformed markers #> }
    }
}

# --- Extract SCAN_COMPLETE markers for file counts ---
# Format: <!-- SCAN_COMPLETE: {"repo":"...","files_scanned":N,"files_skipped":M} -->
$scanCompletions = @{}
if ($transcriptContent) {
    $scPattern = '<!--\s*SCAN_COMPLETE:\s*(\{[^}]+\})\s*-->'
    $scMatches = [regex]::Matches($transcriptContent, $scPattern)
    foreach ($m in $scMatches) {
        try {
            $sc = $m.Groups[1].Value | ConvertFrom-Json
            $repoKey = if ($sc.PSObject.Properties['repo'] -and $sc.repo -ne '.') { $sc.repo } else { $cwd }
            $scanCompletions[$repoKey] = $sc
        }
        catch { <# skip malformed markers #> }
    }
}


$sessionInvolvedScan = $false
if ($findings.Count -eq 0 -and $transcriptContent) {
    $scanKeywords = 'test theater', 'tautological', 'over-mocked', 'empty-test', 'commented-out', 'exception-suppression'
    foreach ($kw in $scanKeywords) {
        if ($transcriptContent -match [regex]::Escape($kw)) {
            $sessionInvolvedScan = $true
            break
        }
    }
}

# --- If nothing to report, exit gracefully (non-blocking) ---
if ($findings.Count -eq 0 -and -not $sessionInvolvedScan) {
    $warnSuffix = if ($transcriptWarning) { " Note: $transcriptWarning" } else { '' }
    Send-Result -Continue $true -Message "No test theater scan detected this session. No report generated.$warnSuffix"
}

# --- Group findings by repository (inferred from file paths) ---
# For single-repo sessions, all findings share a common root = $cwd
# Determine repositories scanned by looking at file path roots

$repoGroups = @{}
foreach ($f in $findings) {
    # Derive repo root: use first 2 path segments if absolute, else $cwd
    $repoKey = $cwd
    if ($f.PSObject.Properties['repo_path']) {
        $repoKey = $f.repo_path
    }
    if (-not $repoGroups.ContainsKey($repoKey)) {
        $repoGroups[$repoKey] = @()
    }
    $repoGroups[$repoKey] += $f
}

# If no repo grouping found, put all findings under $cwd
if ($repoGroups.Count -eq 0 -and ($findings.Count -gt 0 -or $sessionInvolvedScan)) {
    $repoGroups[$cwd] = $findings
}

$generatedReports = @()

foreach ($repoPath in $repoGroups.Keys) {
    $repoFindings = $repoGroups[$repoPath]
    $repoName = Split-Path $repoPath -Leaf

    # Sort findings: critical first, then warning, then info; then by file path
    $severityOrder = @{ 'critical' = 0; 'warning' = 1; 'info' = 2 }
    $sortedFindings = @($repoFindings | Sort-Object -Property @(
        { $severityOrder[($_.severity).ToLower()] },
        { $_.file_path }
    ))

    # Count by severity
    $critCount = @($sortedFindings | Where-Object { $_.severity -eq 'critical' }).Count
    $warnCount = @($sortedFindings | Where-Object { $_.severity -eq 'warning' }).Count
    $infoCount  = @($sortedFindings | Where-Object { $_.severity -eq 'info' }).Count

    # Find prior report for delta
    $reportsDir = Join-Path $repoPath '.test-theater\reports'
    $priorReport = $null
    $priorFindings = @()
    if (Test-Path $reportsDir) {
        $priorReportFile = Get-ChildItem -Path $reportsDir -Filter 'report-*.md' |
            Sort-Object Name -Descending |
            Select-Object -First 1
        if ($priorReportFile) {
            $priorReport = $priorReportFile.Name
            # Extract findings from prior report via markers
            $priorContent = Get-Content $priorReportFile.FullName -Raw -Encoding UTF8
            $priorMatches = [regex]::Matches($priorContent, $markerPattern)
            foreach ($pm in $priorMatches) {
                try { $priorFindings += ($pm.Groups[1].Value | ConvertFrom-Json) } catch {}
            }
        }
    }

    # Compute delta
    $newFindings       = @()
    $resolvedFindings  = @()
    $persistingFindings = @()
    if ($priorReport) {
        foreach ($f in $sortedFindings) {
            $matched = $priorFindings | Where-Object {
                $_.file_path -eq $f.file_path -and
                $_.line_start -eq $f.line_start -and
                $_.pattern_id -eq $f.pattern_id
            }
            if ($matched) { $persistingFindings += $f } else { $newFindings += $f }
        }
        foreach ($pf in $priorFindings) {
            $stillPresent = $sortedFindings | Where-Object {
                $_.file_path -eq $pf.file_path -and
                $_.line_start -eq $pf.line_start -and
                $_.pattern_id -eq $pf.pattern_id
            }
            if (-not $stillPresent) { $resolvedFindings += $pf }
        }
    }

    # --- Build report markdown ---
    $lines = [System.Collections.Generic.List[string]]::new()
    $lines.Add("# Test Theater Scan Report")
    $lines.Add("")
    $lines.Add("**Repository**: $repoName")
    $lines.Add("**Scanned**: $(Get-Date -Format 'yyyy-MM-ddTHH:mm:ssZ')")
    $lines.Add("**Agent version**: $agentVersion")
    $scInfo = if ($scanCompletions.ContainsKey($repoPath)) { $scanCompletions[$repoPath] } else { $null }
    $filesScanned = if ($scInfo) { $scInfo.files_scanned } else { '(see session log)' }
    $filesSkipped = if ($scInfo) { $scInfo.files_skipped } else { '(see session log)' }
    $lines.Add("**Files scanned**: $filesScanned")
    $lines.Add("**Files skipped**: $filesSkipped")
    $lines.Add("")
    $lines.Add("## Executive Summary")
    $lines.Add("")
    $lines.Add("- **Total findings**: $($sortedFindings.Count)")
    $lines.Add("- **Critical**: $critCount")
    $lines.Add("- **Warning**: $warnCount")
    $lines.Add("- **Info**: $infoCount")
    if ($sortedFindings.Count -gt 0) {
        $patternNames = ($sortedFindings | Select-Object -ExpandProperty pattern_id -Unique) -join ', '
        $lines.Add("- **Patterns detected**: $patternNames")
    }
    $lines.Add("")

    # Findings section
    $lines.Add("## Findings")
    $lines.Add("")
    if ($sortedFindings.Count -eq 0) {
        if ($transcriptWarning) {
            $lines.Add("> **WARNING:** $transcriptWarning")
            $lines.Add("")
        }
        $lines.Add("No test theater findings detected in this session.")
    }
    else {
        foreach ($f in $sortedFindings) {
            $sevLabel = $f.severity.ToUpper()
            $patId    = $f.pattern_id
            $filePath = $f.file_path
            $lineRef  = "$($f.line_start)"
            if ($f.line_end -ne $f.line_start) { $lineRef = "$($f.line_start)-$($f.line_end)" }

            # Re-emit finding marker so delta in future scans can parse it
            $markerJson = $f | ConvertTo-Json -Compress
            $lines.Add("### [$sevLabel] $patId - ${filePath}:$($f.line_start)")
            $lines.Add("")
            $lines.Add("**Pattern**: $patId")
            $lines.Add("**Lines**: $lineRef")
            $expText = if ($f.PSObject.Properties['explanation']) { $f.explanation } else { '(no explanation recorded)' }
            $lines.Add("**Explanation**: $expText")
            $lines.Add("**Status**: open")
            $lines.Add("")
            $recAction = if ($f.PSObject.Properties['recommended_action']) { $f.recommended_action } else { 'See pattern library for remediation guidance.' }
            $lines.Add("**Recommended action**: $recAction")
            $lines.Add("")
            $lines.Add("<!-- FINDING: $markerJson -->")
            $lines.Add("")
            $lines.Add("---")
            $lines.Add("")
        }
    }

    # Action checklist
    $lines.Add("## Action Checklist")
    $lines.Add("")
    if ($sortedFindings.Count -eq 0) {
        $lines.Add("- No actions required.")
    }
    else {
        foreach ($f in $sortedFindings) {
            $sevLabel = $f.severity.ToUpper()
            $lines.Add("- [ ] [$sevLabel] $($f.file_path):$($f.line_start) - $($f.pattern_id)")
        }
    }
    $lines.Add("")

    # Delta section
    if ($priorReport) {
        $lines.Add("## Delta (compared to $priorReport)")
        $lines.Add("")
        $lines.Add("### New Findings ($($newFindings.Count))")
        if ($newFindings.Count -gt 0) {
            foreach ($f in $newFindings) {
                $lines.Add("- $($f.file_path):$($f.line_start) - $($f.pattern_id)")
            }
        } else { $lines.Add("None.") }
        $lines.Add("")
        $lines.Add("### Resolved Findings ($($resolvedFindings.Count))")
        if ($resolvedFindings.Count -gt 0) {
            foreach ($f in $resolvedFindings) {
                $lines.Add("- $($f.file_path):$($f.line_start) - $($f.pattern_id)")
            }
        } else { $lines.Add("None.") }
        $lines.Add("")
        $lines.Add("### Persisting Findings ($($persistingFindings.Count))")
        if ($persistingFindings.Count -gt 0) {
            foreach ($f in $persistingFindings) {
                $lines.Add("- $($f.file_path):$($f.line_start) - $($f.pattern_id)")
            }
        } else { $lines.Add("None.") }
        $lines.Add("")
    }

    # Write report file
    $null = New-Item -ItemType Directory -Force -Path $reportsDir
    $reportFileName = "report-$timestamp.md"
    $reportFilePath = Join-Path $reportsDir $reportFileName
    $lines | Out-File -FilePath $reportFilePath -Encoding UTF8
    $generatedReports += $reportFilePath
}

# --- Build system message ---
if ($generatedReports.Count -eq 0) {
    Send-Result -Continue $true -Message "No findings recorded. No report generated for this session."
}

# --- Generate cross-repo aggregate report if multiple repos were scanned ---
if ($repoGroups.Count -gt 1) {
    $aggLines = [System.Collections.Generic.List[string]]::new()
    $aggLines.Add("# Cross-Repository Test Theater Summary")
    $aggLines.Add("")
    $aggLines.Add("**Scanned**: $(Get-Date -Format 'yyyy-MM-ddTHH:mm:ssZ')")
    $aggLines.Add("**Repositories**: $($repoGroups.Count)")
    $aggLines.Add("")
    $aggLines.Add("## Cross-Repository Summary")
    $aggLines.Add("")
    $aggLines.Add("| Repository | Files Scanned | Findings | Critical | Warning | Info |")
    $aggLines.Add("|------------|---------------|----------|----------|---------|------|")

    $aggTotal = 0; $aggCrit = 0; $aggWarn = 0; $aggInfo = 0; $aggFiles = 0
    foreach ($rp in $repoGroups.Keys) {
        $rf = $repoGroups[$rp]
        $rName = Split-Path $rp -Leaf
        $rTotal = $rf.Count
        $rCrit  = ($rf | Where-Object { $_.severity -eq 'critical' }).Count
        $rWarn  = ($rf | Where-Object { $_.severity -eq 'warning' }).Count
        $rInfo  = ($rf | Where-Object { $_.severity -eq 'info' }).Count
        $rScanned = if ($scanCompletions.ContainsKey($rp)) { $scanCompletions[$rp].files_scanned } else { '-' }
        $aggLines.Add("| $rName | $rScanned | $rTotal | $rCrit | $rWarn | $rInfo |")
        $aggTotal += $rTotal; $aggCrit += $rCrit; $aggWarn += $rWarn; $aggInfo += $rInfo
        if ($rScanned -ne '-') { $aggFiles += [int]$rScanned }
    }
    $aggFilesDisplay = if ($aggFiles -gt 0) { "$aggFiles" } else { '-' }
    $aggLines.Add("| **Total** | **$aggFilesDisplay** | **$aggTotal** | **$aggCrit** | **$aggWarn** | **$aggInfo** |")
    $aggLines.Add("")
    $aggLines.Add("## Individual Reports")
    $aggLines.Add("")
    foreach ($rpt in $generatedReports) {
        $aggLines.Add("- $rpt")
    }

    # Write aggregate to first repo's reports dir (or cwd if mixed)
    $aggDir  = Join-Path $cwd '.test-theater\reports'
    $null    = New-Item -ItemType Directory -Force -Path $aggDir
    $aggPath = Join-Path $aggDir "cross-repo-summary-$timestamp.md"
    $aggLines | Out-File -FilePath $aggPath -Encoding UTF8
    $generatedReports += $aggPath
}

$reportList = $generatedReports -join "`n  - "
$totalFindings = ($repoGroups.Values | ForEach-Object { $_.Count } | Measure-Object -Sum).Sum

$warnSection = if ($transcriptWarning) { "`n`n**Transcript warning:** $transcriptWarning" } else { '' }
$msg = @"
## Session Report Generated
- Reports: $($generatedReports.Count)
  - $reportList
- Total findings: $totalFindings

Review the report(s) in each repository's .test-theater/reports/ directory.$warnSection
"@

Send-Result -Continue $true -Message $msg
