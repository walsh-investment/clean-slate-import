# session-start.ps1 — Test Theater Agent SessionStart Hook
# Fires when the agent session starts. Injects the pattern library and
# active configuration into the agent context as a systemMessage, so the
# agent begins every session with full pattern awareness.
# Per contracts/hook-interface.md SessionStart section and research.md R-008.

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
catch { }

$cwd = if ($inputJson -and $inputJson.PSObject.Properties['cwd']) { $inputJson.cwd } else { Get-Location }

# --- Helper: emit JSON result and exit ---
function Send-Result {
    param([bool]$Continue = $true, [string]$Message = '', [string]$StopReason = '', [int]$ExitCode = 0)
    $result = @{ 'continue' = $Continue; 'systemMessage' = $Message }
    if ($StopReason) { $result['stopReason'] = $StopReason }
    $result | ConvertTo-Json -Compress | Write-Output
    exit $ExitCode
}

# --- Resolve agent directory (where this script lives) ---
$agentDir = Split-Path -Parent $PSCommandPath

# --- Load pattern library (BLOCKING if missing) ---
$patternLibraryPath = Join-Path $agentDir 'references\pattern-library.md'
if (-not (Test-Path $patternLibraryPath)) {
    # Also try the parent directory (script is in scripts/, patterns in references/)
    $patternLibraryPath = Join-Path (Split-Path -Parent $agentDir) 'references\pattern-library.md'
}
if (-not (Test-Path $patternLibraryPath)) {
    Send-Result -Continue $false -StopReason "Pattern library not found at '$patternLibraryPath'. Run deploy.ps1 to install the agent correctly." -ExitCode 2
}

$patternLibraryContent = Get-Content -Path $patternLibraryPath -Raw -Encoding UTF8

# --- Load global configuration (non-blocking if missing) ---
$globalConfigPath = Join-Path $agentDir 'config\test-theater.json'
if (-not (Test-Path $globalConfigPath)) {
    $globalConfigPath = Join-Path (Split-Path -Parent $agentDir) 'config\test-theater.json'
}

$globalConfig = $null
if (Test-Path $globalConfigPath) {
    try { $globalConfig = Get-Content -Path $globalConfigPath -Raw -Encoding UTF8 | ConvertFrom-Json }
    catch { $globalConfig = $null }
}

# Defaults if global config is missing
if (-not $globalConfig) {
    $globalConfig = [PSCustomObject]@{
        severity_thresholds = [PSCustomObject]@{ critical = $true; warning = $true; info = $true }
        exclude_paths       = @('node_modules', '.git', 'vendor', 'dist', 'build')
        exclude_patterns    = @()
        output_dir          = '.test-theater/reports'
        languages           = @('python', 'javascript', 'typescript', 'csharp', 'powershell')
    }
}

# --- Load workspace configuration override (non-blocking if missing) ---
$workspaceConfigPath = Join-Path $cwd '.test-theater\config.json'
$workspaceConfig = $null
if (Test-Path $workspaceConfigPath) {
    try { $workspaceConfig = Get-Content -Path $workspaceConfigPath -Raw -Encoding UTF8 | ConvertFrom-Json }
    catch { $workspaceConfig = $null }
}

# --- Merge configs (workspace overrides global) ---
$mergedConfig = $globalConfig
if ($workspaceConfig) {
    foreach ($prop in $workspaceConfig.PSObject.Properties) {
        $mergedConfig | Add-Member -MemberType NoteProperty -Name $prop.Name -Value $prop.Value -Force
    }
}

# --- Build active configuration summary ---
$excludePathsStr   = ($mergedConfig.exclude_paths -join ', ')
$excludePatternsStr = if ($mergedConfig.exclude_patterns.Count -gt 0) { ($mergedConfig.exclude_patterns -join ', ') } else { '(none)' }
$activeLanguages   = ($mergedConfig.languages -join ', ')

$severities = @()
if ($mergedConfig.severity_thresholds.critical) { $severities += 'critical' }
if ($mergedConfig.severity_thresholds.warning)  { $severities += 'warning' }
if ($mergedConfig.severity_thresholds.info)     { $severities += 'info' }
$severityStr = $severities -join ', '

# --- Compose systemMessage ---
$msg = @"
## Active Pattern Library

$patternLibraryContent

---

## Active Configuration

- **Severity filter**: $severityStr
- **Excluded paths**: $excludePathsStr
- **Excluded patterns**: $excludePatternsStr
- **Active languages**: $activeLanguages
- **Report output directory**: $($mergedConfig.output_dir)
- **Workspace config override**: $(if ($workspaceConfig) { "$workspaceConfigPath (loaded)" } else { "(none)" })

Use these settings for all scans in this session. If the user specifies different settings in chat, those take precedence for this session only.
"@

Send-Result -Continue $true -Message $msg
