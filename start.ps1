# Story Forge startup script
# Usage: .\start.ps1

# Load .env if present
$envFile = Join-Path $PSScriptRoot ".env"
if (Test-Path $envFile) {
    Get-Content $envFile | ForEach-Object {
        if ($_ -match '^\s*([^#][^=]+)=(.*)$') {
            $key = $matches[1].Trim()
            $val = $matches[2].Trim()
            [System.Environment]::SetEnvironmentVariable($key, $val, 'Process')
        }
    }
    Write-Host "Loaded .env" -ForegroundColor Green
}

if (-not $env:OPENAI_API_KEY) {
    Write-Host "ERROR: OPENAI_API_KEY is not set." -ForegroundColor Red
    Write-Host "Create a .env file with: OPENAI_API_KEY=your_key_here" -ForegroundColor Yellow
    exit 1
}

python (Join-Path $PSScriptRoot "server.py")
