# Human front door (Windows): explained questions, then the same engine as npm run create.
$ErrorActionPreference = 'Stop'

$Root = Split-Path -Parent $PSScriptRoot
if (-not $Root) {
  $Root = Split-Path -Parent $MyInvocation.MyCommand.Path
  $Root = Split-Path -Parent $Root
}
Set-Location $Root

if ($args.Count -gt 0) {
  & node (Join-Path $Root 'scripts/create.mjs') @args
  exit $LASTEXITCODE
}

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  Write-Error "Need Node.js to spawn an app. Install from https://nodejs.org (see README engines)."
}

function Read-Value([string]$Prompt, [string]$Default = $null) {
  $suffix = if ($null -ne $Default -and $Default -ne '') { " [$Default]" } else { '' }
  $reply = Read-Host "$Prompt$suffix"
  if ([string]::IsNullOrWhiteSpace($reply)) {
    return $Default
  }
  return $reply.Trim()
}

function Read-YesNo([string]$Prompt, [bool]$DefaultYes) {
  $hint = if ($DefaultYes) { 'Y/n' } else { 'y/N' }
  $fallback = if ($DefaultYes) { 'Y' } else { 'N' }
  $reply = Read-Value "$Prompt ($hint)" $fallback
  switch -Regex ($reply) {
    '^(?i)n(o)?$' { return $false }
    '^(?i)y(es)?$' { return $true }
    default { return $DefaultYes }
  }
}

function Convert-Host([string]$Raw) {
  switch -Regex ($Raw.Trim()) {
    '^(?i)(netlify|y|yes)$' { return 'netlify' }
    '^(?i)(none|skip|n|no)$' { return 'none' }
    default { throw 'Please answer netlify or none.' }
  }
}

Write-Host 'Spawn a new Angular app from this template. This checkout stays put.'

$name = $null
while (-not $name) {
  Write-Host @'

App name (kebab-case)
Goes into package.json, angular.json (project + dist/<name>/browser), the
browser tab title, site.ts, README, and LICENSE. Also used as the default
folder name. Lowercase, digits, hyphens - garden-tracker, not Garden Tracker.

'@
  $candidate = Read-Value 'App name (kebab-case)'
  if ($candidate -match '^[a-z0-9]+(-[a-z0-9]+)*$') {
    $name = $candidate
  }
  else {
    Write-Host 'That name is not kebab-case. Example: garden-tracker' -ForegroundColor Yellow
  }
}

$defaultDest = Join-Path '..' $name
$dest = $null
while (-not $dest) {
  Write-Host @"

Destination folder
We copy this template into a new folder. Default: $defaultDest (next to this
checkout). Skips node_modules, .git, dist, .angular, coverage, and .env files.
Don't pick this template folder - that's --in-place, not a spawn.

"@
  $candidate = Read-Value 'Destination folder' $defaultDest
  $destAbs = $ExecutionContext.SessionState.Path.GetUnresolvedProviderPathFromPSPath($candidate)
  $rootAbs = $ExecutionContext.SessionState.Path.GetUnresolvedProviderPathFromPSPath($Root)
  if ($destAbs -eq $rootAbs) {
    Write-Host 'Destination is the template root. Pick another folder.' -ForegroundColor Yellow
    continue
  }
  $dest = $candidate
}

Write-Host @'

Site URL (optional)
Placeholder in site.ts, README, and netlify.toml if you keep Netlify.
Change it later. Blank = https://example.netlify.app.

'@
$site = Read-Value 'Public site URL' 'https://example.netlify.app'

$hostChoice = $null
while (-not $hostChoice) {
  Write-Host @"

Hosting
  netlify  Keep netlify.toml. Publish dir is dist/$name/browser; unknown
           routes hit index.html. In Netlify: Import from GitHub. This script
           does not log in.
  none     Drop netlify.toml. You host dist/$name/browser yourself and set a
           fallback to index.html.

"@
  try {
    $hostChoice = Convert-Host (Read-Value "Host (netlify, or none = I'll configure deploy myself)" 'netlify')
  }
  catch {
    Write-Host $_ -ForegroundColor Yellow
  }
}

Write-Host @'

Supabase (optional)
Adds placeholder URL/anon-key files and @supabase/supabase-js.
Angular CLI won't load .env. Default No. Skip unless you need it.

'@
$createArgs = @(
  '--name', $name,
  '--dest', $dest,
  '--site', $site,
  '--host', $hostChoice
)
if (Read-YesNo 'Add a Supabase stub?' $false) {
  $createArgs += '--supabase'
}

Write-Host @'

git init (new folder only)
Runs git init -b main in the new folder. No remote, no push, template .git is
untouched. Default Yes.

'@
if (Read-YesNo 'git init in the new folder?' $true) {
  $createArgs += '--git'
}
else {
  $createArgs += '--no-git'
}

Write-Host ""
Write-Host "Copying template -> $dest and stamping name=$name host=$hostChoice"
& node (Join-Path $Root 'scripts/create.mjs') @createArgs
exit $LASTEXITCODE
