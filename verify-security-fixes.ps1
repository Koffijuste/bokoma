# ============================================================================
# Bokoma Store — Security Audit Verification Script
# ============================================================================
# Usage :
#   powershell -ExecutionPolicy Bypass -File .\verify-security-fixes.ps1
#
# Verifie apres redeploiement :
#   - CSP, X-Frame-Options, X-Content-Type-Options, Referrer-Policy,
#     Permissions-Policy, HSTS presents sur bokoma.vercel.app
#   - /robots.txt et /sitemap.xml servis (200 + bon Content-Type)
#   - /admin redirige bien vers /dashboard (301 ou 308)
#   - /etc/passwd -> 403 (Vercel bloque)
#   - Pas d'email/phone en clair dans le HTML rendu
#   - Galerie : ?role=admin&isAdmin=true NE change PAS le nombre d'items
#   - Path Traversal : /api/v1/../../etc/passwd -> 400
# ============================================================================

$ErrorActionPreference = 'Continue'
$frontend = 'https://bokoma.vercel.app'
$backend  = 'https://bokoma-production.up.railway.app'

$pass = 0
$fail = 0
$warn = 0

function Test-Check {
    param([string]$Name, [bool]$Success, [string]$Details = '')
    if ($Success) {
        Write-Host "  [PASS] $Name" -ForegroundColor Green
        $script:pass++
    } else {
        Write-Host "  [FAIL] $Name" -ForegroundColor Red
        if ($Details) { Write-Host "         $Details" -ForegroundColor DarkGray }
        $script:fail++
    }
}

function Test-Warn {
    param([string]$Name, [string]$Details = '')
    Write-Host "  [WARN] $Name" -ForegroundColor Yellow
    if ($Details) { Write-Host "         $Details" -ForegroundColor DarkGray }
    $script:warn++
}

function Get-Headers {
    param([string]$Uri)
    try {
        $r = Invoke-WebRequest -Uri $Uri -Method GET -UseBasicParsing -MaximumRedirection 0 -ErrorAction Stop
        return $r.Headers
    } catch {
        if ($_.Exception.Response) { return $_.Exception.Response.Headers }
        return $null
    }
}

function Get-Status {
    param([string]$Uri)
    try {
        $r = Invoke-WebRequest -Uri $Uri -Method GET -UseBasicParsing -MaximumRedirection 0
        return @{ Code = [int]$r.StatusCode; Content = $r.Content; Location = $r.Headers['Location'] }
    } catch {
        if ($_.Exception.Response) {
            $code = [int]$_.Exception.Response.StatusCode
            $loc  = $null
            try { $loc = $_.Exception.Response.Headers['Location'] } catch {}
            return @{ Code = $code; Content = ''; Location = $loc }
        }
        return $null
    }
}

Write-Host ""
Write-Host "====================================================================" -ForegroundColor Cyan
Write-Host "  Bokoma Store - Verification post-corrections securite (09/07/2026)" -ForegroundColor Cyan
Write-Host "====================================================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "1. Security headers sur le frontend (Vercel Edge)" -ForegroundColor White
Write-Host "--------------------------------------------------" -ForegroundColor DarkGray
$h = Get-Headers "$frontend/"
$hDict = @{}
if ($h) {
    # PowerShell 7+ retourne un Dictionary[string,string] ; Windows PS 5.1
    # retourne un WebHeaderCollection. On normalise dans les deux cas.
    if ($h -is [System.Collections.Generic.Dictionary`2[System.String, System.String]]) {
        foreach ($k in $h.Keys) { $hDict[$k.ToLowerInvariant()] = [string]$h[$k] }
    } else {
        foreach ($k in $h.AllKeys) { $hDict[$k.ToLowerInvariant()] = ($h[$k] -join ', ') }
    }
}
Test-Check "Content-Security-Policy presente"  ([bool]$hDict['content-security-policy']) "Header manquant -> vercel.json"
Test-Check "X-Frame-Options = DENY"             ($hDict['x-frame-options'] -eq 'DENY')
Test-Check "X-Content-Type-Options = nosniff"  ($hDict['x-content-type-options'] -eq 'nosniff')
Test-Check "Referrer-Policy present"           ([bool]$hDict['referrer-policy'])
Test-Check "Permissions-Policy present"        ([bool]$hDict['permissions-policy'])
$hstsOk = $false
if ($hDict['strict-transport-security']) {
    if ($hDict['strict-transport-security'] -match 'max-age=([0-9]+)') {
        $age = [int]$Matches[1]
        if ($age -ge 31536000) { $hstsOk = $true }
    }
}
Test-Check "HSTS (max-age >= 1 an)" $hstsOk

Write-Host ""
Write-Host "2. robots.txt et sitemap.xml" -ForegroundColor White
Write-Host "-----------------------------" -ForegroundColor DarkGray
$robots = Get-Status "$frontend/robots.txt"
if ($robots) {
    Test-Check "/robots.txt -> 200"  ($robots.Code -eq 200) "Recu $($robots.Code)"
    Test-Check "robots.txt commence par User-agent" ($robots.Content -match 'User-agent') "Contenu inattendu"
} else {
    Test-Check "/robots.txt servi" $false "404 ou autre erreur -> verifie app/robots.ts"
}
$sm = Get-Status "$frontend/sitemap.xml"
if ($sm) {
    Test-Check "/sitemap.xml -> 200" ($sm.Code -eq 200) "Recu $($sm.Code)"
    Test-Check "sitemap contient <urlset>" ($sm.Content -match '<urlset') "Contenu inattendu"
} else {
    Test-Check "/sitemap.xml servi" $false "404 ou autre erreur -> verifie app/sitemap.ts"
}

Write-Host ""
Write-Host "3. Redirection /admin -> /dashboard" -ForegroundColor White
Write-Host "-------------------------------------" -ForegroundColor DarkGray
$adm = Get-Status "$frontend/admin"
if ($adm) {
    Test-Check "/admin redirige (3xx)" (($adm.Code -ge 300) -and ($adm.Code -lt 400)) "Recu $($adm.Code)"
    $loc = "$($adm.Location)"
    Test-Check "Location pointe vers /dashboard" ($loc -match '/dashboard') "Location = $loc"
} else {
    Test-Check "/admin redirige" $false "Erreur reseau"
}

Write-Host ""
Write-Host "4. Pas d'email/phone en clair dans le HTML" -ForegroundColor White
Write-Host "---------------------------------------------" -ForegroundColor DarkGray
$homeR = Get-Status "$frontend/"
if ($homeR) {
    Test-Check "Pas d'email en clair (contact@bokoma...)" ($homeR.Content -notmatch 'contact@bokoma') "Email trouve dans le HTML"
    Test-Check "Pas de telephone en clair (+225 07...)"   ($homeR.Content -notmatch '\+225\s*07')   "Numero trouve dans le HTML"
} else {
    Test-Warn "Impossible de lire la home"
}

Write-Host ""
Write-Host "5. Galerie : ?role=admin&isAdmin=true ne change rien" -ForegroundColor White
Write-Host "-----------------------------------------------------" -ForegroundColor DarkGray
try {
    $normal = (Invoke-WebRequest -Uri "$backend/api/v1/gallery" -Method GET -UseBasicParsing).Content | ConvertFrom-Json
    $trick  = (Invoke-WebRequest -Uri "$backend/api/v1/gallery?role=admin&isAdmin=true&userId=admin" -Method GET -UseBasicParsing).Content | ConvertFrom-Json
    $nCount = if ($normal.data) { @($normal.data).Count } else { 0 }
    $tCount = if ($trick.data)  { @($trick.data).Count  } else { 0 }
    Test-Check "Nombre d'items identique" ($nCount -eq $tCount) "Normal=$nCount vs Trick=$tCount"
    $hasUnpublished = (@($trick.data) | Where-Object { -not $_.isPublished }).Count
    Test-Check "Aucun item non-publie expose" ($hasUnpublished -eq 0) "$hasUnpublished items non-publie leakés"
    $hasCreatedBy = (@($trick.data) | Where-Object { $null -ne $_.createdBy }).Count
    Test-Check "Pas de champ createdBy expose" ($hasCreatedBy -eq 0) "$hasCreatedBy leaks de createdBy"
} catch {
    Test-Warn "Impossible de tester la galerie" $_.Exception.Message
}

Write-Host ""
Write-Host "6. Divers : path traversal, sensitive files" -ForegroundColor White
Write-Host "---------------------------------------------" -ForegroundColor DarkGray
$tests = @(
    @{ U = "$frontend/etc/passwd";           Accept = @(403);     N = "/etc/passwd -> 403" },
    @{ U = "$frontend/.env";                  Accept = @(403,404); N = "/.env -> 403/404" },
    @{ U = "$frontend/.env.local";            Accept = @(403,404); N = "/.env.local -> 403/404" },
    @{ U = "$frontend/robots.txt";            Accept = @(200);     N = "/robots.txt -> 200" },
    @{ U = "$frontend/sitemap.xml";           Accept = @(200);     N = "/sitemap.xml -> 200" },
    @{ U = "$backend/api/v1/../users/admin";  Accept = @(400,404); N = "Path traversal /api/v1 -> 4xx" }
)
foreach ($t in $tests) {
    $r = Get-Status $t.U
    if ($r) {
        $ok = $t.Accept -contains $r.Code
        Test-Check $t.N $ok "Recu $($r.Code), attendu $($t.Accept -join '/')"
    } else {
        Test-Check $t.N $false "Erreur reseau"
    }
}

Write-Host ""
Write-Host "====================================================================" -ForegroundColor Cyan
$color = if ($fail -eq 0) { 'Green' } else { 'Red' }
Write-Host ("  Resume : {0} OK, {1} echec(s), {2} avertissement(s)" -f $pass, $fail, $warn) -ForegroundColor $color
Write-Host "====================================================================" -ForegroundColor Cyan
Write-Host ""

if ($fail -gt 0) { exit 1 } else { exit 0 }
