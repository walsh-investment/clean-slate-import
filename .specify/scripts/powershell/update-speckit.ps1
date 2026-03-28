#!/usr/bin/env pwsh
# Update speckit core files from canonical source
# Implements FR-015: copy-and-merge update workflow
# Does NOT depend on `specify` CLI subcommands

[CmdletBinding()]
param(
    [switch]$Apply,
    [string]$Source,
    [string]$ManagedRoot,
    # Override the consumer repo for single-repo mode — lets you run from anywhere
    [string]$TargetRepo,
    # Caller signals the repo is archived (GitHub API or fleet manager) — emit skipped summary and exit
    [switch]$Archived,
    # Caller signals the repo is inaccessible — emit skipped summary and exit
    [switch]$Inaccessible,
    [switch]$Help
)

$ErrorActionPreference = 'Stop'

# ---------------------------------------------------------------------------
# Early exit: archived / inaccessible repos (reason codes per rollout-execution.md)
# ---------------------------------------------------------------------------
if ($Archived -or $Inaccessible) {
    $reasonCode = if ($Archived) { 'archived' } else { 'inaccessible_repo' }
    $earlySkip  = [PSCustomObject]@{
        repoPath     = (Get-Location).Path
        status       = 'skipped'
        reasonCode   = $reasonCode
        message      = "Repo is $reasonCode — verify rollout skipped"
        updatedFiles = @()
        timestamp    = (Get-Date -Format 'yyyy-MM-ddTHH:mm:ssZ')
    }
    Write-Output "=== Per-Repo Rollout Summary ==="
    $earlySkip | ConvertTo-Json -Depth 3
    exit 0
}

# ---------------------------------------------------------------------------
# Help text
# ---------------------------------------------------------------------------
if ($Help) {
    Write-Output @"
update-speckit.ps1 — Update speckit core files from a canonical source

USAGE
    .\update-speckit.ps1                                     Check mode (dry-run) for this repo
    .\update-speckit.ps1 -Apply                              Apply updates to this repo
    .\update-speckit.ps1 -TargetRepo <path>                  Check mode for a specific repo
    .\update-speckit.ps1 -TargetRepo <path> -Apply           Apply updates to a specific repo
    .\update-speckit.ps1 -Source <path>                      Override canonical source path
    .\update-speckit.ps1 -ManagedRoot <path>                 Fleet check mode (scan all repos)
    .\update-speckit.ps1 -ManagedRoot <path> -Apply          Fleet apply mode (update all repos)
    .\update-speckit.ps1 -Help                               Show this help

SOURCE RESOLUTION ORDER
    1. -Source parameter
    2. `$env:SPECKIT_CANONICAL_SOURCE environment variable
    3. .specify/config.json  → canonicalSource field
    4. Error if none found

FLEET MODE (-ManagedRoot)
    Scans immediate subdirectories of <ManagedRoot> for eligible repos.
    Check mode: reports version drift and eligibility status.
    Apply mode: updates existing repos and bootstraps uninitialized repos.

MARKER-AWARE MERGE
    Files containing <!-- REPO CONTEXT START --> / <!-- REPO CONTEXT END -->
    blocks will have content outside the markers replaced from the canonical
    source while preserving the content inside the markers.
"@
    exit 0
}

# ---------------------------------------------------------------------------
# Resolve repository root (reuse common.ps1 pattern)
# ---------------------------------------------------------------------------
$ScriptDir = $PSScriptRoot
$RepoRoot  = (Resolve-Path (Join-Path $ScriptDir "..\..\..")).Path
$SpecifyDir = Join-Path $RepoRoot ".specify"

# ---------------------------------------------------------------------------
# 1. Resolve canonical source path
# ---------------------------------------------------------------------------
function Resolve-CanonicalSource {
    # Priority 1: -Source parameter
    if ($Source) {
        if (-not (Test-Path $Source -PathType Container)) {
            Write-Error "Canonical source directory not found: $Source"
        }
        return (Resolve-Path $Source).Path
    }

    # Priority 2: Environment variable
    if ($env:SPECKIT_CANONICAL_SOURCE) {
        if (-not (Test-Path $env:SPECKIT_CANONICAL_SOURCE -PathType Container)) {
            Write-Error "SPECKIT_CANONICAL_SOURCE directory not found: $env:SPECKIT_CANONICAL_SOURCE"
        }
        return (Resolve-Path $env:SPECKIT_CANONICAL_SOURCE).Path
    }

    # Priority 3: .specify/config.json → canonicalSource
    $configPath = Join-Path $SpecifyDir "config.json"
    if (Test-Path $configPath -PathType Leaf) {
        $config = Get-Content -Raw $configPath | ConvertFrom-Json
        if ($config.canonicalSource) {
            $resolved = $config.canonicalSource
            # Support relative paths (relative to repo root)
            if (-not [System.IO.Path]::IsPathRooted($resolved)) {
                $resolved = Join-Path $RepoRoot $resolved
            }
            if (-not (Test-Path $resolved -PathType Container)) {
                Write-Error "canonicalSource from config.json not found: $resolved"
            }
            return (Resolve-Path $resolved).Path
        }
    }

    Write-Error @"
Cannot resolve canonical source directory.
Provide one of:
  -Source <path>                          parameter
  `$env:SPECKIT_CANONICAL_SOURCE          environment variable
  .specify/config.json → canonicalSource  config field
"@
}

$CanonicalSource = Resolve-CanonicalSource

# ---------------------------------------------------------------------------
# 2. Parse .specify/version manifest
# ---------------------------------------------------------------------------
function Read-VersionManifest {
    param([string]$VersionFilePath)
    if (-not $VersionFilePath) {
        $VersionFilePath = Join-Path $SpecifyDir "version"
    }
    if (-not (Test-Path $VersionFilePath -PathType Leaf)) {
        Write-Error ".specify/version file not found at $VersionFilePath"
    }

    $lines = Get-Content $VersionFilePath
    $manifest = @{}

    foreach ($line in $lines) {
        # Skip header lines, comments, and blank lines
        if ($line -match '^\s*$' -or $line -match '^#' -or $line -match '^version:' -or $line -match '^generated:') {
            continue
        }
        # Parse "relativePath: sha256hash"
        if ($line -match '^(.+?):\s+([0-9a-fA-F]{64})\s*$') {
            $manifest[$matches[1].Trim()] = $matches[2].Trim()
        }
    }

    return $manifest
}

$Manifest = Read-VersionManifest
if ($Manifest.Count -eq 0) {
    Write-Error "No files found in .specify/version manifest."
}

# ---------------------------------------------------------------------------
# 3. Compute file hash helper
# ---------------------------------------------------------------------------
function Get-FileSHA256 {
    param([string]$Path)
    if (-not (Test-Path $Path -PathType Leaf)) {
        return $null
    }
    return (Get-FileHash -Path $Path -Algorithm SHA256).Hash.ToLower()
}

# ---------------------------------------------------------------------------
# 4. Check for REPO CONTEXT markers in a file
# ---------------------------------------------------------------------------
$MarkerStart = '<!-- REPO CONTEXT START -->'
$MarkerEnd   = '<!-- REPO CONTEXT END -->'

function Test-HasMarkers {
    param([string]$Path)
    if (-not (Test-Path $Path -PathType Leaf)) {
        return $false
    }
    $content = Get-Content -Raw $Path
    return ($content -match [regex]::Escape($MarkerStart)) -and ($content -match [regex]::Escape($MarkerEnd))
}

# ---------------------------------------------------------------------------
# 5. Extract all marker blocks from a file (returns array of strings)
# ---------------------------------------------------------------------------
function Get-MarkerBlocks {
    param([string]$Path)
    $content = Get-Content -Raw $Path
    $blocks = @()
    $pattern = "(?s)($([regex]::Escape($MarkerStart)).*?$([regex]::Escape($MarkerEnd)))"
    $matchCollection = [regex]::Matches($content, $pattern)
    foreach ($m in $matchCollection) {
        $blocks += $m.Value
    }
    return $blocks
}

# ---------------------------------------------------------------------------
# 6. Marker-aware merge: replace content outside markers from source,
#    preserve content inside markers from local file
# ---------------------------------------------------------------------------
function Merge-WithMarkers {
    param(
        [string]$LocalPath,
        [string]$SourcePath
    )

    $sourceContent = Get-Content -Raw $SourcePath

    # Extract marker blocks from LOCAL file (these are repo-specific)
    $localBlocks = Get-MarkerBlocks -Path $LocalPath

    # Start with source content as the base
    $merged = $sourceContent

    # Check if source also has marker blocks
    $sourceBlocks = Get-MarkerBlocks -Path $SourcePath

    if ($sourceBlocks.Count -gt 0 -and $localBlocks.Count -gt 0) {
        # Replace each source marker block with the corresponding local block
        # Match by position (1st source block ↔ 1st local block, etc.)
        $count = [Math]::Min($sourceBlocks.Count, $localBlocks.Count)
        for ($i = 0; $i -lt $count; $i++) {
            # Use index-based replacement to avoid replacing ALL occurrences
            $idx = $merged.IndexOf($sourceBlocks[$i])
            if ($idx -ge 0) {
                $merged = $merged.Remove($idx, $sourceBlocks[$i].Length).Insert($idx, $localBlocks[$i])
            }
        }
    }
    elseif ($localBlocks.Count -gt 0 -and $sourceBlocks.Count -eq 0) {
        # Source has no markers but local does — append local marker blocks at
        # the same relative positions. As a fallback, inject all local blocks
        # at the end of the merged content.
        Write-Warning "  Source file has no marker blocks; appending local marker content at end."
        foreach ($block in $localBlocks) {
            $merged += "`n`n$block`n"
        }
    }

    return $merged
}

# ---------------------------------------------------------------------------
# 7. Regenerate .specify/version with updated checksums
# ---------------------------------------------------------------------------
function Update-VersionManifest {
    param(
        [hashtable]$Manifest,
        [string]$VersionFilePath,
        [string]$BaseRepoRoot
    )

    if (-not $VersionFilePath) {
        $VersionFilePath = Join-Path $SpecifyDir "version"
    }
    if (-not $BaseRepoRoot) {
        $BaseRepoRoot = $RepoRoot
    }
    $versionFile = $VersionFilePath

    # Read existing header lines (version, generated, comments before manifest)
    $lines = Get-Content $versionFile
    $headerLines = @()
    foreach ($line in $lines) {
        if ($line -match '^version:') {
            $headerLines += $line
        }
        elseif ($line -match '^generated:') {
            # Update the generated date
            $headerLines += "generated: $(Get-Date -Format 'yyyy-MM-dd')"
        }
        elseif ($line -match '^#' -or $line -match '^\s*$') {
            $headerLines += $line
        }
        else {
            break
        }
    }

    # Build new manifest lines with updated hashes
    $manifestLines = @()
    foreach ($relPath in ($Manifest.Keys | Sort-Object)) {
        $fullPath = Join-Path $BaseRepoRoot $relPath
        $hash = Get-FileSHA256 -Path $fullPath
        if ($hash) {
            $manifestLines += "${relPath}: $hash"
        }
        else {
            # File missing locally — keep original hash with a comment
            $manifestLines += "${relPath}: $($Manifest[$relPath])"
        }
    }

    $output = ($headerLines -join "`n") + "`n" + ($manifestLines -join "`n") + "`n"
    Set-Content -Path $versionFile -Value $output -NoNewline -Encoding UTF8
}

# ---------------------------------------------------------------------------
# 8. Read version string from a version file
# ---------------------------------------------------------------------------
function Read-VersionString {
    param([string]$VersionFilePath)
    if (-not (Test-Path $VersionFilePath -PathType Leaf)) {
        return $null
    }
    foreach ($line in (Get-Content $VersionFilePath)) {
        if ($line -match '^version:\s*(.+)$') {
            return $matches[1].Trim()
        }
    }
    return $null
}

# ---------------------------------------------------------------------------
# 8b. Test-SelfParity: verify canonical source files match version manifest (FR-004)
#     Returns: hashtable with status, drift_count, drift_files
# ---------------------------------------------------------------------------
function Test-SelfParity {
    param([string]$CanonicalPath)

    $versionFile = Join-Path $CanonicalPath ".specify" "version"
    if (-not (Test-Path $versionFile -PathType Leaf)) {
        return @{
            status      = 'error'
            drift_count = 0
            drift_files = @()
            message     = 'No .specify/version manifest found'
        }
    }

    $manifest = Read-VersionManifest -VersionFilePath $versionFile
    $driftFiles = @()

    foreach ($relPath in $manifest.Keys) {
        $fullPath = Join-Path $CanonicalPath $relPath
        $expectedHash = $manifest[$relPath]

        if (-not (Test-Path $fullPath -PathType Leaf)) {
            $driftFiles += @{ path = $relPath; reason = 'missing' }
            continue
        }

        $actualHash = Get-FileSHA256 -Path $fullPath
        if ($actualHash -ne $expectedHash) {
            $driftFiles += @{ path = $relPath; reason = 'hash_mismatch' }
        }
    }

    $status = if ($driftFiles.Count -eq 0) { 'consistent' } else { 'drift_detected' }

    return @{
        status      = $status
        drift_count = $driftFiles.Count
        drift_files = $driftFiles
        message     = if ($driftFiles.Count -eq 0) { 'All managed files match version manifest' } else { "$($driftFiles.Count) file(s) differ from version manifest" }
    }
}

# ---------------------------------------------------------------------------
# 9. Find-EligibleRepos: scan managed root for fleet candidates
#    Returns: array of hashtables with path, eligible (bool), skip_reason
#    Per update-workflow.md Fleet Discovery Contract
# ---------------------------------------------------------------------------
function Find-EligibleRepos {
    param(
        [string]$ManagedRootPath,
        [string]$CanonicalSourcePath,
        [bool]$ApplyMode
    )

    if (-not (Test-Path $ManagedRootPath -PathType Container)) {
        Write-Error "Managed root path not found: $ManagedRootPath"
    }

    $resolvedManagedRoot = (Resolve-Path $ManagedRootPath).Path
    $resolvedCanonical   = (Resolve-Path $CanonicalSourcePath).Path

    $discoveredRepos = @()

    # Scan immediate subdirectories only (depth 1)
    $subdirs = Get-ChildItem -Path $resolvedManagedRoot -Directory -ErrorAction SilentlyContinue

    foreach ($dir in $subdirs) {
        $dirPath = $dir.FullName

        # Self-detection: canonical source is under managed root (FR-004)
        # Record with skip_reason 'self' and run parity check
        if ($dirPath -eq $resolvedCanonical) {
            $parityResult = Test-SelfParity -CanonicalPath $dirPath
            $discoveredRepos += @{
                path         = $dirPath
                eligible     = $false
                skip_reason  = 'self'
                parity_check = $parityResult
            }
            continue
        }

        # Check for .speckit-skip marker file
        if (Test-Path (Join-Path $dirPath ".speckit-skip") -PathType Leaf) {
            $discoveredRepos += @{
                path        = $dirPath
                eligible    = $false
                skip_reason = 'skipped_by_marker'
            }
            continue
        }

        # Check accessibility (try to list contents)
        try {
            $null = Get-ChildItem -Path $dirPath -Force -ErrorAction Stop | Select-Object -First 1
        }
        catch {
            $discoveredRepos += @{
                path        = $dirPath
                eligible    = $false
                skip_reason = 'inaccessible_repo'
            }
            continue
        }

        # Must be a git repo
        $hasGit = Test-Path (Join-Path $dirPath ".git") -PathType Container
        if (-not $hasGit) {
            $discoveredRepos += @{
                path        = $dirPath
                eligible    = $false
                skip_reason = 'not_a_git_repo'
            }
            continue
        }

        # Check for .specify/ and .specify/version
        $hasSpecify = Test-Path (Join-Path $dirPath ".specify") -PathType Container
        $hasVersion = Test-Path (Join-Path $dirPath ".specify" "version") -PathType Leaf

        if ($hasSpecify -and $hasVersion) {
            # Existing speckit repo with version tracking — eligible for update
            $discoveredRepos += @{
                path        = $dirPath
                eligible    = $true
                skip_reason = $null
                action      = 'update'
            }
        }
        elseif ($hasSpecify) {
            # Has .specify/ but no version file (pre-version-tracking install) — bootstrap to upgrade
            if ($ApplyMode) {
                $discoveredRepos += @{
                    path        = $dirPath
                    eligible    = $true
                    skip_reason = $null
                    action      = 'bootstrap'
                }
            }
            else {
                # Check mode — report as missing version file
                $discoveredRepos += @{
                    path        = $dirPath
                    eligible    = $false
                    skip_reason = 'missing_version_file'
                }
            }
        }
        elseif ($ApplyMode) {
            # No .specify/ but apply mode — eligible for bootstrap
            $discoveredRepos += @{
                path        = $dirPath
                eligible    = $true
                skip_reason = $null
                action      = 'bootstrap'
            }
        }
        else {
            # No .specify/ in check mode — report as missing structure
            $discoveredRepos += @{
                path        = $dirPath
                eligible    = $false
                skip_reason = 'missing_speckit_structure'
            }
        }
    }

    return @($discoveredRepos)
}

# ---------------------------------------------------------------------------
# 10. Install-BootstrapSpeckit: initialize a consumer repo from canonical
#     Returns: RepoOutcome hashtable per data-model.md
#     Per update-workflow.md Bootstrap Onboarding Contract
# ---------------------------------------------------------------------------
function Install-BootstrapSpeckit {
    param(
        [string]$SourcePath,
        [string]$ConsumerPath,
        [hashtable]$SourceManifest
    )

    $consumerSpecifyDir  = Join-Path $ConsumerPath ".specify"
    $consumerVersionFile = Join-Path $consumerSpecifyDir "version"
    $filesInstalled = 0
    $warnings = @()

    # Install ALL core files from canonical manifest
    foreach ($relPath in ($SourceManifest.Keys | Sort-Object)) {
        $srcFile  = Join-Path $SourcePath $relPath
        $destFile = Join-Path $ConsumerPath $relPath

        if (-not (Test-Path $srcFile -PathType Leaf)) {
            $warnings += "Source file missing: $relPath"
            continue
        }

        # Ensure parent directory exists
        $parentDir = Split-Path $destFile -Parent
        if (-not (Test-Path $parentDir)) {
            New-Item -ItemType Directory -Path $parentDir -Force | Out-Null
        }

        # Marker-aware: if file exists with markers, preserve repo-specific content
        if ((Test-Path $destFile -PathType Leaf) -and (Test-HasMarkers -Path $destFile)) {
            $merged = Merge-WithMarkers -LocalPath $destFile -SourcePath $srcFile
            Set-Content -Path $destFile -Value $merged -NoNewline -Encoding UTF8
        }
        else {
            Copy-Item -Path $srcFile -Destination $destFile -Force
        }
        $filesInstalled++
    }

    # Create repo-specific placeholder files with markers (if missing)
    $placeholders = @{
        'specs/README.md' = @"
# Project Layout

<!-- REPO CONTEXT START -->
<!-- Add project-specific layout documentation here -->
<!-- REPO CONTEXT END -->

## Structure

- ``specs/`` — Feature specifications
- ``specs/intent/`` — Vision and roadmap
- ``specs/docs/`` — Architecture and reference docs
- ``.specify/`` — Speckit workflow configuration
- ``.github/`` — Agent and prompt files
"@
        'specs/intent/vision.md' = @"
# Vision

<!-- REPO CONTEXT START -->
<!-- Add project vision here -->
<!-- REPO CONTEXT END -->
"@
        'specs/intent/roadmap.md' = @"
# Roadmap

<!-- REPO CONTEXT START -->
<!-- Add project roadmap here -->
<!-- REPO CONTEXT END -->
"@
    }

    foreach ($entry in $placeholders.GetEnumerator()) {
        $destFile = Join-Path $ConsumerPath $entry.Key
        if (-not (Test-Path $destFile -PathType Leaf)) {
            $parentDir = Split-Path $destFile -Parent
            if (-not (Test-Path $parentDir)) {
                New-Item -ItemType Directory -Path $parentDir -Force | Out-Null
            }
            Set-Content -Path $destFile -Value $entry.Value -Encoding UTF8
            $filesInstalled++
        }
    }

    # Generate .specify/version with checksums of installed files
    $sourceVersionFile = Join-Path $SourcePath ".specify" "version"
    if (Test-Path $sourceVersionFile -PathType Leaf) {
        # Copy source version file as base, then regenerate with consumer checksums
        $parentDir = Split-Path $consumerVersionFile -Parent
        if (-not (Test-Path $parentDir)) {
            New-Item -ItemType Directory -Path $parentDir -Force | Out-Null
        }
        Copy-Item -Path $sourceVersionFile -Destination $consumerVersionFile -Force
        Update-VersionManifest -Manifest $SourceManifest -VersionFilePath $consumerVersionFile -BaseRepoRoot $ConsumerPath
    }

    # Configure git hooks (idempotent)
    $gitDir = Join-Path $ConsumerPath '.git'
    if (Test-Path $gitDir -PathType Container) {
        try {
            $null = & git -C $ConsumerPath config core.hooksPath .githooks 2>&1
            Write-Host "  Configured core.hooksPath = .githooks"
        } catch {
            $warnings += "Could not set core.hooksPath: $($_.Exception.Message)"
        }
    }

    # Read version_after
    $versionAfter = Read-VersionString -VersionFilePath $consumerVersionFile

    # Constitution-aware merge (T010): initialize constitution.md for new repo
    $constitutionProcessing = $null
    $globalConstitutionPath = Join-Path $SourcePath ".specify" "memory" "global-constitution.md"
    if (Test-Path $globalConstitutionPath -PathType Leaf) {
        $consumerConstitutionPath = Join-Path $ConsumerPath ".specify" "memory" "constitution.md"
        $constitutionProcessing = Merge-Constitution `
            -ConsumerConstitutionPath $consumerConstitutionPath `
            -GlobalConstitutionPath   $globalConstitutionPath `
            -ConsumerRepoPath         $ConsumerPath
        if ($constitutionProcessing.status -notin @('skipped','corrupt_warning','unchanged')) {
            $filesInstalled++
        }
    }
    else {
        Write-Warning "  global-constitution.md not found in canonical source — skipping constitution merge"
    }

    return @{
        repo_path               = $ConsumerPath
        version_before          = $null
        version_after           = $versionAfter
        status                  = 'bootstrapped'
        skip_reason             = $null
        error_detail            = $null
        verification_level      = $null
        verification_errors     = @()
        files_updated           = 0
        files_installed         = $filesInstalled
        warnings                = $warnings
        errors                  = @()
        constitutionProcessing  = $constitutionProcessing
        _diff_results           = @()
        _updated_files          = @()
    }
}

# ---------------------------------------------------------------------------
# 11. Update-SingleRepo: compare and optionally merge a single consumer repo
#     Returns: RepoOutcome hashtable per data-model.md
# ---------------------------------------------------------------------------
function Update-SingleRepo {
    param(
        [string]$SourcePath,
        [string]$ConsumerPath,
        [bool]$ApplyMode,
        [hashtable]$SourceManifest
    )

    $consumerSpecifyDir  = Join-Path $ConsumerPath ".specify"
    $consumerVersionFile = Join-Path $consumerSpecifyDir "version"

    # Read version_before
    $versionBefore = Read-VersionString -VersionFilePath $consumerVersionFile

    # Check eligibility: required directories
    $eligibilityDirs = @('.specify', '.github/prompts', '.github/agents', 'specs')
    $eligibilityMissing = $eligibilityDirs | Where-Object {
        -not (Test-Path (Join-Path $ConsumerPath $_) -PathType Container)
    }
    if ($eligibilityMissing.Count -gt 0) {
        $missingList = $eligibilityMissing -join ', '
        Write-Warning "Repo is not eligible for speckit update — missing: $missingList"
        return @{
            repo_path           = $ConsumerPath
            version_before      = $versionBefore
            version_after       = $null
            status              = 'skipped'
            skip_reason         = 'missing_speckit_structure'
            error_detail        = "Required directories missing: $missingList"
            verification_level  = $null
            verification_errors = @()
            files_updated       = 0
            files_installed     = 0
            warnings            = @()
            errors              = @()
            _diff_results       = @()
            _updated_files      = @()
        }
    }

    # Read consumer's manifest (for local-modification warnings)
    $consumerManifest = @{}
    if (Test-Path $consumerVersionFile -PathType Leaf) {
        $consumerManifest = Read-VersionManifest -VersionFilePath $consumerVersionFile
    }

    # Compare each source manifest entry against consumer
    $results       = @()
    $updatedCount  = 0
    $updatedFiles  = @()
    $outcomeWarnings = @()

    foreach ($entry in $SourceManifest.GetEnumerator()) {
        $relPath    = $entry.Key
        $localFile  = Join-Path $ConsumerPath $relPath
        $srcFile    = Join-Path $SourcePath $relPath

        $localHash  = Get-FileSHA256 -Path $localFile
        $sourceHash = Get-FileSHA256 -Path $srcFile
        $hasMarkers = Test-HasMarkers -Path $localFile
        $manifestHash = if ($consumerManifest.ContainsKey($relPath)) { $consumerManifest[$relPath] } else { $null }

        # Determine status
        if (-not $localHash) {
            $fileStatus = 'MISSING'
        }
        elseif (-not $sourceHash) {
            $fileStatus = 'NO-SRC'
        }
        elseif ($localHash -eq $sourceHash) {
            $fileStatus = 'MATCH'
        }
        else {
            $fileStatus = 'DIFFERS'
        }

        $results += [PSCustomObject]@{
            File      = $relPath
            LocalHash = if ($localHash)  { $localHash.Substring(0, 8)  } else { '--------' }
            SrcHash   = if ($sourceHash) { $sourceHash.Substring(0, 8) } else { '--------' }
            Status    = $fileStatus
            Markers   = if ($hasMarkers) { 'YES' } else { 'NO' }
        }

        # Apply mode: update files that differ
        if ($ApplyMode -and $fileStatus -eq 'DIFFERS' -and $sourceHash) {
            if ($hasMarkers) {
                Write-Host "  MERGE  $relPath (preserving marker content)"
                $merged = Merge-WithMarkers -LocalPath $localFile -SourcePath $srcFile
                Set-Content -Path $localFile -Value $merged -NoNewline -Encoding UTF8
            }
            else {
                if ($manifestHash -and $localHash -ne $manifestHash) {
                    $outcomeWarnings += "$relPath has local modifications — overwriting with source."
                    Write-Warning "  $relPath has local modifications — overwriting with source."
                }
                Write-Host "  COPY   $relPath"
                $parentDir = Split-Path $localFile -Parent
                if (-not (Test-Path $parentDir)) {
                    New-Item -ItemType Directory -Path $parentDir -Force | Out-Null
                }
                Copy-Item -Path $srcFile -Destination $localFile -Force
            }
            $updatedCount++
            $updatedFiles += $relPath
        }
        elseif ($ApplyMode -and $fileStatus -eq 'MISSING' -and $sourceHash) {
            Write-Host "  ADD    $relPath"
            $parentDir = Split-Path $localFile -Parent
            if (-not (Test-Path $parentDir)) {
                New-Item -ItemType Directory -Path $parentDir -Force | Out-Null
            }
            Copy-Item -Path $srcFile -Destination $localFile -Force
            $updatedCount++
            $updatedFiles += $relPath
        }
    }

    # Regenerate consumer's version manifest
    if ($ApplyMode -and $updatedCount -gt 0) {
        Write-Host "Regenerating .specify/version manifest..."
        Update-VersionManifest -Manifest $SourceManifest -VersionFilePath $consumerVersionFile -BaseRepoRoot $ConsumerPath
        Write-Host "Done."
    }

    # Ensure git hooks are configured (idempotent — safe to run on every apply)
    if ($ApplyMode) {
        $gitDir = Join-Path $ConsumerPath '.git'
        if (Test-Path $gitDir -PathType Container) {
            try {
                $null = & git -C $ConsumerPath config core.hooksPath .githooks 2>&1
                Write-Host "  Configured core.hooksPath = .githooks"
            } catch {
                $outcomeWarnings += "Could not set core.hooksPath: $($_.Exception.Message)"
            }
        }
    }

    # Read version_after
    $versionAfter = Read-VersionString -VersionFilePath $consumerVersionFile

    # Constitution-aware merge (T010): run after general manifest sync
    $constitutionProcessing = $null
    $globalConstitutionPath = Join-Path $SourcePath ".specify" "memory" "global-constitution.md"
    if (Test-Path $globalConstitutionPath -PathType Leaf) {
        $consumerConstitutionPath = Join-Path $ConsumerPath ".specify" "memory" "constitution.md"
        Write-Host "  CONSTITUTION  $(Split-Path $ConsumerPath -Leaf)"
        $constitutionProcessing = Merge-Constitution `
            -ConsumerConstitutionPath $consumerConstitutionPath `
            -GlobalConstitutionPath   $globalConstitutionPath `
            -ConsumerRepoPath         $ConsumerPath `
            -WhatIf:(-not $ApplyMode)
        if ($ApplyMode -and $constitutionProcessing.status -notin @('skipped','corrupt_warning','unchanged')) {
            $updatedCount++
            $updatedFiles += ".specify/memory/constitution.md"
        }
    }
    else {
        # T012: global-constitution.md missing in canonical source — warn and skip
        Write-Warning "  global-constitution.md not found in canonical source — skipping constitution merge"
    }

    # Determine outcome status
    $differCount   = ($results | Where-Object { $_.Status -eq 'DIFFERS' }).Count
    $missingFCount = ($results | Where-Object { $_.Status -eq 'MISSING' }).Count

    $outcomeStatus = if ($ApplyMode -and $updatedCount -gt 0) { 'updated' }
                     elseif ($differCount -eq 0 -and $missingFCount -eq 0) { 'unchanged' }
                     else { 'unchanged' }

    return @{
        repo_path               = $ConsumerPath
        version_before          = $versionBefore
        version_after           = $versionAfter
        status                  = $outcomeStatus
        skip_reason             = $null
        error_detail            = $null
        verification_level      = $null
        verification_errors     = @()
        files_updated           = $updatedCount
        files_installed         = 0
        warnings                = $outcomeWarnings
        errors                  = @()
        constitutionProcessing  = $constitutionProcessing
        _diff_results           = $results
        _updated_files          = $updatedFiles
    }
}

# ---------------------------------------------------------------------------
# 12. Test-PostUpdateVerification: 4-level progressive verification
#     Per rollout-execution.md Post-Update Verification Protocol
#     Constitution VI compliance: tests real behavior, not just artifacts
# ---------------------------------------------------------------------------
function Test-PostUpdateVerification {
    param(
        [string]$ConsumerPath,
        [hashtable]$SourceManifest
    )

    $verificationLevel  = 0
    $verificationErrors = @()
    $consumerSpecifyDir = Join-Path $ConsumerPath ".specify"

    # ---- Level 1: Artifact Existence ----
    # All core files from manifest exist
    foreach ($relPath in $SourceManifest.Keys) {
        $filePath = Join-Path $ConsumerPath $relPath
        if (-not (Test-Path $filePath -PathType Leaf)) {
            $verificationErrors += "VERIFICATION_FAILED:L1:MISSING_FILE:$relPath"
        }
    }

    # .specify/version readable and valid
    $versionFile = Join-Path $consumerSpecifyDir "version"
    if (-not (Test-Path $versionFile -PathType Leaf)) {
        $verificationErrors += "VERIFICATION_FAILED:L1:INVALID_VERSION:file_missing"
    }
    else {
        $versionStr = Read-VersionString -VersionFilePath $versionFile
        if (-not $versionStr) {
            $verificationErrors += "VERIFICATION_FAILED:L1:INVALID_VERSION:no_version_string"
        }
        $manifest = Read-VersionManifest -VersionFilePath $versionFile
        if ($manifest.Count -eq 0) {
            $verificationErrors += "VERIFICATION_FAILED:L1:INVALID_VERSION:empty_manifest"
        }
    }

    # Required directory structure
    $requiredDirs = @('.specify', '.github/prompts', '.github/agents', 'specs')
    foreach ($dir in $requiredDirs) {
        if (-not (Test-Path (Join-Path $ConsumerPath $dir) -PathType Container)) {
            $verificationErrors += "VERIFICATION_FAILED:L1:MISSING_DIR:$dir"
        }
    }

    if ($verificationErrors.Count -gt 0) {
        return @{ level = $verificationLevel; errors = $verificationErrors }
    }
    $verificationLevel = 1

    # ---- Level 2: Syntax/Format Validation ----
    # Markdown files in .github/prompts/ and .github/agents/ — check YAML frontmatter
    $mdDirs = @(
        (Join-Path $ConsumerPath ".github" "prompts"),
        (Join-Path $ConsumerPath ".github" "agents")
    )
    foreach ($mdDir in $mdDirs) {
        if (Test-Path $mdDir -PathType Container) {
            foreach ($mdFile in (Get-ChildItem -Path $mdDir -Filter "*.md" -File)) {
                $content = Get-Content -Raw $mdFile.FullName
                # Check for valid YAML frontmatter (starts with --- and closes with ---)
                if ($content -match '^---\r?\n') {
                    if ($content -notmatch '^---\r?\n[\s\S]*?\r?\n---') {
                        $verificationErrors += "VERIFICATION_FAILED:L2:INVALID_MD:$($mdFile.Name):unclosed_frontmatter"
                    }
                }
            }
        }
    }

    # PowerShell scripts — parse check
    $psDir = Join-Path $consumerSpecifyDir "scripts" "powershell"
    if (Test-Path $psDir -PathType Container) {
        foreach ($psFile in (Get-ChildItem -Path $psDir -Filter "*.ps1" -File)) {
            $parseErrors = $null
            [System.Management.Automation.Language.Parser]::ParseFile($psFile.FullName, [ref]$null, [ref]$parseErrors) | Out-Null
            if ($parseErrors -and $parseErrors.Count -gt 0) {
                $verificationErrors += "VERIFICATION_FAILED:L2:PS_SYNTAX:$($psFile.Name):$($parseErrors[0].Message)"
            }
        }
    }

    # REPO CONTEXT markers — properly paired
    foreach ($relPath in $SourceManifest.Keys) {
        $filePath = Join-Path $ConsumerPath $relPath
        if (Test-Path $filePath -PathType Leaf) {
            $content = Get-Content -Raw $filePath
            $startCount = ([regex]::Matches($content, [regex]::Escape($MarkerStart))).Count
            $endCount   = ([regex]::Matches($content, [regex]::Escape($MarkerEnd))).Count
            if ($startCount -ne $endCount) {
                $verificationErrors += "VERIFICATION_FAILED:L2:BAD_MARKERS:$relPath:start=$startCount,end=$endCount"
            }
        }
    }

    if ($verificationErrors.Count -gt 0) {
        return @{ level = $verificationLevel; errors = $verificationErrors }
    }
    $verificationLevel = 2

    # ---- Level 3: Real Command Smoke Test ----
    # Validates that speckit scripts are functional (loadable, parseable, produce output).
    # Repos on 'main' with no active feature are expected to fail check-prerequisites.ps1
    # with "Not on a feature branch" or "Feature directory not found" — this is NOT an error.
    $prereqScript = Join-Path $consumerSpecifyDir "scripts" "powershell" "check-prerequisites.ps1"
    if (Test-Path $prereqScript -PathType Leaf) {
        try {
            $savedLocation = Get-Location
            Set-Location $ConsumerPath
            $prereqOutput = & $prereqScript -Json 2>&1
            $prereqExitCode = $LASTEXITCODE
            Set-Location $savedLocation

            if ($prereqExitCode -ne 0) {
                # Capture output lines for classification
                $outputLines = @($prereqOutput | ForEach-Object { $_.ToString().Trim() }) -join "`n"

                # Expected failures: repo not on a feature branch or no matching spec dir
                $isExpectedFailure = (
                    $outputLines -match 'Not on a feature branch' -or
                    $outputLines -match 'Feature directory not found' -or
                    $outputLines -match 'Feature branches should be named'
                )

                if (-not $isExpectedFailure) {
                    # Real failure — script is broken
                    $stderrLines = @($prereqOutput | Where-Object {
                        ($_ -is [System.Management.Automation.ErrorRecord]) -or
                        ($_ -is [string] -and $_ -match '^(ERROR|FATAL):')
                    } | ForEach-Object { $_.ToString().Trim() } | Select-Object -First 3)
                    $detail = if ($stderrLines.Count -gt 0) { $stderrLines -join ' | ' } else { 'no error output captured' }
                    $verificationErrors += "VERIFICATION_FAILED:L3:PREREQ_FAIL:exit_code=${prereqExitCode}:${detail}"
                }
                # else: expected failure (no active feature) — script is functional, pass L3
            }
            else {
                # Verify valid JSON output
                $jsonText = ($prereqOutput | Where-Object { $_ -is [string] }) -join "`n"
                try {
                    $null = $jsonText | ConvertFrom-Json
                }
                catch {
                    $verificationErrors += "VERIFICATION_FAILED:L3:PREREQ_FAIL:invalid_json_output:check-prerequisites.ps1 returned exit 0 but output was not valid JSON"
                }
            }
        }
        catch {
            $verificationErrors += "VERIFICATION_FAILED:L3:PREREQ_FAIL:exception:$($_.Exception.Message)"
        }
    }
    else {
        $verificationErrors += "VERIFICATION_FAILED:L3:PREREQ_FAIL:script_not_found:expected at $prereqScript"
    }

    # Verify .specify/version matches canonical
    $consumerVersion  = Read-VersionString -VersionFilePath $versionFile
    $canonicalVersion = Read-VersionString -VersionFilePath (Join-Path $RepoRoot ".specify" "version")
    if ($consumerVersion -ne $canonicalVersion) {
        $verificationErrors += "VERIFICATION_FAILED:L3:VERSION_MISMATCH:consumer=$consumerVersion,canonical=$canonicalVersion"
    }

    if ($verificationErrors.Count -gt 0) {
        return @{ level = $verificationLevel; errors = $verificationErrors }
    }
    $verificationLevel = 3

    # ---- Level 4: Real Workflow Outcome Test ----
    # Constitution VI enforcement: prove the workflow actually functions end-to-end
    $createFeatureScript = Join-Path $consumerSpecifyDir "scripts" "powershell" "create-new-feature.ps1"
    $setupPlanScript     = Join-Path $consumerSpecifyDir "scripts" "powershell" "setup-plan.ps1"
    $testFeatureName     = "speckit-verify-test"
    $testFeatureDir      = $null

    if (Test-Path $createFeatureScript -PathType Leaf) {
        try {
            $savedLocation = Get-Location
            Set-Location $ConsumerPath

            # Step 1: Run create-new-feature.ps1
            $createOutput = & $createFeatureScript -Json -ShortName $testFeatureName -FeatureDescription "Speckit verification test" 2>&1
            $createExitCode = $LASTEXITCODE

            if ($createExitCode -ne 0) {
                $verificationErrors += "VERIFICATION_FAILED:L4:SETUP_FAIL:create_feature_exit=$createExitCode"
            }
            else {
                # Parse JSON output to find feature directory
                $jsonText = ($createOutput | Where-Object { $_ -is [string] }) -join "`n"
                try {
                    $createResult = $jsonText | ConvertFrom-Json
                    if ($createResult.FEATURE_DIR) {
                        $testFeatureDir = $createResult.FEATURE_DIR
                    }
                    elseif ($createResult.SPEC_FILE) {
                        $testFeatureDir = Split-Path $createResult.SPEC_FILE -Parent
                    }
                }
                catch {
                    # Fall back to finding the directory
                    $specsDir = Join-Path $ConsumerPath "specs"
                    $testFeatureDir = Get-ChildItem -Path $specsDir -Directory -Filter "*$testFeatureName*" |
                        Select-Object -First 1 -ExpandProperty FullName
                }

                if ($testFeatureDir -and (Test-Path $testFeatureDir -PathType Container)) {
                    # Step 2: Run setup-plan.ps1 (if available)
                    if (Test-Path $setupPlanScript -PathType Leaf) {
                        $planOutput = & $setupPlanScript -Json 2>&1
                        $planExitCode = $LASTEXITCODE

                        if ($planExitCode -ne 0) {
                            $verificationErrors += "VERIFICATION_FAILED:L4:PLAN_SETUP_FAIL:exit=$planExitCode"
                        }
                    }

                    # Step 3: Verify generated artifacts exist and are non-empty
                    $specFile = Join-Path $testFeatureDir "spec.md"
                    if (-not (Test-Path $specFile -PathType Leaf)) {
                        $verificationErrors += "VERIFICATION_FAILED:L4:ARTIFACT_INVALID:spec.md_missing"
                    }
                    elseif ((Get-Item $specFile).Length -eq 0) {
                        $verificationErrors += "VERIFICATION_FAILED:L4:ARTIFACT_INVALID:spec.md_empty"
                    }

                    # Step 4: Execute .specify/hooks/verify.ps1 if present
                    $hookScript = Join-Path $consumerSpecifyDir "hooks" "verify.ps1"
                    if (Test-Path $hookScript -PathType Leaf) {
                        $hookOutput = & $hookScript 2>&1
                        $hookExitCode = $LASTEXITCODE
                        if ($hookExitCode -ne 0) {
                            $verificationErrors += "VERIFICATION_FAILED:L4:HOOK_FAIL:exit=$hookExitCode"
                        }
                        $errorLines = $hookOutput | Where-Object { $_ -match '^ERROR:' }
                        if ($errorLines) {
                            $verificationErrors += "VERIFICATION_FAILED:L4:HOOK_FAIL:error_output"
                        }
                    }
                }
                else {
                    $verificationErrors += "VERIFICATION_FAILED:L4:SETUP_FAIL:feature_dir_not_created"
                }
            }

            Set-Location $savedLocation
        }
        catch {
            $verificationErrors += "VERIFICATION_FAILED:L4:SETUP_FAIL:$($_.Exception.Message)"
            try { Set-Location $savedLocation } catch {}
        }
        finally {
            # Step 5: Clean up test feature directory
            if ($testFeatureDir -and (Test-Path $testFeatureDir -PathType Container)) {
                try {
                    Remove-Item -Path $testFeatureDir -Recurse -Force -ErrorAction SilentlyContinue
                }
                catch {
                    Write-Warning "  Cleanup warning: could not remove test feature dir: $testFeatureDir"
                }
            }
        }
    }
    else {
        $verificationErrors += "VERIFICATION_FAILED:L4:SETUP_FAIL:create_feature_script_not_found"
    }

    if ($verificationErrors.Count -gt 0) {
        return @{ level = $verificationLevel; errors = $verificationErrors }
    }
    $verificationLevel = 4

    return @{ level = $verificationLevel; errors = @() }
}

# ---------------------------------------------------------------------------
# 12a. Format-VerificationMessage: human-readable, actionable verification output
# ---------------------------------------------------------------------------
function Format-VerificationMessage {
    param(
        [int]$Level,
        [string[]]$Errors,
        [string]$RepoName
    )

    $levelDescriptions = @{
        0 = 'Artifact Existence     (core files present, version file valid, directory structure)'
        1 = 'Syntax/Format          (YAML frontmatter, PowerShell parse, marker pairing)'
        2 = 'Command Smoke Test     (check-prerequisites.ps1 runs, version matches canonical)'
        3 = 'Workflow Outcome        (create-feature + setup-plan produce valid artifacts)'
    }

    $lines = @()
    $lines += "    Passed levels: $(if ($Level -gt 0) { (0..($Level - 1) | ForEach-Object { "L$($_ + 1)" }) -join ', ' } else { 'none' })"
    $lines += "    Failed at:     L$($Level + 1) - $($levelDescriptions[$Level])"
    $lines += "    Error count:   $($Errors.Count)"
    $lines += ''

    foreach ($err in $Errors) {
        # Parse structured error: VERIFICATION_FAILED:<level>:<code>:<detail>
        $parts = $err -split ':', 5
        $errLevel = if ($parts.Count -ge 2) { $parts[1] } else { '?' }
        $errCode  = if ($parts.Count -ge 3) { $parts[2] } else { '?' }
        $errDetail = if ($parts.Count -ge 4) { ($parts[3..($parts.Count - 1)] -join ':') } else { '' }

        $lines += "    [$errLevel] $errCode"

        # Actionable guidance per error type
        switch -Wildcard ($errCode) {
            'MISSING_FILE' {
                $lines += "           File not found: $errDetail"
                $lines += "           Fix: Re-run update-speckit.ps1 -Apply to sync missing files"
            }
            'MISSING_DIR' {
                $lines += "           Directory not found: $errDetail"
                $lines += "           Fix: Create the directory or re-run update-speckit.ps1 -Apply"
            }
            'INVALID_VERSION*' {
                $lines += "           Version file issue: $errDetail"
                $lines += "           Fix: Ensure .specify/version exists and contains valid version + manifest"
            }
            'INVALID_MD' {
                $lines += "           Markdown issue: $errDetail"
                $lines += "           Fix: Check YAML frontmatter has matching --- delimiters"
            }
            'PS_SYNTAX' {
                $lines += "           PowerShell parse error: $errDetail"
                $lines += "           Fix: Open the script in an editor and resolve syntax errors"
            }
            'BAD_MARKERS' {
                # errDetail format: "relPath:start=N,end=M"
                if ($errDetail -match '^(.+?):(start=\d+,end=\d+)$') {
                    $lines += "           File: $($Matches[1])"
                    $lines += "           Marker counts: $($Matches[2])"
                } else {
                    $lines += "           Detail: $errDetail"
                }
                $lines += "           Fix: Ensure each <!-- REPO CONTEXT START --> has a matching <!-- REPO CONTEXT END --> marker"
                $lines += "           Run: Select-String '<!-- REPO CONTEXT' <file> to find unbalanced markers"
            }
            'PREREQ_FAIL' {
                $lines += "           Prerequisite check failed: $errDetail"
                $lines += "           Common causes:"
                $lines += "             - Repo is not on a feature branch (check-prerequisites.ps1 requires an active feature)"
                $lines += "             - No spec directory found for the current branch"
                $lines += "           Note: This is expected for repos not actively developing a spec feature."
                $lines += "           The check validates that speckit commands CAN run, not that one is in progress."
            }
            'VERSION_MISMATCH' {
                $lines += "           Version drift: $errDetail"
                $lines += "           Fix: Re-run update-speckit.ps1 -Apply to update the consumer to canonical version"
            }
            'SETUP_FAIL' {
                $lines += "           Feature creation failed: $errDetail"
                $lines += "           Fix: Verify create-new-feature.ps1 exists and specs/ directory is writable"
            }
            'PLAN_SETUP_FAIL' {
                $lines += "           Plan setup failed: $errDetail"
                $lines += "           Fix: Verify setup-plan.ps1 exists and templates are intact"
            }
            'ARTIFACT_INVALID' {
                $lines += "           Generated artifact issue: $errDetail"
                $lines += "           Fix: Check template files in .specify/templates/"
            }
            'HOOK_FAIL' {
                $lines += "           Verify hook failed: $errDetail"
                $lines += "           Fix: Check .specify/hooks/verify.ps1 for errors"
            }
            default {
                $lines += "           Detail: $errDetail"
            }
        }
        $lines += ''
    }

    return $lines -join "`n"
}

# ---------------------------------------------------------------------------
# 13. Get-VersionDrift: compare consumer repo versions against canonical
#     Per data-model.md VersionDrift entity and rollout-execution.md
#     T043 (version drift), T046 (files_diverged detection)
# ---------------------------------------------------------------------------
function Get-VersionDrift {
    param(
        [string]$CanonicalSourcePath,
        [array]$RepoEntries,         # From Find-EligibleRepos (path, eligible, etc.)
        [hashtable]$SourceManifest
    )

    $canonicalVersionFile = Join-Path $CanonicalSourcePath ".specify" "version"
    $canonicalVersion = Read-VersionString -VersionFilePath $canonicalVersionFile

    $driftRecords = @()

    foreach ($repo in $RepoEntries) {
        if (-not $repo.eligible) { continue }

        $repoVersionFile = Join-Path $repo.path ".specify" "version"
        $currentVersion  = Read-VersionString -VersionFilePath $repoVersionFile

        # Determine drift status
        if (-not $currentVersion) {
            $driftStatus = 'missing'
        }
        elseif ($currentVersion -eq $canonicalVersion) {
            $driftStatus = 'current'
        }
        else {
            $driftStatus = 'stale'
        }

        # T046: Count individual file checksum mismatches even when version matches
        $filesDiverged = 0
        if ($currentVersion -and (Test-Path $repoVersionFile -PathType Leaf)) {
            $repoManifest = Read-VersionManifest -VersionFilePath $repoVersionFile
            foreach ($relPath in $SourceManifest.Keys) {
                $sourceHash = $SourceManifest[$relPath]
                $repoHash   = if ($repoManifest.ContainsKey($relPath)) { $repoManifest[$relPath] } else { $null }
                # Also check actual file on disk for manual edits
                $actualFile = Join-Path $repo.path $relPath
                $actualHash = Get-FileSHA256 -Path $actualFile
                if ($actualHash -and $actualHash -ne $sourceHash) {
                    $filesDiverged++
                }
            }
        }

        $driftRecords += @{
            repo_path         = $repo.path
            current_version   = $currentVersion
            canonical_version = $canonicalVersion
            drift_status      = $driftStatus
            files_diverged    = $filesDiverged
        }
    }

    return @($driftRecords)
}

# ---------------------------------------------------------------------------
# 14. New-FleetSummary: aggregate RepoOutcome array into FleetSummary
#     Per data-model.md FleetSummary entity
# ---------------------------------------------------------------------------
function New-FleetSummary {
    param([array]$RepoOutcomes)

    $summary = @{
        discovered   = $RepoOutcomes.Count
        eligible     = @($RepoOutcomes | Where-Object { $_.status -ne 'skipped' }).Count
        updated      = @($RepoOutcomes | Where-Object { $_.status -eq 'updated' }).Count
        unchanged    = @($RepoOutcomes | Where-Object { $_.status -eq 'unchanged' }).Count
        bootstrapped = @($RepoOutcomes | Where-Object { $_.status -eq 'bootstrapped' }).Count
        skipped      = @($RepoOutcomes | Where-Object { $_.status -eq 'skipped' }).Count
        error        = @($RepoOutcomes | Where-Object { $_.status -eq 'error' }).Count
    }
    return $summary
}

# ---------------------------------------------------------------------------
# 13. Write-ExecutionLog: persist fleet run as JSON log file
#     Per rollout-execution.md Execution Logging Contract
# ---------------------------------------------------------------------------
function Write-ExecutionLog {
    param(
        [string]$CanonicalSourcePath,
        [string]$ManagedRootPath,
        [string]$Mode,
        [hashtable]$Summary,
        [array]$RepoOutcomes,
        [datetime]$StartTime
    )

    $logsDir = Join-Path $CanonicalSourcePath ".specify" "logs"
    if (-not (Test-Path $logsDir)) {
        New-Item -ItemType Directory -Path $logsDir -Force | Out-Null
    }

    $timestamp = $StartTime.ToString('yyyy-MM-ddTHH:mm:ssZ')
    $runId     = "rollout-$($StartTime.ToString('yyyy-MM-dd-HHmmss'))"
    $duration  = [int]((Get-Date) - $StartTime).TotalSeconds

    $canonicalVersion = Read-VersionString -VersionFilePath (Join-Path $CanonicalSourcePath ".specify" "version")

    # Build per-repo records (strip internal _diff_results/_updated_files)
    $repoRecords = @()
    foreach ($outcome in $RepoOutcomes) {
        $repoRecords += [PSCustomObject]@{
            path                    = $outcome.repo_path
            version_before          = $outcome.version_before
            version_after           = $outcome.version_after
            status                  = $outcome.status
            skip_reason             = $outcome.skip_reason
            error_detail            = $outcome.error_detail
            verification_level      = $outcome.verification_level
            verification_errors     = @($outcome.verification_errors)
            files_updated           = $outcome.files_updated
            files_installed         = $outcome.files_installed
            warnings                = @($outcome.warnings)
            errors                  = @($outcome.errors)
            constitutionProcessing  = $outcome.constitutionProcessing
        }
    }

    $logObject = [PSCustomObject]@{
        run_id            = $runId
        timestamp         = $timestamp
        duration_seconds  = $duration
        canonical_version = $canonicalVersion
        canonical_source  = $CanonicalSourcePath
        managed_root      = $ManagedRootPath
        mode              = $Mode
        summary           = [PSCustomObject]$Summary
        repos             = @($repoRecords)
    }

    $logFile = Join-Path $logsDir "$runId.json"
    $logObject | ConvertTo-Json -Depth 5 | Set-Content -Path $logFile -Encoding UTF8
    return $logFile
}

# ---------------------------------------------------------------------------
# 15. Get-ConstitutionState: detect state of a consumer constitution.md
#     Returns: 'not_exists' | 'legacy' | 'migrated' | 'corrupt'
#     Per contracts/rollout-extension.md state machine
# ---------------------------------------------------------------------------
function Get-ConstitutionState {
    param([string]$Path)

    if (-not (Test-Path $Path -PathType Leaf)) { return 'not_exists' }

    $content    = Get-Content -Raw $Path
    $hasGS      = $content -match [regex]::Escape('<!-- GLOBAL CONSTITUTION START -->')
    $hasGE      = $content -match [regex]::Escape('<!-- GLOBAL CONSTITUTION END -->')
    $hasRS      = $content -match [regex]::Escape('<!-- REPO CONSTITUTION START -->')
    $hasRE      = $content -match [regex]::Escape('<!-- REPO CONSTITUTION END -->')

    # No markers at all → legacy (pre-feature constitution)
    if (-not $hasGS -and -not $hasGE -and -not $hasRS -and -not $hasRE) { return 'legacy' }

    # Both marker pairs fully present → migrated
    if ($hasGS -and $hasGE -and $hasRS -and $hasRE) { return 'migrated' }

    # Partial markers → corrupt
    return 'corrupt'
}

# ---------------------------------------------------------------------------
# 16. Format-ConstitutionRomanNumeral: renumber all principle headings
#     Global principles get I–N, repo-specific get N+1 onward.
#     Operates only within the delimited sections — never touches headings
#     outside the markers.
#     Per contracts/rollout-extension.md renumbering algorithm
# ---------------------------------------------------------------------------
function Format-ConstitutionRomanNumeral {
    param([string]$Content)

    $romanNumerals = @('I','II','III','IV','V','VI','VII','VIII','IX','X',
                       'XI','XII','XIII','XIV','XV','XVI','XVII','XVIII','XIX','XX')
    $headingPattern = '(?m)^### [IVXLCDM]+\. (.+)$'

    # Helper: renumber headings in an isolated section string
    # Returns hashtable: { Inner = <renumbered string>; Count = <heading count> }
    function Renumber-Inner {
        param([string]$Inner, [int]$Offset)
        $headingMatches = [regex]::Matches($Inner, $headingPattern)
        $available      = $romanNumerals.Count - $Offset
        $count          = [Math]::Min($headingMatches.Count, $available)
        if ($headingMatches.Count -gt $available) {
            Write-Warning "  Constitution: principle count exceeds 20 — renumbering stopped at $($romanNumerals[$romanNumerals.Count - 1])."
        }
        # Replace in reverse order to preserve string indices
        for ($j = $count - 1; $j -ge 0; $j--) {
            $m      = $headingMatches[$j]
            $newH   = "### $($romanNumerals[$Offset + $j]). $($m.Groups[1].Value)"
            $Inner  = $Inner.Substring(0, $m.Index) + $newH + $Inner.Substring($m.Index + $m.Length)
        }
        # Warn on non-standard heading levels that were not renumbered (TD-5)
        $allRomanHeadings = [regex]::Matches($Inner, '(?m)^(#{1,6}) ([IVXLCDM]+)\. ')
        foreach ($h in $allRomanHeadings) {
            if ($h.Groups[1].Value -ne '###') {
                $preview = ($Inner.Substring($h.Index, [Math]::Min(60, $Inner.Length - $h.Index))).Split("`n")[0].Trim()
                Write-Warning "  Constitution: unrenumbered heading (expected '###', found '$($h.Groups[1].Value)'): $preview"
            }
        }
        return @{ Inner = $Inner; Count = $count }
    }

    $gcsStart = '<!-- GLOBAL CONSTITUTION START -->'
    $gcsEnd   = '<!-- GLOBAL CONSTITUTION END -->'
    $rcsStart = '<!-- REPO CONSTITUTION START -->'
    $rcsEnd   = '<!-- REPO CONSTITUTION END -->'

    # Locate global section
    $g1 = $Content.IndexOf($gcsStart)
    $g2 = $Content.IndexOf($gcsEnd)
    if ($g1 -lt 0 -or $g2 -lt 0 -or $g2 -le $g1) { return $Content }

    $beforeGlobal  = $Content.Substring(0, $g1 + $gcsStart.Length)
    $globalInner   = $Content.Substring($g1 + $gcsStart.Length, $g2 - ($g1 + $gcsStart.Length))
    $afterGlobal   = $Content.Substring($g2)

    $gResult       = Renumber-Inner -Inner $globalInner -Offset 0
    $globalCount   = $gResult.Count
    $globalInner   = $gResult.Inner

    # Locate repo section within the remainder
    $r1 = $afterGlobal.IndexOf($rcsStart)
    $r2 = $afterGlobal.IndexOf($rcsEnd)
    if ($r1 -ge 0 -and $r2 -gt $r1) {
        $beforeRepo  = $afterGlobal.Substring(0, $r1 + $rcsStart.Length)
        $repoInner   = $afterGlobal.Substring($r1 + $rcsStart.Length, $r2 - ($r1 + $rcsStart.Length))
        $afterRepo   = $afterGlobal.Substring($r2)
        $rResult     = Renumber-Inner -Inner $repoInner -Offset $globalCount
        $repoInner   = $rResult.Inner
        $afterGlobal = $beforeRepo + $repoInner + $afterRepo
    }

    return $beforeGlobal + $globalInner + $afterGlobal
}

# ---------------------------------------------------------------------------
# 17. Initialize-Constitution: create a brand-new constitution.md for a
#     consumer repo that has none; seeds the global section, adds an empty
#     repo-specific section with placeholder guidance.
#     Per contracts/rollout-extension.md Initialize-Constitution sub-operation
# ---------------------------------------------------------------------------
function Initialize-Constitution {
    param(
        [string]$GlobalConstitutionPath,
        [string]$ConsumerConstitutionPath,
        [string]$ProjectName
    )

    $globalContent = Get-Content -Raw $GlobalConstitutionPath

    $projectHeading = if ($ProjectName) { $ProjectName } else { 'Project' }

    $constitutionContent = @"
# $projectHeading Constitution

<!-- GLOBAL CONSTITUTION START -->
$globalContent
<!-- GLOBAL CONSTITUTION END -->

<!-- REPO CONSTITUTION START -->
## $projectHeading-Specific Principles
<!-- Add repo-specific principles here using the format: ### [Roman numeral]. [Name] -->
<!-- The rollout assigns ordinals automatically — globals first, then repo-specific. -->
<!-- REPO CONSTITUTION END -->

## Governance

This constitution supersedes all other development practices for this repository.
Amendments to the global section require changes in the Speckit-custom canonical repo.
Amendments to repo-specific principles can be made locally via /speckit.constitution.

**Version**: 1.0.0 | **Ratified**: $(Get-Date -Format 'yyyy-MM-dd') | **Last Amended**: $(Get-Date -Format 'yyyy-MM-dd')
"@

    # Ensure the parent directory exists
    $parentDir = Split-Path $ConsumerConstitutionPath -Parent
    if (-not (Test-Path $parentDir)) {
        New-Item -ItemType Directory -Path $parentDir -Force | Out-Null
    }

    $constitutionContent = Format-ConstitutionRomanNumeral -Content $constitutionContent
    Set-Content -Path $ConsumerConstitutionPath -Value $constitutionContent -NoNewline -Encoding UTF8
}

# ---------------------------------------------------------------------------
# 18. Migrate-Constitution (Phase A): wrap a legacy constitution.md in
#     section markers without semantic analysis; performs exact-string dedup.
#     Semantic dedup (Phase B) is deferred to the /speckit.constitution agent.
#     Per contracts/rollout-extension.md Migrate-Constitution sub-operation
# ---------------------------------------------------------------------------
function Migrate-Constitution {
    param(
        [string]$GlobalConstitutionPath,
        [string]$ConsumerConstitutionPath
    )

    $globalContent = Get-Content -Raw $GlobalConstitutionPath
    $legacyContent = Get-Content -Raw $ConsumerConstitutionPath

    # Phase A exact-string dedup: remove any legacy lines that are byte-for-byte
    # identical to a line in the global principles file
    $globalLines = ($globalContent -split "`r?`n") | ForEach-Object { $_.Trim() } |
        Where-Object { $_ -ne '' }
    $legacyLines = $legacyContent -split "`r?`n"
    $deduped = $legacyLines | Where-Object {
        $trimmed = $_.Trim()
        -not ($globalLines -contains $trimmed -and $trimmed -ne '')
    }
    $cleanedLegacy = ($deduped -join "`n").Trim()

    $migrated = @"
<!-- GLOBAL CONSTITUTION START -->
$globalContent
<!-- GLOBAL CONSTITUTION END -->

<!-- REPO CONSTITUTION START -->
$cleanedLegacy
<!-- REPO CONSTITUTION END -->
"@

    $migrated = Format-ConstitutionRomanNumeral -Content $migrated
    Set-Content -Path $ConsumerConstitutionPath -Value $migrated -NoNewline -Encoding UTF8
}

# ---------------------------------------------------------------------------
# 19. Update-GlobalSection: replace the global section in an already-migrated
#     constitution.md with the current canonical global-constitution.md content.
#     Preserves the repo-specific section unchanged, then renumbers.
#     Per contracts/rollout-extension.md Update-GlobalSection sub-operation
# ---------------------------------------------------------------------------
function Update-GlobalSection {
    param(
        [string]$GlobalConstitutionPath,
        [string]$ConsumerConstitutionPath
    )

    $globalContent   = Get-Content -Raw $GlobalConstitutionPath
    $existingContent = Get-Content -Raw $ConsumerConstitutionPath

    $gcsStart = '<!-- GLOBAL CONSTITUTION START -->'
    $gcsEnd   = '<!-- GLOBAL CONSTITUTION END -->'

    $g1 = $existingContent.IndexOf($gcsStart)
    $g2 = $existingContent.IndexOf($gcsEnd)

    if ($g1 -lt 0 -or $g2 -lt 0 -or $g2 -le $g1) {
        Write-Warning "  Update-GlobalSection: could not locate global section markers in $ConsumerConstitutionPath"
        return
    }

    # No-op detection: skip write if global content is unchanged (TD-2)
    $existingGlobalInner = $existingContent.Substring($g1 + $gcsStart.Length,
        $g2 - ($g1 + $gcsStart.Length))
    if ($existingGlobalInner.Trim() -eq $globalContent.Trim()) {
        return 'unchanged'
    }

    # Replace only the content between the global markers
    $before  = $existingContent.Substring(0, $g1 + $gcsStart.Length)
    $after   = $existingContent.Substring($g2)
    $updated = $before + "`n" + $globalContent + "`n" + $after
    $updated = Format-ConstitutionRomanNumeral -Content $updated
    Set-Content -Path $ConsumerConstitutionPath -Value $updated -NoNewline -Encoding UTF8
    return 'updated'
}

# ---------------------------------------------------------------------------
# 20. Merge-Constitution: top-level orchestrator for constitution-aware
#     processing; detects state and dispatches to the correct sub-function.
#     Returns: hashtable with constitutionProcessing result per the contract
#     Per contracts/rollout-extension.md Merge-Constitution
# ---------------------------------------------------------------------------
function Merge-Constitution {
    param(
        [string]$ConsumerConstitutionPath,
        [string]$GlobalConstitutionPath,
        [string]$ConsumerRepoPath,
        [switch]$WhatIf
    )

    # Guard: global-constitution.md must be non-empty
    $globalRaw = Get-Content -Raw $GlobalConstitutionPath
    if (-not $globalRaw -or $globalRaw.Trim() -eq '' -or
        $globalRaw -notmatch '(?m)^### [IVXLCDM]+\. ') {
        Write-Warning "  global-constitution.md is empty — skipping constitution merge"
        return @{
            status                    = 'skipped'
            previousState             = $null
            globalPrinciplesInjected  = 0
            exactMatchDuplicatesRemoved = 0
            note                      = $null
            dryRun                    = [bool]$WhatIf
            warning                   = 'global-constitution.md is empty — skipping constitution merge'
        }
    }

    $globalPrincipleCount = ([regex]::Matches($globalRaw, '(?m)^### [IVXLCDM]+\. ')).Count

    $previousState = Get-ConstitutionState -Path $ConsumerConstitutionPath
    $exactDupes    = 0
    $operationNote = $null
    $status        = 'skipped'
    $projectName   = Split-Path $ConsumerRepoPath -Leaf

    switch ($previousState) {
        'not_exists' {
            if (-not $WhatIf) {
                Initialize-Constitution -GlobalConstitutionPath $GlobalConstitutionPath `
                    -ConsumerConstitutionPath $ConsumerConstitutionPath `
                    -ProjectName $projectName
            }
            $status = if ($WhatIf) { 'initialize_pending' } else { 'initialized' }
        }
        'legacy' {
            # Count exact-match dupes (read-only — safe in WhatIf mode)
            $legacyContent = Get-Content -Raw $ConsumerConstitutionPath
            $globalLines   = ($globalRaw -split "`r?`n") | ForEach-Object { $_.Trim() } |
                Where-Object { $_ -ne '' }
            $legacyLines   = ($legacyContent -split "`r?`n") | ForEach-Object { $_.Trim() } |
                Where-Object { $_ -ne '' }
            $exactDupes    = @($legacyLines | Where-Object { $globalLines -contains $_ }).Count

            if (-not $WhatIf) {
                Migrate-Constitution -GlobalConstitutionPath $GlobalConstitutionPath `
                    -ConsumerConstitutionPath $ConsumerConstitutionPath
            }
            $status        = if ($WhatIf) { 'migrate_pending' } else { 'migrated' }
            $operationNote = 'Semantic deduplication pending — run /speckit.constitution to complete migration'
        }
        'migrated' {
            if ($WhatIf) {
                # Preview: check if global section would change without writing (TD-3)
                $existingContent = Get-Content -Raw $ConsumerConstitutionPath
                $gStartLen       = '<!-- GLOBAL CONSTITUTION START -->'.Length
                $g1Preview       = $existingContent.IndexOf('<!-- GLOBAL CONSTITUTION START -->')
                $g2Preview       = $existingContent.IndexOf('<!-- GLOBAL CONSTITUTION END -->')
                $wouldChange     = $true
                if ($g1Preview -ge 0 -and $g2Preview -gt $g1Preview) {
                    $currentGlobal = $existingContent.Substring($g1Preview + $gStartLen,
                        $g2Preview - ($g1Preview + $gStartLen))
                    $wouldChange   = $currentGlobal.Trim() -ne $globalRaw.Trim()
                }
                $status = if ($wouldChange) { 'update_pending' } else { 'unchanged' }
            } else {
                $updateResult = Update-GlobalSection -GlobalConstitutionPath $GlobalConstitutionPath `
                    -ConsumerConstitutionPath $ConsumerConstitutionPath
                $status = if ($updateResult -eq 'unchanged') { 'unchanged' } else { 'updated' }
            }
        }
        'corrupt' {
            Write-Warning "  constitution.md has mismatched section markers — skipping"
            return @{
                status                    = 'corrupt_warning'
                previousState             = 'corrupt'
                globalPrinciplesInjected  = 0
                exactMatchDuplicatesRemoved = 0
                note                      = $null
                dryRun                    = [bool]$WhatIf
                warning                   = 'constitution.md has mismatched section markers — skipping'
            }
        }
    }

    $result = @{
        status                    = $status
        previousState             = $previousState
        globalPrinciplesInjected  = $globalPrincipleCount
        exactMatchDuplicatesRemoved = $exactDupes
        note                      = $operationNote
        dryRun                    = [bool]$WhatIf
    }

    return $result
}

# ---------------------------------------------------------------------------
# Main execution
# ---------------------------------------------------------------------------

if ($ManagedRoot) {
    # -----------------------------------------------------------------------
    # Fleet mode: discover, process, verify, report, log
    # Per FR-017 (managed-root execution), FR-018 (logging), FR-019 (summary)
    # -----------------------------------------------------------------------
    $fleetStartTime = Get-Date
    $fleetMode = if ($Apply) { 'apply' } else { 'check' }

    if (-not (Test-Path $ManagedRoot -PathType Container)) {
        Write-Error "Managed root path not found: $ManagedRoot"
    }

    Write-Output "Speckit Fleet $($fleetMode.ToUpper()) — Managed root: $ManagedRoot"
    Write-Output "Canonical source: $CanonicalSource"
    Write-Output ("-" * 80)

    # Discovery (T034)
    Write-Output ""
    Write-Output "Discovering repos..."
    $discovered = @(Find-EligibleRepos -ManagedRootPath $ManagedRoot `
        -CanonicalSourcePath $CanonicalSource -ApplyMode ([bool]$Apply))

    $eligibleRepos = @($discovered | Where-Object { $_.eligible })
    $skippedRepos  = @($discovered | Where-Object { -not $_.eligible })

    Write-Output "  Found $($discovered.Count) directories, $(@($eligibleRepos).Count) eligible, $(@($skippedRepos).Count) skipped"

    if ($discovered.Count -eq 0) {
        Write-Warning "No eligible repos found under $ManagedRoot"
    }

    # Show skipped repos with reasons
    foreach ($skip in $skippedRepos) {
        $repoName = Split-Path $skip.path -Leaf
        if ($skip.skip_reason -eq 'self' -and $skip.parity_check) {
            $parity = $skip.parity_check
            Write-Output "  SELF   $repoName (canonical source — parity: $($parity.status))"
            if ($parity.status -eq 'drift_detected') {
                Write-Warning "  Parity check: $($parity.message)"
                foreach ($df in $parity.drift_files) {
                    Write-Warning "    $($df.reason): $($df.path)"
                }
            }
        } else {
            Write-Output "  SKIP   $repoName ($($skip.skip_reason))"
        }
    }

    # Process eligible repos
    $allOutcomes = @()

    # Add skipped repos as RepoOutcome records
    foreach ($skip in $skippedRepos) {
        $outcomeEntry = @{
            repo_path           = $skip.path
            version_before      = $null
            version_after       = $null
            status              = 'skipped'
            skip_reason         = $skip.skip_reason
            error_detail        = $null
            verification_level  = $null
            verification_errors = @()
            files_updated       = 0
            files_installed     = 0
            warnings            = @()
            errors              = @()
            _diff_results       = @()
            _updated_files      = @()
        }
        if ($skip.skip_reason -eq 'self' -and $skip.parity_check) {
            $outcomeEntry.parity_check = $skip.parity_check
        }
        $allOutcomes += $outcomeEntry
    }

    Write-Output ""

    foreach ($repo in $eligibleRepos) {
        $repoName = Split-Path $repo.path -Leaf
        $action   = $repo.action  # 'update' or 'bootstrap'

        try {
            if ($action -eq 'bootstrap' -and $Apply) {
                # Bootstrap onboarding (T035)
                Write-Output "  BOOTSTRAP  $repoName"
                $outcome = Install-BootstrapSpeckit -SourcePath $CanonicalSource `
                    -ConsumerPath $repo.path -SourceManifest $Manifest
            }
            elseif ($action -eq 'bootstrap' -and -not $Apply) {
                # Check mode for uninitialized repo — report as missing structure
                Write-Output "  CHECK  $repoName (no .specify/ — would bootstrap with -Apply)"
                $outcome = @{
                    repo_path           = $repo.path
                    version_before      = $null
                    version_after       = $null
                    status              = 'skipped'
                    skip_reason         = 'missing_speckit_structure'
                    error_detail        = $null
                    verification_level  = $null
                    verification_errors = @()
                    files_updated       = 0
                    files_installed     = 0
                    warnings            = @()
                    errors              = @()
                    _diff_results       = @()
                    _updated_files      = @()
                }
            }
            else {
                # Update existing repo (T033/T036)
                if ($Apply) {
                    Write-Output "  UPDATE $repoName"
                } else {
                    Write-Output "  CHECK  $repoName"
                }
                $outcome = Update-SingleRepo -SourcePath $CanonicalSource `
                    -ConsumerPath $repo.path -ApplyMode ([bool]$Apply) -SourceManifest $Manifest
            }
        }
        catch {
            # Fleet error handling (T039): diagnose and log, NEVER silently skip
            $errorDetail = $_.Exception.Message

            # Classify error per update-workflow.md failure behavior
            if ($errorDetail -match 'version') {
                $errorDetail = "MISSING_VERSION: $errorDetail"
            }
            elseif ($errorDetail -match 'merge|marker') {
                $errorDetail = "MERGE_CONFLICT: $errorDetail"
            }
            elseif ($errorDetail -match 'access|permission|denied') {
                $errorDetail = "PERMISSION_DENIED: $errorDetail"
            }

            Write-Warning "  ERROR  $repoName — $errorDetail"

            $outcome = @{
                repo_path           = $repo.path
                version_before      = $null
                version_after       = $null
                status              = 'error'
                skip_reason         = $null
                error_detail        = $errorDetail
                verification_level  = $null
                verification_errors = @()
                files_updated       = 0
                files_installed     = 0
                warnings            = @()
                errors              = @($errorDetail)
                _diff_results       = @()
                _updated_files      = @()
            }
        }

        $allOutcomes += $outcome

        # Run post-update verification on processed repos (apply mode only)
        if ($Apply -and $outcome.status -in @('updated', 'bootstrapped', 'unchanged')) {
            $repoName = Split-Path $outcome.repo_path -Leaf
            Write-Output "  VERIFY $repoName"
            $verifyResult = Test-PostUpdateVerification -ConsumerPath $outcome.repo_path -SourceManifest $Manifest
            $outcome.verification_level  = $verifyResult.level
            $outcome.verification_errors = $verifyResult.errors
            if ($verifyResult.errors.Count -gt 0) {
                $verboseMsg = Format-VerificationMessage -Level $verifyResult.level -Errors $verifyResult.errors -RepoName $repoName
                Write-Warning "    Verification stopped at Level $($verifyResult.level) (of 4):`n$verboseMsg"
            }
            else {
                Write-Output "    All $($verifyResult.level) verification levels passed"
            }
        }
    }

    # Fleet summary (T037)
    $fleetSummary = New-FleetSummary -RepoOutcomes $allOutcomes

    # Version drift report (T043, T044, T046)
    $driftRecords = @(Get-VersionDrift -CanonicalSourcePath $CanonicalSource `
        -RepoEntries $discovered -SourceManifest $Manifest)

    # Add check-mode drift counts to fleet summary (T043)
    $fleetSummary.current = @($driftRecords | Where-Object { $_.drift_status -eq 'current' }).Count
    $fleetSummary.stale   = @($driftRecords | Where-Object { $_.drift_status -eq 'stale' }).Count
    $fleetSummary.missing = @($driftRecords | Where-Object { $_.drift_status -eq 'missing' }).Count

    # Fleet-level critical warning (T047): >50% error rate
    $processedCount = $fleetSummary.eligible
    if ($processedCount -gt 0 -and $fleetSummary.error -gt ($processedCount / 2)) {
        Write-Warning "CRITICAL: Majority failure — $($fleetSummary.error)/$processedCount repos errored. Investigate canonical source."
    }

    # Version drift table (T044) — per rollout-execution.md format
    $canonicalVersionStr = Read-VersionString -VersionFilePath (Join-Path $CanonicalSource ".specify" "version")
    Write-Output ""
    Write-Output "SPECKIT VERSION DRIFT REPORT"
    Write-Output "Canonical version: $canonicalVersionStr"
    Write-Output "Managed root: $ManagedRoot"
    Write-Output "Date: $(Get-Date -Format 'yyyy-MM-dd')"
    Write-Output ""
    Write-Output ("{0,-50} {1,-12} {2,-12} {3,-10} {4}" -f "Repo", "Current", "Canonical", "Status", "Diverged")
    Write-Output ("{0,-50} {1,-12} {2,-12} {3,-10} {4}" -f "----", "-------", "---------", "------", "--------")
    foreach ($drift in $driftRecords) {
        $repoName = Split-Path $drift.repo_path -Leaf
        $current  = if ($drift.current_version) { $drift.current_version } else { [char]0x2014 }
        $diverged = if ($drift.files_diverged -gt 0) { "$($drift.files_diverged) files" } else { "" }
        Write-Output ("{0,-50} {1,-12} {2,-12} {3,-10} {4}" -f $repoName, $current, $drift.canonical_version, $drift.drift_status.ToUpper(), $diverged)
    }
    Write-Output ""
    Write-Output "Summary: $($fleetSummary.current) current, $($fleetSummary.stale) stale, $($fleetSummary.missing) missing ($($driftRecords.Count) total)"

    # Fleet console output (T042)
    Write-Output ""
    Write-Output "=== Fleet Summary ==="
    Write-Output ("-" * 50)
    Write-Output "  Discovered:    $($fleetSummary.discovered)"
    Write-Output "  Eligible:      $($fleetSummary.eligible)"
    Write-Output "  Updated:       $($fleetSummary.updated)"
    Write-Output "  Unchanged:     $($fleetSummary.unchanged)"
    Write-Output "  Bootstrapped:  $($fleetSummary.bootstrapped)"
    Write-Output "  Skipped:       $($fleetSummary.skipped)"
    Write-Output "  Error:         $($fleetSummary.error)"
    Write-Output ("-" * 50)

    $passOrFail = if ($fleetSummary.error -eq 0) { "PASS" } else { "FAIL" }
    Write-Output "  Result: $passOrFail"
    Write-Output ""

    # Execution log (T038) — always write in both check and apply mode
    $logFile = Write-ExecutionLog -CanonicalSourcePath $CanonicalSource `
        -ManagedRootPath $ManagedRoot -Mode $fleetMode -Summary $fleetSummary `
        -RepoOutcomes $allOutcomes -StartTime $fleetStartTime

    Write-Output "Execution log: $logFile"

    # Output fleet summary JSON
    Write-Output ""
    Write-Output "=== Fleet Run Summary ==="
    [PSCustomObject]@{
        managed_root = $ManagedRoot
        mode         = $fleetMode
        summary      = [PSCustomObject]$fleetSummary
        log_file     = $logFile
        timestamp    = (Get-Date -Format 'yyyy-MM-ddTHH:mm:ssZ')
    } | ConvertTo-Json -Depth 3

    exit 0
}

# Single-repo mode: use -TargetRepo when specified, otherwise default to this repo's root
$TargetPath = if ($TargetRepo) {
    if (-not (Test-Path $TargetRepo -PathType Container)) {
        Write-Error "TargetRepo directory not found: $TargetRepo"
    }
    (Resolve-Path $TargetRepo).Path
} else {
    $RepoRoot
}

# Bootstrap if the target has no .specify/ (or no version file), otherwise update
$targetHasSpecify = Test-Path (Join-Path $TargetPath ".specify") -PathType Container
$targetHasVersion = Test-Path (Join-Path $TargetPath ".specify" "version") -PathType Leaf

if ((-not $targetHasSpecify -or -not $targetHasVersion) -and $Apply) {
    Write-Output "Target repo has no .specify/ structure — bootstrapping: $TargetPath"
    $outcome = Install-BootstrapSpeckit -SourcePath $CanonicalSource `
        -ConsumerPath $TargetPath -SourceManifest $Manifest
} else {
    $outcome = Update-SingleRepo -SourcePath $CanonicalSource -ConsumerPath $TargetPath `
        -ApplyMode ([bool]$Apply) -SourceManifest $Manifest
}

# Handle bootstrapped repos — show install summary and exit
if ($outcome.status -eq 'bootstrapped') {
    $bootstrapSummary = [PSCustomObject]@{
        repoPath       = $outcome.repo_path
        status         = 'bootstrapped'
        reasonCode     = $null
        message        = "$($outcome.files_installed) file(s) installed"
        installedFiles = $outcome.files_installed
        timestamp      = (Get-Date -Format 'yyyy-MM-ddTHH:mm:ssZ')
    }
    Write-Output ""
    Write-Output "Bootstrap complete: $($outcome.files_installed) file(s) installed to $($outcome.repo_path)"
    Write-Output ""
    Write-Output "=== Per-Repo Rollout Summary ==="
    $bootstrapSummary | ConvertTo-Json -Depth 3
    exit 0
}

# Handle skipped repos (eligibility failure)
if ($outcome.status -eq 'skipped') {
    $skipSummary = [PSCustomObject]@{
        repoPath     = $outcome.repo_path
        status       = 'skipped'
        reasonCode   = $outcome.skip_reason
        message      = $outcome.error_detail
        updatedFiles = @()
        timestamp    = (Get-Date -Format 'yyyy-MM-ddTHH:mm:ssZ')
    }
    Write-Output ""
    Write-Output "=== Per-Repo Rollout Summary ==="
    $skipSummary | ConvertTo-Json -Depth 3
    exit 0
}

# Display diff table
$results = $outcome._diff_results
Write-Output ""
Write-Output "Speckit Update Check — Canonical source: $CanonicalSource"
Write-Output ("-" * 100)

$results | Sort-Object File | Format-Table -Property @(
    @{Label='File';       Expression={$_.File};      Width=65},
    @{Label='Local';      Expression={$_.LocalHash};  Width=10},
    @{Label='Source';     Expression={$_.SrcHash};     Width=10},
    @{Label='Status';     Expression={$_.Status};      Width=10},
    @{Label='Markers';    Expression={$_.Markers};     Width=8}
) -AutoSize

# Summary
$matchCount   = ($results | Where-Object { $_.Status -eq 'MATCH'   }).Count
$differCount  = ($results | Where-Object { $_.Status -eq 'DIFFERS' }).Count
$missingCount = ($results | Where-Object { $_.Status -eq 'MISSING' }).Count
$noSrcCount   = ($results | Where-Object { $_.Status -eq 'NO-SRC'  }).Count

Write-Output "Summary: $($results.Count) files checked — $matchCount match, $differCount differ, $missingCount missing locally, $noSrcCount missing from source"

if ($Apply) {
    Write-Output ""
    Write-Output "$($outcome.files_updated) file(s) updated."
}
else {
    if ($differCount -gt 0 -or $missingCount -gt 0) {
        Write-Output ""
        Write-Output "To apply updates, run:  .\update-speckit.ps1 -Apply"

        $markerFiles = $results | Where-Object { $_.Markers -eq 'YES' -and $_.Status -eq 'DIFFERS' }
        if ($markerFiles.Count -gt 0) {
            Write-Output ""
            Write-Output "The following files have REPO CONTEXT markers and will be merged (content"
            Write-Output "outside markers updated, content inside markers preserved):"
            foreach ($mf in $markerFiles) {
                Write-Output "  - $($mf.File)"
            }
        }
    }
    else {
        Write-Output ""
        Write-Output "All core files are up to date."
    }
}

# Per-repo rollout summary (contract: rollout-execution.md)
$rolloutStatus = $outcome.status
$rolloutMessage = if ($outcome.files_updated -gt 0) {
    "Verify stage integrated; $($outcome.files_updated) file(s) synchronized"
} elseif (-not $Apply -and ($differCount -gt 0 -or $missingCount -gt 0)) {
    "Check mode: $differCount file(s) differ, $missingCount missing locally — no changes applied. Run with -Apply to update."
} else {
    "All core files are up-to-date"
}

$rolloutSummary = [PSCustomObject]@{
    repoPath               = $outcome.repo_path
    status                 = $rolloutStatus
    reasonCode             = $null
    message                = $rolloutMessage
    updatedFiles           = @($outcome._updated_files)
    constitutionProcessing = $outcome.constitutionProcessing
    timestamp              = (Get-Date -Format 'yyyy-MM-ddTHH:mm:ssZ')
}

Write-Output ""
Write-Output "=== Per-Repo Rollout Summary ==="
$rolloutSummary | ConvertTo-Json -Depth 3
