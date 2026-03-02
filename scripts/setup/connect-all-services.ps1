# =============================================================================
# DraggonnB Platform - Connect All Services
# =============================================================================
# Run from project root: .\scripts\setup\connect-all-services.ps1
# Requires: PowerShell 7+, .env.local (from initial setup)
#
# This script connects and verifies: Supabase, Vercel, Resend, VPS/N8N, Gitea
# =============================================================================

param(
    [switch]$SkipVercel,
    [switch]$SkipResend,
    [switch]$SkipN8N,
    [switch]$SkipGitea,
    [switch]$SkipVPS,
    [switch]$SyncEnvToVercel
)

$ErrorActionPreference = "Continue"
$script:results = @{}
$script:warnings = @()

# ── Helpers ──────────────────────────────────────────────────────────────────

function Write-Status($service, $status, $detail) {
    $icon = switch ($status) {
        "OK"      { "[OK]" }
        "WARN"    { "[!!]" }
        "FAIL"    { "[XX]" }
        "SKIP"    { "[--]" }
        "INFO"    { "[ii]" }
    }
    $color = switch ($status) {
        "OK"      { "Green" }
        "WARN"    { "Yellow" }
        "FAIL"    { "Red" }
        "SKIP"    { "DarkGray" }
        "INFO"    { "Cyan" }
    }
    Write-Host "  $icon " -ForegroundColor $color -NoNewline
    Write-Host "$service" -ForegroundColor White -NoNewline
    if ($detail) { Write-Host " - $detail" -ForegroundColor Gray } else { Write-Host "" }
    $script:results[$service] = $status
}

function Load-EnvFile {
    $envPath = Join-Path $PSScriptRoot "../../.env.local"
    if (-not (Test-Path $envPath)) {
        Write-Host "`n  .env.local not found! Run the initial setup script first." -ForegroundColor Red
        exit 1
    }
    $envVars = @{}
    Get-Content $envPath | ForEach-Object {
        $line = $_.Trim()
        if ($line -and -not $line.StartsWith("#")) {
            $parts = $line -split "=", 2
            if ($parts.Count -eq 2) {
                $key = $parts[0].Trim()
                $val = $parts[1].Trim()
                $envVars[$key] = $val
                [System.Environment]::SetEnvironmentVariable($key, $val, "Process")
            }
        }
    }
    return $envVars
}

function Invoke-WithRetry($uri, $headers, $method = "GET", $body = $null, $retries = 3) {
    for ($i = 0; $i -lt $retries; $i++) {
        try {
            $params = @{ Uri = $uri; Headers = $headers; Method = $method; ErrorAction = "Stop" }
            if ($body) {
                $params["Body"] = ($body | ConvertTo-Json -Depth 10)
                $params["ContentType"] = "application/json"
            }
            return Invoke-RestMethod @params
        }
        catch {
            if ($i -lt ($retries - 1)) {
                $wait = [math]::Pow(2, $i + 1)
                Write-Host "    Retry in ${wait}s..." -ForegroundColor DarkGray
                Start-Sleep -Seconds $wait
            }
            else { throw $_ }
        }
    }
}

# ── Banner ───────────────────────────────────────────────────────────────────

Write-Host ""
Write-Host "  =============================================" -ForegroundColor Cyan
Write-Host "  DraggonnB Platform - Service Connector" -ForegroundColor Cyan
Write-Host "  =============================================" -ForegroundColor Cyan
Write-Host ""

# ── Load .env.local ─────────────────────────────────────────────────────────

Write-Host "  Loading .env.local..." -ForegroundColor Gray
$envVars = Load-EnvFile
$envCount = ($envVars.Keys | Where-Object { $envVars[$_] -and $envVars[$_] -notmatch "^(your-|REPLACE)" }).Count
Write-Status "ENV" "OK" "$envCount configured variables loaded"

# =============================================================================
# 1. SUPABASE
# =============================================================================

Write-Host "`n  --- SUPABASE ---" -ForegroundColor Yellow

$supabaseUrl = $envVars["NEXT_PUBLIC_SUPABASE_URL"]
$supabaseAnon = $envVars["NEXT_PUBLIC_SUPABASE_ANON_KEY"]
$supabaseService = $envVars["SUPABASE_SERVICE_ROLE_KEY"]

if ($supabaseUrl -and $supabaseAnon -and $supabaseService -and $supabaseService -ne "your-service-role-key") {
    try {
        $headers = @{
            "apikey"        = $supabaseService
            "Authorization" = "Bearer $supabaseService"
        }
        $orgs = Invoke-WithRetry "$supabaseUrl/rest/v1/organizations?select=id,name,subdomain&limit=5" $headers
        $orgCount = if ($orgs -is [array]) { $orgs.Count } else { if ($orgs) { 1 } else { 0 } }
        Write-Status "Supabase" "OK" "Connected. $orgCount organization(s) found."
        if ($orgs -and $orgCount -gt 0) {
            $orgList = if ($orgs -is [array]) { $orgs } else { @($orgs) }
            foreach ($org in $orgList) {
                Write-Host "    -> $($org.name) ($($org.subdomain))" -ForegroundColor DarkCyan
            }
        }
    }
    catch {
        Write-Status "Supabase" "WARN" "Keys set but query failed: $($_.Exception.Message)"
    }
}
else {
    Write-Status "Supabase" "FAIL" "Missing keys in .env.local"
}

# =============================================================================
# 2. VERCEL
# =============================================================================

Write-Host "`n  --- VERCEL ---" -ForegroundColor Yellow

if ($SkipVercel) {
    Write-Status "Vercel" "SKIP" "Skipped via -SkipVercel"
}
else {
    # Check for token
    $vercelToken = $env:VERCEL_TOKEN
    if (-not $vercelToken) {
        Write-Host "    Enter your Vercel token (from vercel.com/account/tokens):" -ForegroundColor White
        $vercelToken = Read-Host "    Token"
        if ($vercelToken) {
            $env:VERCEL_TOKEN = $vercelToken
        }
    }

    if ($vercelToken) {
        try {
            $vHeaders = @{ "Authorization" = "Bearer $vercelToken" }

            # Get projects
            $projects = Invoke-WithRetry "https://api.vercel.com/v9/projects" $vHeaders
            $projList = $projects.projects

            # Find draggonnb project
            $draggonnb = $projList | Where-Object { $_.name -match "draggonnb" } | Select-Object -First 1

            if ($draggonnb) {
                Write-Status "Vercel Project" "OK" "$($draggonnb.name) (id: $($draggonnb.id))"

                # Check domains
                try {
                    $domains = Invoke-WithRetry "https://api.vercel.com/v9/projects/$($draggonnb.id)/domains" $vHeaders
                    $domainList = $domains.domains
                    Write-Status "Vercel Domains" "INFO" "$($domainList.Count) domain(s) configured"
                    foreach ($d in $domainList) {
                        $verified = if ($d.verified) { "verified" } else { "UNVERIFIED" }
                        Write-Host "    -> $($d.name) ($verified)" -ForegroundColor DarkCyan
                    }

                    # Check for wildcard
                    $hasWildcard = $domainList | Where-Object { $_.name -match "^\*\." }
                    if (-not $hasWildcard) {
                        Write-Status "Wildcard Domain" "WARN" "No *.draggonnb.co.za wildcard domain. Multi-tenant subdomains won't work."
                        $script:warnings += "Add wildcard domain *.draggonnb.co.za to Vercel project"
                    }
                    else {
                        Write-Status "Wildcard Domain" "OK" "Wildcard domain configured"
                    }
                }
                catch {
                    Write-Status "Vercel Domains" "WARN" "Could not fetch domains: $($_.Exception.Message)"
                }

                # Check env vars on Vercel
                try {
                    $vEnvs = Invoke-WithRetry "https://api.vercel.com/v9/projects/$($draggonnb.id)/env" $vHeaders
                    $vEnvList = $vEnvs.envs
                    Write-Status "Vercel Env Vars" "INFO" "$($vEnvList.Count) env var(s) on Vercel"

                    # Check critical vars
                    $criticalVars = @(
                        "NEXT_PUBLIC_SUPABASE_URL",
                        "NEXT_PUBLIC_SUPABASE_ANON_KEY",
                        "SUPABASE_SERVICE_ROLE_KEY",
                        "RESEND_API_KEY"
                    )
                    $vEnvNames = $vEnvList | ForEach-Object { $_.key }
                    $missingOnVercel = $criticalVars | Where-Object { $_ -notin $vEnvNames }
                    if ($missingOnVercel) {
                        Write-Status "Vercel Critical Vars" "WARN" "Missing on Vercel: $($missingOnVercel -join ', ')"
                        $script:warnings += "Sync missing env vars to Vercel: $($missingOnVercel -join ', ')"
                    }
                    else {
                        Write-Status "Vercel Critical Vars" "OK" "All critical env vars present"
                    }
                }
                catch {
                    Write-Status "Vercel Env Vars" "WARN" "Could not fetch env vars: $($_.Exception.Message)"
                }

                # Sync env vars to Vercel if requested
                if ($SyncEnvToVercel) {
                    Write-Host "`n    Syncing env vars to Vercel..." -ForegroundColor Cyan
                    $syncVars = @(
                        "NEXT_PUBLIC_SUPABASE_URL",
                        "NEXT_PUBLIC_SUPABASE_ANON_KEY",
                        "SUPABASE_SERVICE_ROLE_KEY",
                        "NEXT_PUBLIC_APP_URL",
                        "N8N_BASE_URL",
                        "N8N_WEBHOOK_CONTENT_GENERATOR",
                        "N8N_WEBHOOK_ANALYTICS",
                        "N8N_WEBHOOK_EMAIL_CONTENT",
                        "N8N_WEBHOOK_SOCIAL_CONTENT",
                        "RESEND_API_KEY",
                        "EMAIL_FROM",
                        "PAYFAST_MERCHANT_ID",
                        "PAYFAST_MERCHANT_KEY",
                        "PAYFAST_MODE"
                    )

                    $synced = 0
                    $skipped = 0
                    foreach ($varName in $syncVars) {
                        $val = $envVars[$varName]
                        if ($val -and $val -notmatch "^(your-|REPLACE)") {
                            $existing = $vEnvList | Where-Object { $_.key -eq $varName }
                            if ($existing) {
                                Write-Host "    -> $varName (already exists, skipping)" -ForegroundColor DarkGray
                                $skipped++
                            }
                            else {
                                try {
                                    $body = @{
                                        key    = $varName
                                        value  = $val
                                        type   = if ($varName -match "^NEXT_PUBLIC_") { "plain" } else { "encrypted" }
                                        target = @("production", "preview", "development")
                                    }
                                    Invoke-WithRetry "https://api.vercel.com/v10/projects/$($draggonnb.id)/env" $vHeaders "POST" $body | Out-Null
                                    Write-Host "    -> $varName (synced)" -ForegroundColor Green
                                    $synced++
                                }
                                catch {
                                    Write-Host "    -> $varName (FAILED: $($_.Exception.Message))" -ForegroundColor Red
                                }
                            }
                        }
                    }
                    Write-Status "Vercel Env Sync" "OK" "$synced synced, $skipped already existed"
                }

                # Check latest deployment
                try {
                    $deploys = Invoke-WithRetry "https://api.vercel.com/v6/deployments?projectId=$($draggonnb.id)&limit=1" $vHeaders
                    $latest = $deploys.deployments | Select-Object -First 1
                    if ($latest) {
                        $state = $latest.state
                        $stateColor = switch ($state) {
                            "READY"    { "OK" }
                            "ERROR"    { "FAIL" }
                            "BUILDING" { "WARN" }
                            default    { "INFO" }
                        }
                        $createdAt = [DateTimeOffset]::FromUnixTimeMilliseconds($latest.created).ToString("yyyy-MM-dd HH:mm")
                        Write-Status "Latest Deploy" $stateColor "$state at $createdAt -> $($latest.url)"
                    }
                }
                catch {
                    Write-Status "Latest Deploy" "WARN" "Could not fetch deployments"
                }
            }
            else {
                Write-Status "Vercel Project" "WARN" "No 'draggonnb' project found. Projects: $($projList.name -join ', ')"
            }
        }
        catch {
            Write-Status "Vercel" "FAIL" "API error: $($_.Exception.Message)"
        }
    }
    else {
        Write-Status "Vercel" "SKIP" "No token provided"
    }
}

# =============================================================================
# 3. RESEND (Email)
# =============================================================================

Write-Host "`n  --- RESEND ---" -ForegroundColor Yellow

if ($SkipResend) {
    Write-Status "Resend" "SKIP" "Skipped via -SkipResend"
}
else {
    $resendKey = $envVars["RESEND_API_KEY"]
    if ($resendKey -and $resendKey -ne "your-resend-api-key") {
        try {
            $rHeaders = @{ "Authorization" = "Bearer $resendKey" }
            $domains = Invoke-WithRetry "https://api.resend.com/domains" $rHeaders
            Write-Status "Resend API" "OK" "Connected"
            if ($domains.data) {
                foreach ($d in $domains.data) {
                    $status = $d.status
                    $statusLevel = if ($status -eq "verified") { "OK" } else { "WARN" }
                    Write-Status "  Domain: $($d.name)" $statusLevel $status
                }
            }
            else {
                Write-Status "Resend Domains" "WARN" "No domains configured. Add a domain at resend.com/domains"
                $script:warnings += "Add a sending domain in Resend"
            }

            # Check API keys info
            try {
                $apiKeys = Invoke-WithRetry "https://api.resend.com/api-keys" $rHeaders
                Write-Status "Resend API Keys" "INFO" "$($apiKeys.data.Count) key(s)"
            }
            catch {}
        }
        catch {
            Write-Status "Resend" "FAIL" "API error: $($_.Exception.Message)"
        }
    }
    else {
        Write-Status "Resend" "FAIL" "No API key in .env.local"
    }
}

# =============================================================================
# 4. VPS / SSH
# =============================================================================

Write-Host "`n  --- VPS ---" -ForegroundColor Yellow

if ($SkipVPS) {
    Write-Status "VPS" "SKIP" "Skipped via -SkipVPS"
}
else {
    # Test SSH connectivity
    try {
        $sshTest = ssh -o ConnectTimeout=5 -o BatchMode=yes hostinger-vps "echo CONNECTED && hostname && uptime" 2>&1
        if ($sshTest -match "CONNECTED") {
            $lines = $sshTest -split "`n"
            Write-Status "VPS SSH" "OK" "Connected to $($lines[1])"
            Write-Host "    Uptime: $($lines[2])" -ForegroundColor DarkCyan

            # Check Docker containers
            $containers = ssh -o ConnectTimeout=5 hostinger-vps "docker ps --format '{{.Names}} {{.Status}}'" 2>&1
            if ($containers) {
                Write-Status "Docker" "OK" "Containers running:"
                foreach ($c in ($containers -split "`n")) {
                    if ($c.Trim()) { Write-Host "    -> $c" -ForegroundColor DarkCyan }
                }
            }
            else {
                Write-Status "Docker" "WARN" "No containers running or docker not available"
            }
        }
        else {
            Write-Status "VPS SSH" "FAIL" "Could not connect. Check SSH config for 'hostinger-vps'"
            $script:warnings += "Configure SSH: Add 'hostinger-vps' to ~/.ssh/config"
        }
    }
    catch {
        Write-Status "VPS SSH" "FAIL" "SSH not available or connection failed"
        $script:warnings += "Configure SSH: Add 'hostinger-vps' to ~/.ssh/config"
    }
}

# =============================================================================
# 5. N8N
# =============================================================================

Write-Host "`n  --- N8N ---" -ForegroundColor Yellow

if ($SkipN8N) {
    Write-Status "N8N" "SKIP" "Skipped via -SkipN8N"
}
else {
    $n8nUrl = $envVars["N8N_BASE_URL"]
    if (-not $n8nUrl) { $n8nUrl = "https://n8n.srv1114684.hstgr.cloud" }

    # Basic connectivity check (no auth needed for health)
    try {
        $n8nHealth = Invoke-WebRequest -Uri "$n8nUrl/healthz" -TimeoutSec 10 -ErrorAction Stop
        if ($n8nHealth.StatusCode -eq 200) {
            Write-Status "N8N Health" "OK" "Reachable at $n8nUrl"
        }
    }
    catch {
        # Try without healthz - just check if host responds
        try {
            $n8nCheck = Invoke-WebRequest -Uri $n8nUrl -TimeoutSec 10 -MaximumRedirection 0 -ErrorAction SilentlyContinue
            Write-Status "N8N" "OK" "Reachable at $n8nUrl (status: $($n8nCheck.StatusCode))"
        }
        catch {
            if ($_.Exception.Response) {
                Write-Status "N8N" "OK" "Reachable at $n8nUrl (redirects to login)"
            }
            else {
                Write-Status "N8N" "FAIL" "Cannot reach $n8nUrl"
                $script:warnings += "N8N not reachable. Check VPS Docker containers."
            }
        }
    }

    # Check N8N API if key available
    $n8nApiKey = $env:N8N_API_KEY
    if (-not $n8nApiKey) {
        $n8nApiKey = $envVars["N8N_API_KEY"]
    }
    if ($n8nApiKey -and $n8nApiKey -ne "your-n8n-api-key") {
        try {
            $n8nHeaders = @{ "X-N8N-API-KEY" = $n8nApiKey }
            $workflows = Invoke-WithRetry "$n8nUrl/api/v1/workflows" $n8nHeaders
            $wfCount = if ($workflows.data) { $workflows.data.Count } else { 0 }
            Write-Status "N8N API" "OK" "$wfCount workflow(s) found"
            if ($workflows.data) {
                foreach ($wf in $workflows.data | Select-Object -First 5) {
                    $active = if ($wf.active) { "ACTIVE" } else { "inactive" }
                    Write-Host "    -> $($wf.name) ($active)" -ForegroundColor DarkCyan
                }
                if ($wfCount -gt 5) {
                    Write-Host "    -> ... and $($wfCount - 5) more" -ForegroundColor DarkGray
                }
            }
        }
        catch {
            Write-Status "N8N API" "WARN" "API key set but request failed: $($_.Exception.Message)"
        }
    }
    else {
        Write-Status "N8N API" "INFO" "No API key. Get one from $n8nUrl/settings/api"
        $script:warnings += "Generate N8N API key at $n8nUrl/settings/api"
    }
}

# =============================================================================
# 6. GITEA
# =============================================================================

Write-Host "`n  --- GITEA ---" -ForegroundColor Yellow

if ($SkipGitea) {
    Write-Status "Gitea" "SKIP" "Skipped via -SkipGitea"
}
else {
    $giteaUrl = "https://git.draggonnb.online"
    $giteaToken = $env:GITEA_TOKEN

    # Connectivity check
    try {
        $giteaCheck = Invoke-WebRequest -Uri "$giteaUrl/api/v1/version" -TimeoutSec 10 -ErrorAction Stop
        $giteaVersion = ($giteaCheck.Content | ConvertFrom-Json).version
        Write-Status "Gitea" "OK" "Reachable. Version: $giteaVersion"
    }
    catch {
        Write-Status "Gitea" "FAIL" "Cannot reach $giteaUrl"
        $script:warnings += "Gitea not reachable. Check VPS."
    }

    if ($giteaToken) {
        try {
            $gHeaders = @{ "Authorization" = "token $giteaToken" }
            $repos = Invoke-WithRetry "$giteaUrl/api/v1/user/repos" $gHeaders
            Write-Status "Gitea API" "OK" "$($repos.Count) repo(s)"
            foreach ($r in $repos) {
                Write-Host "    -> $($r.full_name)" -ForegroundColor DarkCyan
            }
        }
        catch {
            Write-Status "Gitea API" "WARN" "Token set but request failed"
        }
    }
    else {
        Write-Status "Gitea API" "INFO" "No token. Create one at $giteaUrl/user/settings/applications"
        $script:warnings += "Generate Gitea token at $giteaUrl/user/settings/applications"
    }
}

# =============================================================================
# 7. LIVE SITE CHECK
# =============================================================================

Write-Host "`n  --- LIVE SITE ---" -ForegroundColor Yellow

$appUrl = $envVars["NEXT_PUBLIC_APP_URL"]
$prodUrl = "https://draggonnb-mvp.vercel.app"

foreach ($url in @($prodUrl)) {
    try {
        $response = Invoke-WebRequest -Uri $url -TimeoutSec 15 -MaximumRedirection 5 -ErrorAction Stop
        Write-Status "Site: $url" "OK" "Status $($response.StatusCode)"
    }
    catch {
        if ($_.Exception.Response) {
            Write-Status "Site: $url" "WARN" "Status $($_.Exception.Response.StatusCode)"
        }
        else {
            Write-Status "Site: $url" "FAIL" "Unreachable"
        }
    }
}

# =============================================================================
# SUMMARY
# =============================================================================

Write-Host "`n  =============================================" -ForegroundColor Cyan
Write-Host "  SUMMARY" -ForegroundColor Cyan
Write-Host "  =============================================" -ForegroundColor Cyan

$okCount = ($script:results.Values | Where-Object { $_ -eq "OK" }).Count
$warnCount = ($script:results.Values | Where-Object { $_ -eq "WARN" }).Count
$failCount = ($script:results.Values | Where-Object { $_ -eq "FAIL" }).Count
$skipCount = ($script:results.Values | Where-Object { $_ -eq "SKIP" }).Count

Write-Host "  OK: $okCount | Warnings: $warnCount | Failed: $failCount | Skipped: $skipCount" -ForegroundColor White

if ($script:warnings.Count -gt 0) {
    Write-Host "`n  Action items:" -ForegroundColor Yellow
    $i = 1
    foreach ($w in $script:warnings) {
        Write-Host "    $i. $w" -ForegroundColor Yellow
        $i++
    }
}

# Save results to file
$resultFile = Join-Path $PSScriptRoot "../../.planning/service-status.json"
$resultObj = @{
    timestamp = (Get-Date -Format "yyyy-MM-dd HH:mm:ss")
    results   = $script:results
    warnings  = $script:warnings
    env_vars_configured = $envCount
}
$resultObj | ConvertTo-Json -Depth 5 | Set-Content $resultFile -Force
Write-Host "`n  Results saved to .planning/service-status.json" -ForegroundColor Gray

Write-Host "`n  Next steps:" -ForegroundColor Cyan
Write-Host "    1. Fix any FAIL items above" -ForegroundColor White
Write-Host "    2. Re-run with -SyncEnvToVercel to push env vars to Vercel" -ForegroundColor White
Write-Host "    3. Run provisioning dry-run: npm run provision:test" -ForegroundColor White
Write-Host ""
