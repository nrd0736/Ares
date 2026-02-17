# =============================================================================
# APEC - Project Management Script
# =============================================================================
# Interactive menu for project setup, launch and data management
# =============================================================================

$ErrorActionPreference = "Continue"

# Global paths
$script:ScriptPath = $PSScriptRoot
$script:ProjectRoot = Split-Path -Parent $PSScriptRoot

# Auto-add PostgreSQL to PATH if installed but not in PATH
if (-not (Get-Command psql -ErrorAction SilentlyContinue)) {
    $pgReg = Get-ItemProperty "HKLM:\SOFTWARE\PostgreSQL\Installations\*" -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($pgReg) {
        $pgBin = Join-Path $pgReg."Base Directory" "bin"
        if (Test-Path $pgBin) {
            $env:Path = "$pgBin;$env:Path"
        }
    }
}

function ifNull { param([string]$a, [string]$b) if ($a) { $a } else { $b } }

function Show-Menu {
    Clear-Host
    Write-Host ""
    Write-Host "============================================" -ForegroundColor Cyan
    Write-Host "  APEC - Project Management" -ForegroundColor Cyan
    Write-Host "============================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "1. Initialization (Node.js, PostgreSQL, DB, npm)" -ForegroundColor Green
    Write-Host "2. Start Application" -ForegroundColor Green
    Write-Host "3. Load Test Data" -ForegroundColor Yellow
    Write-Host "4. Load Reference Data" -ForegroundColor Yellow
    Write-Host "5. Configuration (.env + migrations)" -ForegroundColor Magenta
    Write-Host "6. Create Admin User" -ForegroundColor Yellow
    Write-Host "7. Clear Database & Uploads" -ForegroundColor Red
    Write-Host "0. Exit" -ForegroundColor Red
    Write-Host ""
}

function Add-ToUserPath {
    param([string]$dir)
    if (-not $dir -or -not (Test-Path -LiteralPath $dir -ErrorAction SilentlyContinue)) { return $false }
    $dir = $dir.TrimEnd('\')
    $userPath = [Environment]::GetEnvironmentVariable("Path", "User")
    if (-not $userPath) { $userPath = "" }
    $parts = $userPath -split ';' | ForEach-Object { $_.Trim() } | Where-Object { $_ }
    if ($parts -contains $dir) { return $false }
    [Environment]::SetEnvironmentVariable("Path", "$userPath;$dir", "User")
    return $true
}

function Find-PostgreSQLBin {
    # 1. Check registry (most reliable)
    $regPaths = @(
        "HKLM:\SOFTWARE\PostgreSQL\Installations\*",
        "HKLM:\SOFTWARE\WOW6432Node\PostgreSQL\Installations\*"
    )
    foreach ($regPath in $regPaths) {
        $reg = Get-ItemProperty $regPath -ErrorAction SilentlyContinue | Select-Object -First 1
        if ($reg -and $reg."Base Directory") {
            $bin = Join-Path $reg."Base Directory" "bin"
            if (Test-Path (Join-Path $bin "psql.exe")) { return $bin }
        }
    }
    # 2. Search common folders
    $roots = @("C:\Program Files\PostgreSQL", "C:\Program Files (x86)\PostgreSQL")
    foreach ($root in $roots) {
        $found = Get-ChildItem "$root\*\bin\psql.exe" -ErrorAction SilentlyContinue | Select-Object -First 1
        if ($found) { return $found.DirectoryName }
    }
    return $null
}

function Initialize-Project {
    Write-Host ""
    Write-Host "============================================" -ForegroundColor Cyan
    Write-Host "  Environment Check & Initialization" -ForegroundColor Cyan
    Write-Host "============================================" -ForegroundColor Cyan
    Write-Host ""

    $allOk = $true

    # --- [1/4] Node.js -------------------------------------------
    Write-Host "[1/4] Node.js..." -ForegroundColor Cyan
    $nodeOk = $false
    $nodeVersion = node --version 2>$null
    if ($nodeVersion) {
        Write-Host "  [OK] Node.js $nodeVersion" -ForegroundColor Green
        $nodeOk = $true
    } else {
        # Try to find node in common install paths
        $nodePaths = @(
            "$env:ProgramFiles\nodejs",
            "${env:ProgramFiles(x86)}\nodejs",
            "$env:APPDATA\nvm\current"
        )
        foreach ($np in $nodePaths) {
            if (Test-Path (Join-Path $np "node.exe")) {
                $env:Path = "$np;$env:Path"
                if (Add-ToUserPath $np) {
                    Write-Host "  [OK] Node.js found, added to PATH: $np" -ForegroundColor Green
                } else {
                    Write-Host "  [OK] Node.js found: $np" -ForegroundColor Green
                }
                $nodeVersion = node --version 2>$null
                Write-Host "       Version: $nodeVersion" -ForegroundColor Green
                $nodeOk = $true
                break
            }
        }
    }
    if (-not $nodeOk) {
        Write-Host "  [FAIL] Node.js NOT found!" -ForegroundColor Red
        Write-Host "  Installing via winget..." -ForegroundColor Yellow
        $allOk = $false
        try {
            winget install OpenJS.NodeJS.LTS --silent --accept-package-agreements --accept-source-agreements | Out-Null
            Write-Host "  Installed. Restart PowerShell and run the script again." -ForegroundColor Yellow
        } catch {
            Write-Host "  Install manually: https://nodejs.org/en/download" -ForegroundColor Yellow
        }
        Write-Host ""
        Read-Host "Press Enter to continue"
        return
    }

    # --- [2/4] PostgreSQL ----------------------------------------
    Write-Host ""
    Write-Host "[2/4] PostgreSQL..." -ForegroundColor Cyan
    $psqlOk = $false

    # Check if psql already in PATH
    $psqlVersion = psql --version 2>$null
    if ($psqlVersion) {
        Write-Host "  [OK] psql in PATH: $psqlVersion" -ForegroundColor Green
        $psqlOk = $true
    } else {
        # Find via registry or file search
        $pgBin = Find-PostgreSQLBin
        if ($pgBin) {
            $env:Path = "$pgBin;$env:Path"
            $added = Add-ToUserPath $pgBin
            $psqlVersion = psql --version 2>$null
            Write-Host "  [OK] PostgreSQL found: $psqlVersion" -ForegroundColor Green
            if ($added) {
                Write-Host "       Path added permanently: $pgBin" -ForegroundColor Green
            } else {
                Write-Host "       Path already in PATH: $pgBin" -ForegroundColor Gray
            }
            $psqlOk = $true
        }
    }

    if (-not $psqlOk) {
        Write-Host "  [FAIL] PostgreSQL NOT found!" -ForegroundColor Red
        $allOk = $false
        $isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
        if (-not $isAdmin) {
            Write-Host ""
            Write-Host "  WARNING: Run as Administrator for installation!" -ForegroundColor Yellow
            Write-Host "  Right-click PowerShell -> Run as administrator" -ForegroundColor White
            Write-Host ""
            $cont = Read-Host "  Try anyway? (y/N)"
            if ($cont -ne "y" -and $cont -ne "Y") { Read-Host "Press Enter to continue"; return }
        }
        Write-Host "  Installing PostgreSQL 16 via winget..." -ForegroundColor Yellow
        Write-Host "  Wait 5-15 min, do NOT close the window." -ForegroundColor Gray
        $proc = Start-Process -FilePath "winget" -ArgumentList @(
            "install","PostgreSQL.PostgreSQL.16",
            "--silent","--accept-package-agreements",
            "--accept-source-agreements","--disable-interactivity"
        ) -Wait -PassThru -NoNewWindow
        if ($proc.ExitCode -eq 0) {
            Write-Host "  Installed! Restart PowerShell and run the script again." -ForegroundColor Green
            Read-Host "Press Enter to continue"
            return
        }
        # Re-check after install attempt
        $pgBin = Find-PostgreSQLBin
        if ($pgBin) {
            $env:Path = "$pgBin;$env:Path"
            Add-ToUserPath $pgBin | Out-Null
            $psqlOk = $true
            Write-Host "  [OK] PostgreSQL found after install: $pgBin" -ForegroundColor Green
        } else {
            Write-Host "  Installation failed. Install PostgreSQL manually." -ForegroundColor Red
            Read-Host "Press Enter to continue"
            return
        }
    }

    # --- [3/4] PostgreSQL service --------------------------------
    Write-Host ""
    Write-Host "[3/4] PostgreSQL service..." -ForegroundColor Cyan
    $pgService = Get-Service | Where-Object { $_.Name -match "postgresql" } | Select-Object -First 1
    if ($pgService) {
        if ($pgService.Status -eq "Running") {
            Write-Host "  [OK] Service '$($pgService.Name)' is Running" -ForegroundColor Green
        } else {
            Write-Host "  [WARN] Service '$($pgService.Name)' is $($pgService.Status) - starting..." -ForegroundColor Yellow
            try {
                Start-Service $pgService.Name -ErrorAction Stop
                Start-Sleep -Seconds 2
                Write-Host "  [OK] Service started." -ForegroundColor Green
            } catch {
                Write-Host "  [FAIL] Could not start service. Try running as Administrator." -ForegroundColor Red
                $allOk = $false
            }
        }
    } else {
        Write-Host "  [WARN] PostgreSQL service not found. Checking connection..." -ForegroundColor Yellow
        $env:PGPASSWORD = "postgres"
        $conn = psql -U postgres -c "SELECT 1" 2>$null
        if ($LASTEXITCODE -eq 0) {
            Write-Host "  [OK] Connection works without service entry." -ForegroundColor Green
        } else {
            Write-Host "  [FAIL] Cannot connect to PostgreSQL." -ForegroundColor Red
            $allOk = $false
        }
    }

    # --- [4/4] Database ------------------------------------------
    Write-Host ""
    Write-Host "[4/4] Database 'apec_db'..." -ForegroundColor Cyan
    $env:PGPASSWORD = "postgres"
    $dbCheck = psql -U postgres -tAc "SELECT 1 FROM pg_database WHERE datname='apec_db'" 2>$null
    if ($dbCheck -match "1") {
        Write-Host "  [OK] Database 'apec_db' exists" -ForegroundColor Green
    } else {
        Write-Host "  Creating database 'apec_db'..." -ForegroundColor Yellow
        psql -U postgres -c "CREATE DATABASE apec_db;" 2>&1 | Out-Null
        if ($LASTEXITCODE -eq 0) {
            Write-Host "  [OK] Database created successfully!" -ForegroundColor Green
        } else {
            Write-Host "  [FAIL] Could not create database." -ForegroundColor Red
            Write-Host "  Run manually: psql -U postgres -c `"CREATE DATABASE apec_db;`"" -ForegroundColor Yellow
            $allOk = $false
        }
    }

    # --- [5/5] npm dependencies ----------------------------------
    Write-Host ""
    Write-Host "[5/5] npm dependencies..." -ForegroundColor Cyan
    $rootBin = Join-Path $script:ProjectRoot "node_modules\.bin"
    $depsOk  = (Test-Path (Join-Path $rootBin "vite.cmd")) -and
               (Test-Path (Join-Path $rootBin "tsx.cmd"))  -and
               (Test-Path (Join-Path $script:ProjectRoot "node_modules\qs")) -and
               (Test-Path (Join-Path $script:ProjectRoot "node_modules\baseline-browser-mapping"))
    if ($depsOk) {
        Write-Host "  [OK] Dependencies already installed" -ForegroundColor Green
    } else {
        Write-Host "  Installing... (this may take a few minutes)" -ForegroundColor Yellow
        Push-Location $script:ProjectRoot
        $env:PUPPETEER_SKIP_DOWNLOAD          = "true"
        $env:PUPPETEER_SKIP_CHROMIUM_DOWNLOAD = "true"
        $env:PRISMA_SKIP_POSTINSTALL_GENERATE = "true"
        npm install --legacy-peer-deps
        $installCode = $LASTEXITCODE
        Pop-Location
        if ($installCode -ne 0) {
            Write-Host "  [FAIL] npm install failed (exit code: $installCode)" -ForegroundColor Red
            $allOk = $false
        } else {
            Write-Host "  [OK] Dependencies installed." -ForegroundColor Green
        }
    }

    # --- [+] Prisma client ---------------------------------------
    $prismaClient = Join-Path $script:ProjectRoot "node_modules\.prisma\client\default.js"
    if ($depsOk -or $installCode -eq 0) {
        if (-not (Test-Path $prismaClient)) {
            Write-Host "  Generating Prisma client..." -ForegroundColor Yellow
            Push-Location "$script:ProjectRoot\backend"
            npx prisma generate 2>&1 | Out-Null
            Pop-Location
            if (Test-Path $prismaClient) {
                Write-Host "  [OK] Prisma client generated." -ForegroundColor Green
            } else {
                Write-Host "  [WARN] Prisma client generation failed. Run option 5 first to configure .env" -ForegroundColor Yellow
            }
        } else {
            Write-Host "  [OK] Prisma client ready" -ForegroundColor Green
        }
    }

    # --- Summary -------------------------------------------------
    Write-Host ""
    Write-Host "============================================" -ForegroundColor $(if ($allOk) { "Green" } else { "Yellow" })
    if ($allOk) {
        Write-Host "  All checks passed!" -ForegroundColor Green
        Write-Host "============================================" -ForegroundColor Green
        Write-Host ""
        Write-Host "Next steps:" -ForegroundColor Yellow
        Write-Host "  - Option 5: Configure .env + run migrations + create admin" -ForegroundColor White
        Write-Host "  - Option 2: Start Application" -ForegroundColor White
    } else {
        Write-Host "  Some checks failed - see above" -ForegroundColor Yellow
        Write-Host "============================================" -ForegroundColor Yellow
        Write-Host ""
        Write-Host "Fix the issues above and run option 1 again." -ForegroundColor Yellow
    }
    Write-Host ""
    Read-Host "Press Enter to continue"
}

function Start-Application {
    Write-Host ""
    Write-Host "============================================" -ForegroundColor Cyan
    Write-Host "  Starting Application" -ForegroundColor Cyan
    Write-Host "============================================" -ForegroundColor Cyan
    Write-Host ""
    
    $backendPath  = Join-Path $script:ProjectRoot "backend"
    $frontendPath = Join-Path $script:ProjectRoot "frontend"
    $rootBin      = Join-Path $script:ProjectRoot "node_modules\.bin"
    
    # Check that workspace dependencies are installed (binaries live at root in npm workspaces)
    $needsInstall = (-not (Test-Path (Join-Path $rootBin "vite.cmd"))) -or
                    (-not (Test-Path (Join-Path $rootBin "tsx.cmd")))  -or
                    (-not (Test-Path (Join-Path $script:ProjectRoot "node_modules\qs"))) -or
                    (-not (Test-Path (Join-Path $script:ProjectRoot "node_modules\baseline-browser-mapping")))
    
    if ($needsInstall) {
        Write-Host "Dependencies not installed. Running npm install..." -ForegroundColor Yellow
        Push-Location $script:ProjectRoot
        $env:PUPPETEER_SKIP_DOWNLOAD          = "true"
        $env:PUPPETEER_SKIP_CHROMIUM_DOWNLOAD = "true"
        $env:PRISMA_SKIP_POSTINSTALL_GENERATE = "true"
        npm install --legacy-peer-deps
        $installCode = $LASTEXITCODE
        Pop-Location
        
        if ($installCode -ne 0) {
            Write-Host ""
            Write-Host "  ERROR: npm install failed (exit code: $installCode)" -ForegroundColor Red
            Write-Host ""
            Read-Host "Press Enter to continue"
            return
        }
        Write-Host "  Dependencies installed." -ForegroundColor Green
        Write-Host ""
    }
    
    # Check Prisma client is generated
    $prismaGenerated = Test-Path (Join-Path $script:ProjectRoot "node_modules\.prisma\client\default.js")
    if (-not $prismaGenerated) {
        Write-Host "Generating Prisma client..." -ForegroundColor Yellow
        Push-Location $backendPath
        npx prisma generate
        Pop-Location
        Write-Host "  Prisma client generated." -ForegroundColor Green
        Write-Host ""
    }
    
    Write-Host "[1/3] Starting Backend  (http://localhost:3000)..." -ForegroundColor Green
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$backendPath'; npm run dev"
    
    Write-Host "[2/3] Starting Frontend (http://localhost:5173)..." -ForegroundColor Green
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$frontendPath'; npm run dev"
    
    Write-Host "[3/3] Opening browser in 5 seconds..." -ForegroundColor Yellow
    Start-Sleep -Seconds 5
    Start-Process "http://localhost:5173"
    
    Write-Host ""
    Write-Host "============================================" -ForegroundColor Green
    Write-Host "  Application is running!" -ForegroundColor Green
    Write-Host "============================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "  Frontend: http://localhost:5173" -ForegroundColor Cyan
    Write-Host "  Backend:  http://localhost:3000" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "  Close the terminal windows to stop the servers." -ForegroundColor Yellow
    Write-Host ""
    Read-Host "Press Enter to return to menu"
}

function Load-TestData {
    Write-Host ""
    Write-Host "============================================" -ForegroundColor Cyan
    Write-Host "  Load Test Data" -ForegroundColor Cyan
    Write-Host "============================================" -ForegroundColor Cyan
    Write-Host ""
    
    Write-Host "WARNING: This will add test data to database" -ForegroundColor Yellow
    $confirm = Read-Host "Continue? (y/n)"
    
    if ($confirm -eq "y") {
        Push-Location $script:ScriptPath
        
        Write-Host "Loading test data..." -ForegroundColor Green
        node seed-test-data.js
        
        Write-Host ""
        Write-Host "Test data loaded!" -ForegroundColor Green
        Pop-Location
    } else {
        Write-Host "Cancelled" -ForegroundColor Red
    }
    
    Write-Host ""
    Read-Host "Press Enter to continue"
}

function Load-References {
    Write-Host ""
    Write-Host "============================================" -ForegroundColor Cyan
    Write-Host "  Load Reference Data" -ForegroundColor Cyan
    Write-Host "============================================" -ForegroundColor Cyan
    Write-Host ""
    
    Write-Host "Loading reference data (regions, sports, etc)..." -ForegroundColor Yellow
    
    Push-Location $script:ScriptPath
    
    node seed-references.js
    
    Write-Host ""
    Write-Host "Reference data loaded!" -ForegroundColor Green
    Pop-Location
    
    Write-Host ""
    Read-Host "Press Enter to continue"
}

function Full-Setup {
    Write-Host ""
    Write-Host "============================================" -ForegroundColor Cyan
    Write-Host "  Project Configuration Wizard" -ForegroundColor Cyan
    Write-Host "============================================" -ForegroundColor Cyan
    Write-Host "  Press Enter to keep value in [brackets]" -ForegroundColor Gray
    Write-Host ""

    # --- Load existing .env values for defaults ---
    $existingBackend  = @{}
    $existingFrontend = @{}
    $backendEnvPath   = "$script:ProjectRoot\backend\.env"
    $frontendEnvPath  = "$script:ProjectRoot\frontend\.env"

    if (Test-Path $backendEnvPath) {
        Get-Content $backendEnvPath | ForEach-Object {
            if ($_ -match '^([^#=][^=]*)=(.*)$') {
                $existingBackend[$Matches[1].Trim()] = $Matches[2].Trim()
            }
        }
        Write-Host "  Existing backend .env loaded - current values shown in brackets" -ForegroundColor Green
        Write-Host ""
    }
    if (Test-Path $frontendEnvPath) {
        Get-Content $frontendEnvPath | ForEach-Object {
            if ($_ -match '^([^#=][^=]*)=(.*)$') {
                $existingFrontend[$Matches[1].Trim()] = $Matches[2].Trim()
            }
        }
    }

    # Helper: ask with default (reads from hashtable with fallback)
    function E { param([string]$key, [string]$default)
        $v = $existingBackend[$key]
        if ($v) { $v } else { $default }
    }
    function EF { param([string]$key, [string]$default)
        $v = $existingFrontend[$key]
        if ($v) { $v } else { $default }
    }
    function Ask { param([string]$prompt, [string]$default)
        $val = Read-Host "$prompt [$default]"
        if (-not $val) { $default } else { $val }
    }
    function AskBool { param([string]$prompt, [string]$default)
        $val = Read-Host "$prompt [$default]"
        if (-not $val) { return $default }
        if ($val -eq "y" -or $val -eq "yes" -or $val -eq "true" -or $val -eq "1") { "true" } else { "false" }
    }

    # ============================================================
    Write-Host "---- [1/7] Server Settings -------------------------" -ForegroundColor Cyan
    Write-Host ""

    $port    = Ask "PORT - server listen port"            (E "PORT"     "3000")
    $host_   = Ask "HOST - listen address (0.0.0.0=all)" (E "HOST"     "0.0.0.0")
    $nodeEnv = Ask "NODE_ENV (development/production)"   (E "NODE_ENV" "production")

    # ============================================================
    Write-Host ""
    Write-Host "---- [2/7] Database --------------------------------" -ForegroundColor Cyan
    Write-Host ""

    # Parse existing DATABASE_URL if present
    $existingUrl = $existingBackend["DATABASE_URL"]
    $defDbHost = "localhost"; $defDbPort = "5432"; $defDbName = "apec_db"
    $defDbUser = "postgres";  $defDbPass = "postgres"
    if ($existingUrl -match "postgresql://([^:]+):([^@]+)@([^:]+):(\d+)/([^?]+)") {
        $defDbUser = $Matches[1]; $defDbPass = $Matches[2]
        $defDbHost = $Matches[3]; $defDbPort = $Matches[4]; $defDbName = $Matches[5]
    }

    $dbHost = Ask "DB host" $defDbHost
    $dbPort = Ask "DB port" $defDbPort
    $dbName = Ask "DB name" $defDbName
    $dbUser = Ask "DB user" $defDbUser

    Write-Host "DB password (input hidden) [$defDbPass]" -ForegroundColor White
    $dbPassSecure = Read-Host -AsSecureString "DB password"
    $dbPassPlain  = [Runtime.InteropServices.Marshal]::PtrToStringAuto(
                        [Runtime.InteropServices.Marshal]::SecureStringToBSTR($dbPassSecure))
    if (-not $dbPassPlain) { $dbPassPlain = $defDbPass }

    $databaseUrl = "postgresql://${dbUser}:${dbPassPlain}@${dbHost}:${dbPort}/${dbName}?schema=public"
    Write-Host "  DATABASE_URL = $databaseUrl" -ForegroundColor Gray

    # ============================================================
    Write-Host ""
    Write-Host "---- [3/7] JWT & Authentication --------------------" -ForegroundColor Cyan
    Write-Host ""

    $curJwt = $existingBackend["JWT_SECRET"]
    if ($curJwt) {
        Write-Host "  Current JWT_SECRET: $curJwt" -ForegroundColor Gray
        $jwtInput = Read-Host "JWT_SECRET (Enter=keep, type NEW=regenerate, or paste new value)"
        if ($jwtInput -eq "NEW" -or $jwtInput -eq "new") {
            $jwtSecret = -join ((65..90) + (97..122) + (48..57) | Get-Random -Count 64 | ForEach-Object {[char]$_})
            Write-Host "  Generated: $jwtSecret" -ForegroundColor Green
        } elseif ($jwtInput) {
            $jwtSecret = $jwtInput
        } else {
            $jwtSecret = $curJwt
        }
    } else {
        $jwtInput = Read-Host "JWT_SECRET (Enter=auto-generate, or type manually)"
        if ($jwtInput) {
            $jwtSecret = $jwtInput
        } else {
            $jwtSecret = -join ((65..90) + (97..122) + (48..57) | Get-Random -Count 64 | ForEach-Object {[char]$_})
            Write-Host "  Generated: $jwtSecret" -ForegroundColor Green
        }
    }

    $jwtExpires     = Ask "JWT_EXPIRES_IN (e.g. 7d, 24h, 30d)"                    (E "JWT_EXPIRES_IN"            "7d")
    $jwtValidation  = AskBool "JWT_VALIDATION_ENABLED - enforce min secret length" (E "JWT_VALIDATION_ENABLED"    "true")
    $jwtMinLen      = Ask "JWT_MIN_SECRET_LENGTH - minimum chars for secret"       (E "JWT_MIN_SECRET_LENGTH"     "32")
    $jwtRequireProd = AskBool "JWT_REQUIRE_IN_PRODUCTION"                          (E "JWT_REQUIRE_IN_PRODUCTION" "true")

    # ============================================================
    Write-Host ""
    Write-Host "---- [4/7] CORS ------------------------------------" -ForegroundColor Cyan
    Write-Host ""

    $corsEnabled     = AskBool "CORS_ENABLED"                                     (E "CORS_ENABLED"     "true")
    $corsOrigin      = Ask "CORS_ORIGIN - allowed frontend URL"                   (E "CORS_ORIGIN"      "http://localhost:5173")
    $corsCredentials = AskBool "CORS_CREDENTIALS - allow cookies/auth headers"    (E "CORS_CREDENTIALS" "true")

    # ============================================================
    Write-Host ""
    Write-Host "---- [5/7] HTTPS / SSL -----------------------------" -ForegroundColor Cyan
    Write-Host ""

    $httpsEnabled  = AskBool "HTTPS_ENABLED" (E "HTTPS_ENABLED" "false")
    $sslCert = ""; $sslKey = ""; $sslCa = ""; $sslPassphrase = ""
    if ($httpsEnabled -eq "true") {
        $sslCert       = Ask "SSL_CERT_PATH - path to certificate (fullchain.pem)" (E "SSL_CERT_PATH"  "")
        $sslKey        = Ask "SSL_KEY_PATH  - path to private key (privkey.pem)"   (E "SSL_KEY_PATH"   "")
        $sslCa         = Ask "SSL_CA_PATH   - path to CA chain (optional)"         (E "SSL_CA_PATH"    "")
        $sslPassphrase = Ask "SSL_PASSPHRASE - key passphrase (optional)"          (E "SSL_PASSPHRASE" "")
    }

    # ============================================================
    Write-Host ""
    Write-Host "---- [6/7] Security & Rate Limiting ----------------" -ForegroundColor Cyan
    Write-Host ""

    $advancedInput = Read-Host "Configure advanced security settings in detail? (y/N)"
    $advancedMode  = ($advancedInput -eq "y" -or $advancedInput -eq "Y")

    $helmetEnabled    = AskBool "HELMET_ENABLED - HTTP security headers" (E "HELMET_ENABLED"    "true")
    $rateLimitEnabled = AskBool "RATE_LIMIT_ENABLED - master switch"     (E "RATE_LIMIT_ENABLED" "true")

    # Set defaults (will be overridden in advanced mode)
    $genRlEnabled    = E "GENERAL_RATE_LIMIT_ENABLED"    "true"
    $genRlMax        = E "GENERAL_RATE_LIMIT_MAX"         "200"
    $genRlWindow     = E "GENERAL_RATE_LIMIT_WINDOW_MS"   "900000"
    $authRlEnabled   = E "AUTH_RATE_LIMIT_ENABLED"        "true"
    $authRlMax       = E "AUTH_RATE_LIMIT_MAX"            "10"
    $authRlWindow    = E "AUTH_RATE_LIMIT_WINDOW_MS"      "900000"
    $authRlSkipSuccess = E "AUTH_RATE_LIMIT_SKIP_SUCCESS" "true"
    $uploadRlEnabled = E "UPLOAD_RATE_LIMIT_ENABLED"      "true"
    $uploadRlMax     = E "UPLOAD_RATE_LIMIT_MAX"          "50"
    $uploadRlWindow  = E "UPLOAD_RATE_LIMIT_WINDOW_MS"    "3600000"
    $pwValidation    = E "PASSWORD_VALIDATION_ENABLED"    "true"
    $pwMinLen        = E "PASSWORD_MIN_LENGTH"             "8"
    $pwMaxLen        = E "PASSWORD_MAX_LENGTH"             "128"
    $pwUpper         = E "PASSWORD_REQUIRE_UPPERCASE"      "true"
    $pwLower         = E "PASSWORD_REQUIRE_LOWERCASE"      "true"
    $pwNumbers       = E "PASSWORD_REQUIRE_NUMBERS"        "true"
    $pwSpecial       = E "PASSWORD_REQUIRE_SPECIAL"        "false"
    $logSanitization = E "LOG_SANITIZATION_ENABLED"        "true"
    $htmlSanitization= E "HTML_SANITIZATION_ENABLED"       "true"
    $fileValidation  = E "FILE_VALIDATION_ENABLED"         "true"
    $fileMagic       = E "FILE_VALIDATION_CHECK_MAGIC_BYTES" "true"
    $fileMime        = E "FILE_VALIDATION_CHECK_MIME_TYPE"   "true"

    if ($advancedMode) {
        Write-Host ""
        Write-Host "  General Rate Limit (all routes):" -ForegroundColor Yellow
        $genRlEnabled = AskBool "  GENERAL_RATE_LIMIT_ENABLED" $genRlEnabled
        $genRlMax     = Ask     "  GENERAL_RATE_LIMIT_MAX - requests per window" $genRlMax
        $genRlWindow  = Ask     "  GENERAL_RATE_LIMIT_WINDOW_MS (900000=15min)"  $genRlWindow

        Write-Host ""
        Write-Host "  Auth Rate Limit (login/register):" -ForegroundColor Yellow
        $authRlEnabled     = AskBool "  AUTH_RATE_LIMIT_ENABLED" $authRlEnabled
        $authRlMax         = Ask     "  AUTH_RATE_LIMIT_MAX - attempts per window" $authRlMax
        $authRlWindow      = Ask     "  AUTH_RATE_LIMIT_WINDOW_MS" $authRlWindow
        $authRlSkipSuccess = AskBool "  AUTH_RATE_LIMIT_SKIP_SUCCESS - skip on success" $authRlSkipSuccess

        Write-Host ""
        Write-Host "  Upload Rate Limit:" -ForegroundColor Yellow
        $uploadRlEnabled = AskBool "  UPLOAD_RATE_LIMIT_ENABLED" $uploadRlEnabled
        $uploadRlMax     = Ask     "  UPLOAD_RATE_LIMIT_MAX - uploads per window" $uploadRlMax
        $uploadRlWindow  = Ask     "  UPLOAD_RATE_LIMIT_WINDOW_MS (3600000=1h)"   $uploadRlWindow

        Write-Host ""
        Write-Host "  Password Validation:" -ForegroundColor Yellow
        $pwValidation = AskBool "  PASSWORD_VALIDATION_ENABLED" $pwValidation
        $pwMinLen     = Ask     "  PASSWORD_MIN_LENGTH"          $pwMinLen
        $pwMaxLen     = Ask     "  PASSWORD_MAX_LENGTH"          $pwMaxLen
        $pwUpper      = AskBool "  PASSWORD_REQUIRE_UPPERCASE"   $pwUpper
        $pwLower      = AskBool "  PASSWORD_REQUIRE_LOWERCASE"   $pwLower
        $pwNumbers    = AskBool "  PASSWORD_REQUIRE_NUMBERS"     $pwNumbers
        $pwSpecial    = AskBool "  PASSWORD_REQUIRE_SPECIAL chars (!@#...)" $pwSpecial

        Write-Host ""
        Write-Host "  Content Security:" -ForegroundColor Yellow
        $logSanitization  = AskBool "  LOG_SANITIZATION_ENABLED - mask sensitive data in logs" $logSanitization
        $htmlSanitization = AskBool "  HTML_SANITIZATION_ENABLED - sanitize HTML input"        $htmlSanitization
        $fileValidation   = AskBool "  FILE_VALIDATION_ENABLED - validate uploads"             $fileValidation
        if ($fileValidation -eq "true") {
            $fileMagic = AskBool "  FILE_VALIDATION_CHECK_MAGIC_BYTES" $fileMagic
            $fileMime  = AskBool "  FILE_VALIDATION_CHECK_MIME_TYPE"   $fileMime
        }
    }

    # ============================================================
    Write-Host ""
    Write-Host "---- [7/7] Upload & Frontend -----------------------" -ForegroundColor Cyan
    Write-Host ""

    $uploadDir   = Ask "UPLOAD_DIR - directory for uploaded files"     (E "UPLOAD_DIR"    "./uploads")
    $maxFileSize = Ask "MAX_FILE_SIZE - bytes (10485760 = 10 MB)"      (E "MAX_FILE_SIZE" "10485760")

    Write-Host ""
    $apiUrl    = Ask "VITE_API_URL - backend URL for frontend"  (EF "VITE_API_URL"    "http://localhost:$port")
    $socketUrl = Ask "VITE_SOCKET_URL - socket URL for frontend" (EF "VITE_SOCKET_URL" "http://localhost:$port")

    # ============================================================
    Write-Host ""
    Write-Host "============================================" -ForegroundColor Cyan
    Write-Host "  Saving .env files..." -ForegroundColor Cyan
    Write-Host "============================================" -ForegroundColor Cyan
    Write-Host ""

    $utf8NoBOM = New-Object System.Text.UTF8Encoding $false

    $backendEnv = @"
# =============================================================================
# APEC Backend Configuration
# Generated by manage.ps1
# =============================================================================

# --- Server ---
PORT=$port
HOST=$host_
NODE_ENV=$nodeEnv

# --- Database ---
DATABASE_URL=$databaseUrl

# --- JWT / Authentication ---
JWT_SECRET=$jwtSecret
JWT_EXPIRES_IN=$jwtExpires
JWT_VALIDATION_ENABLED=$jwtValidation
JWT_MIN_SECRET_LENGTH=$jwtMinLen
JWT_REQUIRE_IN_PRODUCTION=$jwtRequireProd

# --- CORS ---
CORS_ENABLED=$corsEnabled
CORS_ORIGIN=$corsOrigin
CORS_CREDENTIALS=$corsCredentials

# --- HTTPS / SSL ---
HTTPS_ENABLED=$httpsEnabled
SSL_CERT_PATH=$sslCert
SSL_KEY_PATH=$sslKey
SSL_CA_PATH=$sslCa
SSL_PASSPHRASE=$sslPassphrase

# --- Rate Limiting ---
RATE_LIMIT_ENABLED=$rateLimitEnabled
GENERAL_RATE_LIMIT_ENABLED=$genRlEnabled
GENERAL_RATE_LIMIT_MAX=$genRlMax
GENERAL_RATE_LIMIT_WINDOW_MS=$genRlWindow
AUTH_RATE_LIMIT_ENABLED=$authRlEnabled
AUTH_RATE_LIMIT_MAX=$authRlMax
AUTH_RATE_LIMIT_WINDOW_MS=$authRlWindow
AUTH_RATE_LIMIT_SKIP_SUCCESS=$authRlSkipSuccess
UPLOAD_RATE_LIMIT_ENABLED=$uploadRlEnabled
UPLOAD_RATE_LIMIT_MAX=$uploadRlMax
UPLOAD_RATE_LIMIT_WINDOW_MS=$uploadRlWindow

# --- Helmet (HTTP security headers) ---
HELMET_ENABLED=$helmetEnabled

# --- Password Validation ---
PASSWORD_VALIDATION_ENABLED=$pwValidation
PASSWORD_MIN_LENGTH=$pwMinLen
PASSWORD_MAX_LENGTH=$pwMaxLen
PASSWORD_REQUIRE_UPPERCASE=$pwUpper
PASSWORD_REQUIRE_LOWERCASE=$pwLower
PASSWORD_REQUIRE_NUMBERS=$pwNumbers
PASSWORD_REQUIRE_SPECIAL=$pwSpecial

# --- Content Security ---
LOG_SANITIZATION_ENABLED=$logSanitization
HTML_SANITIZATION_ENABLED=$htmlSanitization
FILE_VALIDATION_ENABLED=$fileValidation
FILE_VALIDATION_CHECK_MAGIC_BYTES=$fileMagic
FILE_VALIDATION_CHECK_MIME_TYPE=$fileMime

# --- Upload ---
UPLOAD_DIR=$uploadDir
MAX_FILE_SIZE=$maxFileSize
"@

    [System.IO.File]::WriteAllText($backendEnvPath, $backendEnv, $utf8NoBOM)
    Write-Host "  [OK] backend\.env saved" -ForegroundColor Green

    $frontendEnv = @"
# =============================================================================
# APEC Frontend Configuration
# Generated by manage.ps1
# =============================================================================

VITE_API_URL=$apiUrl
VITE_SOCKET_URL=$socketUrl
"@

    [System.IO.File]::WriteAllText($frontendEnvPath, $frontendEnv, $utf8NoBOM)
    Write-Host "  [OK] frontend\.env saved" -ForegroundColor Green

    # ============================================================
    Write-Host ""
    Write-Host "============================================" -ForegroundColor Cyan
    Write-Host "  Database Initialization" -ForegroundColor Cyan
    Write-Host "============================================" -ForegroundColor Cyan
    Write-Host ""

    Write-Host "[1/2] Running database migrations..." -ForegroundColor Green
    $env:PGPASSWORD = $dbPassPlain
    Push-Location "$script:ProjectRoot\backend"
    npm run prisma:migrate
    $migrateCode = $LASTEXITCODE
    Pop-Location

    if ($migrateCode -ne 0) {
        Write-Host "  [FAIL] Migration failed! Check database connection settings above." -ForegroundColor Red
        Read-Host "Press Enter to continue"
        return
    }
    Write-Host "  [OK] Migrations applied." -ForegroundColor Green

    Write-Host ""
    Write-Host "[2/2] Loading reference data..." -ForegroundColor Green
    Push-Location $script:ScriptPath
    node seed-references.js
    Pop-Location
    Write-Host "  [OK] Reference data loaded." -ForegroundColor Green

    # ============================================================
    Write-Host ""
    Write-Host "============================================" -ForegroundColor Green
    Write-Host "  Configuration Complete!" -ForegroundColor Green
    Write-Host "============================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "Summary:" -ForegroundColor Cyan
    Write-Host "  Backend:  http://${host_}:${port}" -ForegroundColor White
    Write-Host "  Frontend: $apiUrl" -ForegroundColor White
    Write-Host "  Database: ${dbHost}:${dbPort}/${dbName}" -ForegroundColor White
    Write-Host "  NODE_ENV: $nodeEnv" -ForegroundColor White
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Yellow
    Write-Host "  - Option 6: Create admin user" -ForegroundColor White
    Write-Host "  - Option 2: Start Application" -ForegroundColor White
    Write-Host ""

    Read-Host "Press Enter to continue"
}

function Create-AdminUser {
    Write-Host ""
    Write-Host "============================================" -ForegroundColor Cyan
    Write-Host "  Create Additional Admin User" -ForegroundColor Cyan
    Write-Host "============================================" -ForegroundColor Cyan
    Write-Host ""
    
    Write-Host "Enter new admin user details:" -ForegroundColor Yellow
    Write-Host ""
    
    $email = Read-Host "Email"
    if (-not $email) {
        Write-Host "Email is required!" -ForegroundColor Red
        Read-Host "Press Enter to continue"
        return
    }
    
    $password = Read-Host "Password" -AsSecureString
    $passwordPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($password))
    if (-not $passwordPlain) {
        Write-Host "Password is required!" -ForegroundColor Red
        Read-Host "Press Enter to continue"
        return
    }
    
    $firstName = Read-Host "First name"
    if (-not $firstName) { $firstName = "Admin" }
    
    $lastName = Read-Host "Last name"
    if (-not $lastName) { $lastName = "User" }
    
    Write-Host ""
    Write-Host "Creating admin user..." -ForegroundColor Green
    
    Push-Location $script:ScriptPath
    
    node create-test-users.js "$email" "$passwordPlain" "$firstName" "$lastName"
    
    Write-Host ""
    Write-Host "============================================" -ForegroundColor Green
    Write-Host "  Admin user created successfully!" -ForegroundColor Green
    Write-Host "============================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "Credentials:" -ForegroundColor Yellow
    Write-Host "  Email: $email" -ForegroundColor White
    Write-Host "  Password: $passwordPlain" -ForegroundColor White
    Write-Host "  Name: $firstName $lastName" -ForegroundColor White
    Pop-Location
    
    Write-Host ""
    Read-Host "Press Enter to continue"
}

function Clear-Data {
    Write-Host ""
    Write-Host "============================================" -ForegroundColor Red
    Write-Host "  Clear Database & Uploads" -ForegroundColor Red
    Write-Host "============================================" -ForegroundColor Red
    Write-Host ""
    Write-Host "  WARNING: This will PERMANENTLY DELETE:" -ForegroundColor Red
    Write-Host "    - All data in the database (users, competitions, etc.)" -ForegroundColor White
    Write-Host "    - All uploaded files (avatars, documents, photos)" -ForegroundColor White
    Write-Host "    - All temp files" -ForegroundColor White
    Write-Host "  The database schema and reference data will be restored." -ForegroundColor Gray
    Write-Host ""

    $confirm1 = Read-Host "Type YES to confirm"
    if ($confirm1 -ne "YES") {
        Write-Host "Cancelled." -ForegroundColor Yellow
        Write-Host ""
        Read-Host "Press Enter to continue"
        return
    }
    $confirm2 = Read-Host "Are you absolutely sure? Type YES again"
    if ($confirm2 -ne "YES") {
        Write-Host "Cancelled." -ForegroundColor Yellow
        Write-Host ""
        Read-Host "Press Enter to continue"
        return
    }

    Write-Host ""

    # --- [1/3] Reset database ---
    Write-Host "[1/3] Resetting database..." -ForegroundColor Yellow
    Push-Location "$script:ProjectRoot\backend"
    npx prisma migrate reset --force 2>&1
    $resetCode = $LASTEXITCODE
    Pop-Location

    if ($resetCode -ne 0) {
        Write-Host "  [FAIL] Database reset failed (exit code: $resetCode)" -ForegroundColor Red
        Write-Host "  Make sure .env is configured (option 5) and DB is running." -ForegroundColor Yellow
        Write-Host ""
        Read-Host "Press Enter to continue"
        return
    }
    Write-Host "  [OK] Database reset and migrations re-applied." -ForegroundColor Green

    # --- [2/3] Clear uploads ---
    Write-Host ""
    Write-Host "[2/3] Clearing uploads..." -ForegroundColor Yellow
    $uploadsDir = Join-Path $script:ProjectRoot "backend\uploads"
    $tempDir    = Join-Path $script:ProjectRoot "backend\temp"

    if (Test-Path $uploadsDir) {
        $items = Get-ChildItem $uploadsDir -Recurse -File -ErrorAction SilentlyContinue
        $count = ($items | Measure-Object).Count
        $items | Remove-Item -Force -ErrorAction SilentlyContinue
        # Remove empty subdirectories (keep root uploads folder)
        Get-ChildItem $uploadsDir -Directory -ErrorAction SilentlyContinue |
            ForEach-Object { Remove-Item $_.FullName -Recurse -Force -ErrorAction SilentlyContinue }
        Write-Host "  [OK] Uploads cleared ($count files removed)." -ForegroundColor Green
    } else {
        Write-Host "  [SKIP] Uploads folder not found." -ForegroundColor Gray
    }

    if (Test-Path $tempDir) {
        $items = Get-ChildItem $tempDir -Recurse -File -ErrorAction SilentlyContinue
        $count = ($items | Measure-Object).Count
        $items | Remove-Item -Force -ErrorAction SilentlyContinue
        Write-Host "  [OK] Temp folder cleared ($count files removed)." -ForegroundColor Green
    }

    # --- [3/3] Reload reference data ---
    Write-Host ""
    Write-Host "[3/3] Reloading reference data..." -ForegroundColor Yellow
    Push-Location $script:ScriptPath
    node seed-references.js 2>&1
    Pop-Location
    Write-Host "  [OK] Reference data restored." -ForegroundColor Green

    Write-Host ""
    Write-Host "============================================" -ForegroundColor Green
    Write-Host "  Database cleared successfully!" -ForegroundColor Green
    Write-Host "============================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Yellow
    Write-Host "  - Option 6: Create admin user" -ForegroundColor White
    Write-Host "  - Option 2: Start Application" -ForegroundColor White
    Write-Host ""
    Read-Host "Press Enter to continue"
}

# Main loop
while ($true) {
    Show-Menu
    
    $choice = Read-Host "Select option"
    
    switch ($choice) {
        "1" { Initialize-Project }
        "2" { Start-Application }
        "3" { Load-TestData }
        "4" { Load-References }
        "5" { Full-Setup }
        "6" { Create-AdminUser }
        "7" { Clear-Data }
        "0" { 
            Write-Host ""
            Write-Host "Goodbye!" -ForegroundColor Cyan
            Write-Host ""
            exit 
        }
        default {
            Write-Host ""
            Write-Host "Invalid option!" -ForegroundColor Red
            Start-Sleep -Seconds 1
        }
    }
}
