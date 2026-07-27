# scripts/diagnose-categories.ps1
# ============================================================================
# 🔍 DIAGNOSTIC — pourquoi les catégories ne s'affichent pas
# ============================================================================
# Teste directement l'API backend pour identifier si le problème est :
#   - Auth (token invalide / rôle insuffisant)
#   - Backend (endpoint cassé, DB vide)
#   - Frontend (bug d'affichage)
# ============================================================================

$ErrorActionPreference = 'Continue'
$baseUrl = 'https://bokoma-production.up.railway.app/api/v1'
$email = 'martinemarie922@gmail.com'
$password = 'Bonne!78@'

Write-Host "=== 1. LOGIN ===" -ForegroundColor Cyan
try {
    $body = @{ email = $email; password = $password } | ConvertTo-Json
    $loginRes = Invoke-RestMethod -Uri "$baseUrl/auth/login" -Method POST `
        -Body $body -ContentType 'application/json' `
        -SessionVariable session -ErrorAction Stop
    Write-Host "Login OK" -ForegroundColor Green
    Write-Host "Réponse brute :" -ForegroundColor Yellow
    $loginRes | ConvertTo-Json -Depth 5
} catch {
    Write-Host "❌ LOGIN FAILED: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "Status: $($_.Exception.Response.StatusCode.value__)" -ForegroundColor Red
    exit 1
}

Write-Host "`n=== 2. /auth/me (vérifier le rôle) ===" -ForegroundColor Cyan
try {
    $me = Invoke-RestMethod -Uri "$baseUrl/auth/me" -Method GET `
        -WebSession $session -ErrorAction Stop
    Write-Host "Utilisateur :" -ForegroundColor Yellow
    $me | ConvertTo-Json -Depth 3
    Write-Host "`nRôle : $($me.data.user.role)" -ForegroundColor Green
} catch {
    Write-Host "❌ /auth/me FAILED: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "Status: $($_.Exception.Response.StatusCode.value__)" -ForegroundColor Red
}

Write-Host "`n=== 3. /categories (le bug) ===" -ForegroundColor Cyan
try {
    $cats = Invoke-RestMethod -Uri "$baseUrl/categories" -Method GET `
        -WebSession $session -ErrorAction Stop
    Write-Host "Catégories trouvées : $($cats.data.categories.Count)" -ForegroundColor Green
    Write-Host "Réponse brute :" -ForegroundColor Yellow
    $cats | ConvertTo-Json -Depth 3
} catch {
    Write-Host "❌ /categories FAILED: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "Status: $($_.Exception.Response.StatusCode.value__)" -ForegroundColor Red
    if ($_.Exception.Response) {
        $reader = [System.IO.StreamReader]::new($_.Exception.Response.GetResponseStream())
        $reader.ReadToEnd()
    }
}
