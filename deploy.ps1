# deploy.ps1

$envFile = ".env"

if (-Not (Test-Path $envFile)) {
    Write-Error ".env file not found at $envFile"
    exit 1
}

Write-Host "Loading environment variables from $envFile..."
Get-Content $envFile | ForEach-Object {
    if ($_ -match "^\s*#") { return }
    if ($_ -match "^\s*$") { return }
    $parts = $_ -split "=", 2
    if ($parts.Count -eq 2) {
        $key = $parts[0].Trim()
        $value = $parts[1].Trim()
        Write-Host "Setting $key"
        Set-Item -Path "Env:$key" -Value $value
    }
}

docker network inspect discocord_net > $null 2>&1
if ($LASTEXITCODE -ne 0) {
    docker network create discocord_net
}

Write-Host "Checking for old container..."
$container = docker ps -a --filter "name=discocord_fe" --format "{{.ID}}"
if ($container) {
    Write-Host "Removing old container..."
    docker rm -f discocord_fe
}

Write-Host "Checking for old image..."
$image = docker images -q discocord_fe
if ($image) {
    Write-Host "Removing old image..."
    docker rmi -f discocord_fe
}

Write-Host "Building new Docker image..."
docker build `
    --build-arg NEXT_PUBLIC_API_URL="http://discocordgw:8080" `
    --build-arg NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=$env:NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY `
    --build-arg CLERK_SECRET_KEY=$env:CLERK_SECRET_KEY `
    -t discocord_fe .

Write-Host "Running new container..."
docker run -d -p 3300:3000 `
    --name discocord_fe `
    --network discocord_net `
    -e NEXT_PUBLIC_API_URL="http://discocordgw:8080" `
    -e NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=$env:NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY `
    -e CLERK_SECRET_KEY=$env:CLERK_SECRET_KEY `
    discocord_fe

Write-Host "Deployment complete!"
