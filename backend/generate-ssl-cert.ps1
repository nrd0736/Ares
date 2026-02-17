# ============================================================================
# Скрипт генерации самоподписанного SSL сертификата для APEC
# ============================================================================
# Использование: .\generate-ssl-cert.ps1
#
# Требования: OpenSSL должен быть установлен
# Скачать: https://slproweb.com/products/Win32OpenSSL.html
# ============================================================================

Write-Host "🔐 Генерация самоподписанного SSL сертификата для APEC" -ForegroundColor Cyan
Write-Host ""

# Проверка наличия OpenSSL
try {
    $openssl = Get-Command openssl -ErrorAction Stop
    Write-Host "✅ OpenSSL найден: $($openssl.Source)" -ForegroundColor Green
} catch {
    Write-Host "❌ OpenSSL не найден!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Пожалуйста, установите OpenSSL:" -ForegroundColor Yellow
    Write-Host "1. Скачайте: https://slproweb.com/products/Win32OpenSSL.html" -ForegroundColor Yellow
    Write-Host "2. Установите версию 'Win64 OpenSSL v3.x.x Light'" -ForegroundColor Yellow
    Write-Host "3. Добавьте в PATH: C:\Program Files\OpenSSL-Win64\bin" -ForegroundColor Yellow
    Write-Host ""
    exit 1
}

# Создать папку для сертификатов
Write-Host ""
Write-Host "📁 Создание папки ssl/..." -ForegroundColor Cyan
New-Item -ItemType Directory -Force -Path "ssl" | Out-Null

# Запросить параметры сертификата
Write-Host ""
Write-Host "📝 Введите параметры сертификата (или нажмите Enter для значений по умолчанию):" -ForegroundColor Cyan
Write-Host ""

$country = Read-Host "Страна (C) [RU]"
if ([string]::IsNullOrWhiteSpace($country)) { $country = "RU" }

$state = Read-Host "Регион (ST) [Moscow]"
if ([string]::IsNullOrWhiteSpace($state)) { $state = "Moscow" }

$locality = Read-Host "Город (L) [Moscow]"
if ([string]::IsNullOrWhiteSpace($locality)) { $locality = "Moscow" }

$organization = Read-Host "Организация (O) [APEC]"
if ([string]::IsNullOrWhiteSpace($organization)) { $organization = "APEC" }

$organizationalUnit = Read-Host "Подразделение (OU) [Development]"
if ([string]::IsNullOrWhiteSpace($organizationalUnit)) { $organizationalUnit = "Development" }

$commonName = Read-Host "Домен (CN) [localhost]"
if ([string]::IsNullOrWhiteSpace($commonName)) { $commonName = "localhost" }

$days = Read-Host "Срок действия в днях [365]"
if ([string]::IsNullOrWhiteSpace($days)) { $days = "365" }

# Формирование subject string
$subject = "/C=$country/ST=$state/L=$locality/O=$organization/OU=$organizationalUnit/CN=$commonName"

Write-Host ""
Write-Host "🔑 Генерация приватного ключа..." -ForegroundColor Cyan
& openssl genrsa -out ssl/private.key 2048 2>&1 | Out-Null

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Приватный ключ создан: ssl/private.key" -ForegroundColor Green
} else {
    Write-Host "❌ Ошибка при создании приватного ключа" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "📄 Генерация сертификата..." -ForegroundColor Cyan
& openssl req -new -x509 -key ssl/private.key -out ssl/certificate.crt -days $days -subj $subject 2>&1 | Out-Null

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Сертификат создан: ssl/certificate.crt" -ForegroundColor Green
} else {
    Write-Host "❌ Ошибка при создании сертификата" -ForegroundColor Red
    exit 1
}

# Создать конфигурацию с несколькими доменами (SAN)
Write-Host ""
Write-Host "📝 Создание расширенной конфигурации (SAN)..." -ForegroundColor Cyan

$opensslConfig = @"
[req]
default_bits = 2048
prompt = no
default_md = sha256
distinguished_name = dn
req_extensions = v3_req

[dn]
C=$country
ST=$state
L=$locality
O=$organization
OU=$organizationalUnit
CN=$commonName

[v3_req]
subjectAltName = @alt_names

[alt_names]
DNS.1 = localhost
DNS.2 = *.localhost
DNS.3 = 127.0.0.1
IP.1 = 127.0.0.1
IP.2 = ::1
"@

$opensslConfig | Out-File -FilePath "ssl/openssl.cnf" -Encoding ASCII

Write-Host ""
Write-Host "🔑 Генерация расширенного сертификата с SAN..." -ForegroundColor Cyan
& openssl req -new -x509 -newkey rsa:2048 -sha256 -nodes `
    -keyout ssl/private.key `
    -out ssl/certificate.crt `
    -days $days `
    -config ssl/openssl.cnf 2>&1 | Out-Null

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Расширенный сертификат создан" -ForegroundColor Green
} else {
    Write-Host "⚠️  Предупреждение при создании расширенного сертификата" -ForegroundColor Yellow
}

# Информация о сертификате
Write-Host ""
Write-Host "📋 Информация о сертификате:" -ForegroundColor Cyan
Write-Host ""
& openssl x509 -in ssl/certificate.crt -noout -text | Select-String -Pattern "Subject:|Not Before|Not After|DNS:"

# Итоговая информация
Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Green
Write-Host "✅ SSL сертификаты успешно созданы!" -ForegroundColor Green
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Green
Write-Host ""
Write-Host "📄 Сертификат:      ssl/certificate.crt" -ForegroundColor Cyan
Write-Host "🔑 Приватный ключ:  ssl/private.key" -ForegroundColor Cyan
Write-Host "⚙️  Конфигурация:   ssl/openssl.cnf" -ForegroundColor Cyan
Write-Host ""
Write-Host "📝 Следующие шаги:" -ForegroundColor Yellow
Write-Host ""
Write-Host "1. Откройте файл .env" -ForegroundColor White
Write-Host "2. Установите следующие параметры:" -ForegroundColor White
Write-Host ""
Write-Host "   HTTPS_ENABLED=true" -ForegroundColor Gray
Write-Host "   SSL_CERT_PATH=./ssl/certificate.crt" -ForegroundColor Gray
Write-Host "   SSL_KEY_PATH=./ssl/private.key" -ForegroundColor Gray
Write-Host "   CORS_ORIGIN=https://localhost:5173" -ForegroundColor Gray
Write-Host ""
Write-Host "3. Запустите сервер:" -ForegroundColor White
Write-Host "   npm run dev" -ForegroundColor Gray
Write-Host ""
Write-Host "⚠️  ВАЖНО: Это самоподписанный сертификат!" -ForegroundColor Yellow
Write-Host "   Браузер покажет предупреждение безопасности." -ForegroundColor Yellow
Write-Host "   Для production используйте Let's Encrypt." -ForegroundColor Yellow
Write-Host ""
