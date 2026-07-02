# Generate self-signed SSL certificate for MediXR dev server
param([string]$OutDir, [string[]]$Names)

$ErrorActionPreference = "Stop"

$cert = New-SelfSignedCertificate `
  -DnsName $Names `
  -CertStoreLocation "Cert:\CurrentUser\My" `
  -NotAfter (Get-Date).AddYears(1) `
  -KeyAlgorithm RSA `
  -KeyLength 2048 `
  -FriendlyName "MediXR Dev"

$secPass = ConvertTo-SecureString -String "medixr" -Force -AsPlainText
$pfxPath = Join-Path $OutDir "server.pfx"
Export-PfxCertificate -Cert $cert -FilePath $pfxPath -Password $secPass | Out-Null
Remove-Item ("Cert:\CurrentUser\My\" + $cert.Thumbprint) -ErrorAction SilentlyContinue

Write-Host "CERT_OK"
