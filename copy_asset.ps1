if (!(Test-Path "frontend\public")) { New-Item -ItemType Directory -Path "frontend\public" }
Copy-Item "zetka.png" -Destination "frontend\public\zetka.png" -Force
