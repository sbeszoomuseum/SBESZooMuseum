# Fly.io Deployment Script for BioMuseum Backend
# Direct and simple deployment

$flyctlPath = "C:\Users\$env:USERNAME\.fly\bin\flyctl.exe"
Write-Host "BioMuseum Backend - Fly.io Deployment" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

# Navigate to backend
Write-Host "`n[STEP 1] Setting up..." -ForegroundColor Yellow
Set-Location "c:\BioMuseumNewRepo\BioMuseum-main\backend"
Write-Host "Working directory: $(Get-Location)" -ForegroundColor Green

# Step 2: Check auth
Write-Host "`n[STEP 2] Checking authentication..." -ForegroundColor Yellow
& "$flyctlPath" auth whoami

if ($LASTEXITCODE -ne 0) {
    Write-Host "Logging in..." -ForegroundColor Yellow
    & "$flyctlPath" auth login
}

# Step 3: Create/Deploy app
Write-Host "`n[STEP 3] Launching app on Fly.io..." -ForegroundColor Yellow
& "$flyctlPath" launch --name biomuseum-api --region lax --no-deploy 2>$null

# Step 4: Set secrets
Write-Host "`n[STEP 4] Setting environment secrets..." -ForegroundColor Yellow

& "$flyctlPath" secrets set `
    MONGODB_URI="mongodb+srv://SBZooMuseum:ZoomuseumSBES@zoomuseumsbes.cpaitiz.mongodb.net/?appName=ZOOMUSEUMSBES" `
    MONGO_URL="mongodb+srv://SBZooMuseum:ZoomuseumSBES@zoomuseumsbes.cpaitiz.mongodb.net/?appName=ZOOMUSEUMSBES" `
    DB_NAME="ZOOMUSEUMSBES" `
    GEMINI_API_KEY="AIzaSyAbpOeVf3xcFqnOwA_9o9O-NzFCTzZPRls" `
    UNSPLASH_ACCESS_KEY="xklESuKDIoWyExQaqL8tc5WBBi8pa_N771pT7Dres4A" `
    AUTHORIZED_ADMIN_EMAILS="sarthaknk08@gmail.com,sarthaknk07@gmail.com,sagargavali9623@gmail.com,sbzoomuseum@gmail.com" `
    FRONTEND_URL="https://biomuseumsbes.vercel.app,http://localhost:3000,http://localhost:3001" `
    CORS_ORIGINS="http://localhost:3000,http://localhost:3001,http://localhost:8000,https://biomuseumsbes.vercel.app" `
    GOOGLE_CLIENT_ID="569018908534-tqfonmfm4tumj2amigg49snjppeg118n.apps.googleusercontent.com" `
    GOOGLE_CLIENT_SECRET="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"

Write-Host "Secrets set!" -ForegroundColor Green

# Step 5: Deploy
Write-Host "`n[STEP 5] Deploying to Fly.io (3-5 min)..." -ForegroundColor Yellow
& "$flyctlPath" deploy

# Step 6: Status
Write-Host "`n[STEP 6] Deployment status..." -ForegroundColor Yellow
& "$flyctlPath" status

Write-Host "`n========================================" -ForegroundColor Green
Write-Host "DEPLOYMENT COMPLETE!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host "Your API: https://biomuseum-api.fly.dev" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Green
