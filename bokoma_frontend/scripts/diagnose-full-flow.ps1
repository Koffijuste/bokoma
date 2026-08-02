# scripts/diagnose-full-flow.ps1
# ============================================================================
# 🔍 DIAGNOSTIC COMPLET — simule le flow navigateur complet
# ============================================================================
# Fait exactement ce que fait Chrome quand tu charges /dashboard/products :
#   1. POST /auth/login       → récupère les cookies
#   2. GET  /auth/me          → vérifie la session
#   3. GET  /categories       → vérifie qu'on récupère les cats
#   4. GET  /dashboard/stats  → vérifie que les autres endpoints marchent
# Affiche CHAQUE réponse complète pour identifier où ça coince.
# ============================================================================

$ErrorActionPreference = 'Continue'
$baseUrl = 'https://bokoma-production.up.railway.app/api/v1'
$email = 'martinemarie922@gmail.com'
$password = 'Bonne!78@'

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  1. LOGIN (avec le backend Railway)" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
try {
    $body = @{ email = $email; password = $password } | ConvertTo-Json
    $loginRes = Invoke-RestMethod -Uri "$baseUrl/auth/login" -Method POST `
        -Body $body -ContentType 'application/json' `
        -SessionVariable session -ErrorAction Stop
    Write-Host "✅ Login OK" -ForegroundColor Green
    Write-Host "Tokens reçus :"
    Write-Host "  - accessToken : $($loginRes.data.accessToken.Substring(0, 30))..."
    Write-Host "  - user        : $($loginRes.data.user.email) (role=$($loginRes.data.user.role))"
    Write-Host "`nCookies reçus :"
    $session.Cookies.GetCookies($baseUrl) | ForEach-Object {
        Write-Host "  - $($_.Name) = $($_.Value.Substring(0, [Math]::Min(30, $_.Value.Length)))..." -ForegroundColor Yellow
    }
} catch {
    Write-Host "❌ LOGIN ÉCHOUÉ" -ForegroundColor Red
    Write-Host "Erreur : $($_.Exception.Message)" -ForegroundColor Red
    if ($_.Exception.Response) {
        $status = [int]$_.Exception.Response.StatusCode
        Write-Host "Status : $status" -ForegroundColor Red
    }
    exit 1
}

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  2. /auth/me (vérification session)" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
try {
    $me = Invoke-RestMethod -Uri "$baseUrl/auth/me" -Method GET `
        -WebSession $session -ErrorAction Stop
    Write-Host "✅ Session valide" -ForegroundColor Green
    Write-Host "User : $($me.user.email) (role=$($me.user.role))"
} catch {
    $status = [int]$_.Exception.Response.StatusCode
    Write-Host "❌ /auth/me a renvoyé $status" -ForegroundColor Red
    if ($_.Exception.Response) {
        $reader = [System.IO.StreamReader]::new($_.Exception.Response.GetResponseStream())
        $body = $reader.ReadToEnd()
        Write-Host "Body : $body" -ForegroundColor Red
    }
}

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  3. /categories (le bug principal)" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
try {
    $cats = Invoke-RestMethod -Uri "$baseUrl/categories" -Method GET `
        -WebSession $session -ErrorAction Stop
    Write-Host "✅ /categories OK" -ForegroundColor Green
    Write-Host "Nombre de catégories : $($cats.categories.Count)" -ForegroundColor Green
    Write-Host "Première catégorie : $($cats.categories[0].name) (id=$($cats.categories[0]._id))"
} catch {
    $status = [int]$_.Exception.Response.StatusCode
    Write-Host "❌ /categories a renvoyé $status" -ForegroundColor Red
    if ($_.Exception.Response) {
        $reader = [System.IO.StreamReader]::new($_.Exception.Response.GetResponseStream())
        $body = $reader.ReadToEnd()
        Write-Host "Body : $body" -ForegroundColor Red
    }
}

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  4. /dashboard/stats (vérif endpoints admin)" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
try {
    $stats = Invoke-RestMethod -Uri "$baseUrl/dashboard/stats" -Method GET `
        -WebSession $session -ErrorAction Stop
    Write-Host "✅ /dashboard/stats OK" -ForegroundColor Green
} catch {
    $status = [int]$_.Exception.Response.StatusCode
    Write-Host "⚠️  /dashboard/stats a renvoyé $status" -ForegroundColor Yellow
    if ($_.Exception.Response) {
        $reader = [System.IO.StreamReader]::new($_.Exception.Response.GetResponseStream())
        $body = $reader.ReadToEnd()
        Write-Host "Body : $body" -ForegroundColor Yellow
    }
}

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  5. /products (test pagination de base)" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
try {
    $prods = Invoke-RestMethod -Uri "$baseUrl/products?page=1&limit=5" -Method GET `
        -WebSession $session -ErrorAction Stop
    Write-Host "✅ /products OK" -ForegroundColor Green
    Write-Host "Nombre de produits : $($prods.products.Count)"
} catch {
    $status = [int]$_.Exception.Response.StatusCode
    Write-Host "❌ /products a renvoyé $status" -ForegroundColor Red
}

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  RÉSUMÉ" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Si tu vois ✅ partout → le backend marche, le bug est 100% frontend" -ForegroundColor Green
Write-Host "Si tu vois ❌ sur /auth/me → ton token est mort, il faut se reconnecter" -ForegroundColor Yellow
Write-Host "Si tu vois ❌ sur /categories → le backend bloque cet endpoint sans auth" -ForegroundColor Yellow
Write-Host "Si tu vois ❌ sur /dashboard/stats → c'est un autre bug (charts, etc.)" -ForegroundColor Yellow
