try {
  $r = Invoke-WebRequest -Uri 'http://localhost:3000/api/auth/mercadopago' -MaximumRedirection 0 -ErrorAction Stop
  Write-Host "Status: $([int]$r.StatusCode)"
} catch {
  $resp = $_.Exception.Response
  if ($resp) {
    Write-Host "Status: $([int]$resp.StatusCode)"
    Write-Host "Location: $($resp.Headers['Location'])"
  } else {
    Write-Host "Error: $_"
  }
}
