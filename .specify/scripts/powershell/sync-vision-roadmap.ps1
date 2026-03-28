#!/usr/bin/env pwsh

[CmdletBinding()]
param(
    [string]$VisionPath = "specs/intent/vision.md",
    [string]$RoadmapPath = "specs/intent/roadmap.md"
)

$ErrorActionPreference = "Stop"

$allowedStatus = @("Fully Implemented", "Partially Implemented", "Not Started")
$allowedPartial = @("In Progress", "Blocked", "Abandoned (won't finish)")

function Parse-VisionGoals {
    param([string[]]$Lines)

    $goals = @()
    foreach ($line in $Lines) {
        # Matches: 1. **Goal Name**: description
        if ($line -match '^\s*\d+\.\s*\*\*(.+?)\*\*\s*:\s*(.+)$') {
            $goals += [PSCustomObject]@{
                Goal = $matches[1].Trim()
                Description = $matches[2].Trim()
            }
        }
    }
    return $goals
}

function Parse-ExistingRows {
    param([string[]]$RoadmapLines)

    $rows = @{}
    foreach ($line in $RoadmapLines) {
        if ($line -match '^\|\s*(.+?)\s*\|\s*(Fully Implemented|Partially Implemented|Not Started)\s*\|\s*(.*?)\s*\|\s*(.*?)\s*\|\s*(.*?)\s*\|$') {
            $goal = $matches[1].Trim()
            $rows[$goal] = [PSCustomObject]@{
                Goal = $goal
                Status = $matches[2].Trim()
                Partial = $matches[3].Trim()
                Priority = $matches[4].Trim()
                Notes = $matches[5].Trim()
            }
        }
    }
    return $rows
}

function Normalize-Entries {
    param(
        [object[]]$Goals,
        [hashtable]$Existing
    )

    $entries = @()
    $autoPriority = 1

    foreach ($goal in $Goals) {
        if ($Existing.ContainsKey($goal.Goal)) {
            $entry = $Existing[$goal.Goal]
        } else {
            $entry = [PSCustomObject]@{
                Goal = $goal.Goal
                Status = "Not Started"
                Partial = "-"
                Priority = ""
                Notes = ""
            }
        }

        if ($allowedStatus -notcontains $entry.Status) {
            $entry.Status = "Not Started"
        }

        switch ($entry.Status) {
            "Fully Implemented" {
                $entry.Partial = "-"
                $entry.Priority = "-"
            }
            "Partially Implemented" {
                if ($allowedPartial -notcontains $entry.Partial) {
                    $entry.Partial = "In Progress"
                }
                $entry.Priority = "-"
            }
            "Not Started" {
                $entry.Partial = "-"
                if (-not ($entry.Priority -match '^\d+$')) {
                    $entry.Priority = [string]$autoPriority
                    $autoPriority++
                }
            }
        }

        if (-not $entry.Notes) {
            $entry.Notes = ""
        }

        $entries += $entry
    }

    # Ensure not started items are sorted by numeric priority.
    $full = $entries | Where-Object { $_.Status -eq "Fully Implemented" }
    $partial = $entries | Where-Object { $_.Status -eq "Partially Implemented" }
    $notStarted = $entries | Where-Object { $_.Status -eq "Not Started" } | Sort-Object { [int]$_.Priority }

    return @($full + $partial + $notStarted)
}

function Render-StatusBlock {
    param(
        [object[]]$Entries,
        [object[]]$Goals
    )

    $lines = @()
    $lines += "## Vision Implementation Status"
    $lines += ""
    $lines += "> Auto-synced from `specs/intent/vision.md`."
    $lines += "> `Status` must be one of: Fully Implemented, Partially Implemented, Not Started."
    $lines += "> `Partially Implemented` rows must use: In Progress, Blocked, or Abandoned (won't finish)."
    $lines += "> `Not Started` rows are sorted by ascending numeric `Priority` (1 = highest)."
    $lines += ""
    $lines += "| Vision Element | Status | Partial Label | Priority | Notes |"
    $lines += "|---|---|---|---:|---|"

    foreach ($entry in $Entries) {
        $notes = $entry.Notes -replace '\|', '\\|'
        $lines += "| $($entry.Goal) | $($entry.Status) | $($entry.Partial) | $($entry.Priority) | $notes |"
    }

    $lines += ""
    $lines += "### Vision Traceability"
    foreach ($goal in $Goals) {
        $desc = $goal.Description -replace '\|', '\\|'
        $lines += "- **$($goal.Goal)**: $desc"
    }

    return $lines
}

$visionAbs = Resolve-Path $VisionPath -ErrorAction Stop
$roadmapAbs = Resolve-Path $RoadmapPath -ErrorAction Stop

$visionLines = Get-Content -Path $visionAbs
$roadmapLines = Get-Content -Path $roadmapAbs

$goals = Parse-VisionGoals -Lines $visionLines
if (-not $goals -or $goals.Count -eq 0) {
    throw "No numbered goal items found in $VisionPath. Expected markdown lines like: 1. **Goal**: Description"
}

$existingRows = Parse-ExistingRows -RoadmapLines $roadmapLines
$normalized = Normalize-Entries -Goals $goals -Existing $existingRows
$generatedBlock = Render-StatusBlock -Entries $normalized -Goals $goals

$startMarker = "<!-- VISION_SYNC:START -->"
$endMarker = "<!-- VISION_SYNC:END -->"

$startIndex = [Array]::IndexOf($roadmapLines, $startMarker)
$endIndex = [Array]::IndexOf($roadmapLines, $endMarker)

$output = @()
if ($startIndex -ge 0 -and $endIndex -gt $startIndex) {
    $before = @()
    if ($startIndex -gt 0) {
        $before = $roadmapLines[0..($startIndex - 1)]
    }

    $after = @()
    if ($endIndex + 1 -le $roadmapLines.Count - 1) {
        $after = $roadmapLines[($endIndex + 1)..($roadmapLines.Count - 1)]
    }

    $output += $before
    $output += $startMarker
    $output += $generatedBlock
    $output += $endMarker
    $output += $after
} else {
    $output += $roadmapLines
    if ($output.Count -gt 0 -and $output[-1] -ne "") {
        $output += ""
    }
    $output += $startMarker
    $output += $generatedBlock
    $output += $endMarker
}

Set-Content -Path $roadmapAbs -Value $output
Write-Output "Synchronized roadmap status from vision goals: $RoadmapPath"