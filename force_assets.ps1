$targetDir = "frontend\public"
if (!(Test-Path $targetDir)) { New-Item -ItemType Directory -Path $targetDir }

# Find MP3 by extension and rename/copy
$mp3 = Get-ChildItem -Path . -Filter *.mp3 | Select-Object -First 1
if ($mp3) {
    Copy-Item $mp3.FullName -Destination "$targetDir\music.mp3" -Force
    Write-Host "Music copied: $($mp3.Name)"
}

# Copy PNGs
if (Test-Path "zetka.png") {
    Copy-Item "zetka.png" -Destination "$targetDir\zetka.png" -Force
    Write-Host "Zetka photo copied."
}

if (Test-Path "qris.png") {
    Copy-Item "qris.png" -Destination "$targetDir\qris.png" -Force
    Write-Host "QRIS copied."
}
