# Инструкция по конфигурации 

В проекте используются два файла окружения: **backend/.env** (сервер) и **frontend/.env** (клиент). Ниже описано, какие переменные задавать и как они влияют на работу приложения.

---

## 1. Backend — backend/.env

Создайте файл `APEC/backend/.env` (или скопируйте из примера) и заполните переменные.

### 1.1. Сервер

| Переменная | Описание | Пример |
|-----------|----------|--------|
| `PORT` | Порт, на котором слушает backend. | `3000` |
| `HOST` | Адрес прослушивания. `0.0.0.0` — все интерфейсы, `127.0.0.1` — только локально. | `0.0.0.0` |
| `NODE_ENV` | Режим: `development` или `production`. Влияет на логи и проверки. | `development` |

### 1.2. База данных

| Переменная | Описание | Пример |
|-----------|----------|--------|
| `DATABASE_URL` | Строка подключения PostgreSQL. Формат: `postgresql://USER:PASSWORD@HOST:PORT/DATABASE?schema=public` | `postgresql://postgres:postgres@localhost:5432/apec_db?schema=public` |

Убедитесь, что база из `DATABASE_URL` создана и доступна до первого запуска и миграций.

### 1.3. JWT и аутентификация

| Переменная | Описание | Пример |
|-----------|----------|--------|
| `JWT_SECRET` | Секретный ключ для подписи JWT. В production обязательно свой, длиной не менее 32 символов. | Случайная строка 32+ символов |
| `JWT_EXPIRES_IN` | Время жизни токена. | `7d`, `24h`, `30d` |
| `JWT_VALIDATION_ENABLED` | Включить проверку минимальной длины секрета. | `true` |
| `JWT_MIN_SECRET_LENGTH` | Минимальная длина `JWT_SECRET` (символов). | `32` |
| `JWT_REQUIRE_IN_PRODUCTION` | Требовать заданный `JWT_SECRET` в production. | `true` |

### 1.4. CORS

| Переменная | Описание | Пример |
|-----------|----------|--------|
| `CORS_ENABLED` | Включить CORS. | `true` |
| `CORS_ORIGIN` | Разрешённый origin фронтенда (URL без слэша в конце). | `http://localhost:5173` |
| `CORS_CREDENTIALS` | Разрешить отправку cookies/заголовков авторизации. | `true` |

В production укажите реальный URL фронтенда (например `https://your-domain.com`).

### 1.5. HTTPS / SSL

| Переменная | Описание | Пример |
|-----------|----------|--------|
| `HTTPS_ENABLED` | Запускать сервер по HTTPS. | `false` |
| `SSL_CERT_PATH` | Путь к сертификату (например fullchain.pem). | Пусто или путь к файлу |
| `SSL_KEY_PATH` | Путь к приватному ключу (например privkey.pem). | Пусто или путь к файлу |
| `SSL_CA_PATH` | Путь к цепочке CA (опционально). | Пусто |
| `SSL_PASSPHRASE` | Пароль к ключу (если используется). | Пусто |

Если `HTTPS_ENABLED=false`, остальные SSL-переменные можно не задавать.

### 1.6. Rate limiting (ограничение частоты запросов)

| Переменная | Описание | Пример |
|-----------|----------|--------|
| `RATE_LIMIT_ENABLED` | Общий выключатель rate limiting. | `true` |
| `GENERAL_RATE_LIMIT_ENABLED` | Включить общий лимит на все запросы. | `false` или `true` |
| `GENERAL_RATE_LIMIT_MAX` | Макс. запросов в окне. | `200` |
| `GENERAL_RATE_LIMIT_WINDOW_MS` | Окно в миллисекундах (900000 = 15 мин). | `900000` |
| `AUTH_RATE_LIMIT_ENABLED` | Лимит на попытки входа/регистрации. | `false` или `true` |
| `AUTH_RATE_LIMIT_MAX` | Макс. попыток входа в окне. | `10` |
| `AUTH_RATE_LIMIT_WINDOW_MS` | Окно для auth (мс). | `900000` |
| `AUTH_RATE_LIMIT_SKIP_SUCCESS` | Не считать успешные попытки входа. | `true` |
| `UPLOAD_RATE_LIMIT_ENABLED` | Лимит на загрузку файлов. | `true` |
| `UPLOAD_RATE_LIMIT_MAX` | Макс. загрузок в окне. | `50` |
| `UPLOAD_RATE_LIMIT_WINDOW_MS` | Окно для загрузок (3600000 = 1 ч). | `3600000` |

### 1.7. Helmet (HTTP-заголовки безопасности)

| Переменная | Описание | Пример |
|-----------|----------|--------|
| `HELMET_ENABLED` | Включить middleware Helmet. | `true` |

### 1.8. Валидация паролей

| Переменная | Описание | Пример |
|-----------|----------|--------|
| `PASSWORD_VALIDATION_ENABLED` | Включить проверку правил пароля. | `true` |
| `PASSWORD_MIN_LENGTH` | Минимальная длина пароля. | `8` |
| `PASSWORD_MAX_LENGTH` | Максимальная длина пароля. | `128` |
| `PASSWORD_REQUIRE_UPPERCASE` | Требовать заглавную букву. | `true` |
| `PASSWORD_REQUIRE_LOWERCASE` | Требовать строчную букву. | `true` |
| `PASSWORD_REQUIRE_NUMBERS` | Требовать цифры. | `true` |
| `PASSWORD_REQUIRE_SPECIAL` | Требовать спецсимволы. | `false` |

### 1.9. Безопасность контента и файлов

| Переменная | Описание | Пример |
|-----------|----------|--------|
| `LOG_SANITIZATION_ENABLED` | Маскировать чувствительные данные в логах. | `true` |
| `HTML_SANITIZATION_ENABLED` | Санитизировать HTML-ввод. | `true` |
| `FILE_VALIDATION_ENABLED` | Валидировать загружаемые файлы. | `true` |
| `FILE_VALIDATION_CHECK_MAGIC_BYTES` | Проверять сигнатуру файла (magic bytes). | `true` |
| `FILE_VALIDATION_CHECK_MIME_TYPE` | Проверять MIME-тип. | `true` |

### 1.10. Загрузка файлов

| Переменная | Описание | Пример |
|-----------|----------|--------|
| `UPLOAD_DIR` | Каталог для загрузок (относительно рабочей директории backend). | `./uploads` |
| `MAX_FILE_SIZE` | Максимальный размер файла в байтах (10485760 = 10 МБ). | `10485760` |


---

## 2. Frontend — frontend/.env

Создайте файл `APEC/frontend/.env`. Переменные должны начинаться с `VITE_`, иначе Vite их не подставит в сборку.

| Переменная | Описание | Пример |
|-----------|----------|--------|
| `VITE_API_URL` | Базовый URL API backend (без слэша в конце). | `http://localhost:3000/api` |
| `VITE_SOCKET_URL` | URL для Socket.IO (обычно тот же хост, что и API, без пути /api). | `http://localhost:3000` |

В production укажите реальные адреса (например `https://api.your-domain.com/api` и `https://api.your-domain.com`).

---

## 3. Порядок действий при ручной настройке

1. Установить Node.js (>=18) и PostgreSQL, создать базу и пользователя.
2. Создать `backend/.env` по разделам выше, обязательно задать `DATABASE_URL` и `JWT_SECRET`.
3. Создать `frontend/.env` с `VITE_API_URL` и `VITE_SOCKET_URL`, совпадающими с хостом и портом backend.
4. В корне проекта выполнить `npm install` (или в backend и frontend по отдельности).
5. В каталоге `backend` выполнить миграции: `npx prisma migrate dev` (или `prisma migrate deploy` в production).
6. При необходимости загрузить справочные данные (скрипты в `scripts/`).
7. Запустить backend и frontend (например `npm run dev` в корне или в каждом workspace).

После этого приложение должно открываться по адресу фронтенда (например http://localhost:5173), а запросы уходить на URL из `VITE_API_URL`.
