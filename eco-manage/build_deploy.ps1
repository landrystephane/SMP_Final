$ErrorActionPreference = "Stop"

Write-Host "Création du dossier de déploiement..."
$DeployDir = "deploy_saas"
if (Test-Path $DeployDir) { Remove-Item -Recurse -Force $DeployDir }
New-Item -ItemType Directory -Path $DeployDir | Out-Null

Write-Host "Copie des fichiers..."
Copy-Item -Path "dist" -Destination "$DeployDir\dist" -Recurse
Copy-Item -Path "server.js" -Destination "$DeployDir\"
Copy-Item -Path "package.json" -Destination "$DeployDir\"
Copy-Item -Path "ecosystem.config.js" -Destination "$DeployDir\"

New-Item -ItemType Directory -Path "$DeployDir\electron" | Out-Null
Copy-Item -Path "electron\database" -Destination "$DeployDir\electron\database" -Recurse

Write-Host "Compression de l'application (deploy.zip)..."
if (Test-Path "deploy.zip") { Remove-Item -Force "deploy.zip" }
Compress-Archive -Path "$DeployDir\*" -DestinationPath "deploy.zip"

Write-Host "Nettoyage..."
Remove-Item -Recurse -Force $DeployDir

Write-Host "Succès ! Le fichier deploy.zip est prêt."
