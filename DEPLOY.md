# Инструкция по развёртыванию СтудСобытий на сервере

## Содержание
1. [Требования к серверу](#1-требования-к-серверу)
2. [Подготовка сервера](#2-подготовка-сервера)
3. [Загрузка проекта](#3-загрузка-проекта)
4. [Настройка переменных окружения](#4-настройка-переменных-окружения)
5. [Первый запуск](#5-первый-запуск)
6. [Настройка домена и HTTPS](#6-настройка-домена-и-https)
7. [Управление и обновление](#7-управление-и-обновление)
8. [Резервное копирование](#8-резервное-копирование)
9. [Мониторинг и логи](#9-мониторинг-и-логи)
10. [Решение проблем](#10-решение-проблем)

---

## 1. Требования к серверу

### Минимальные характеристики
| Параметр | Минимум | Рекомендуется |
|----------|---------|---------------|
| CPU | 1 vCPU | 2 vCPU |
| RAM | 1 GB | 2 GB |
| Диск | 20 GB SSD | 40 GB SSD |
| ОС | Ubuntu 22.04 LTS | Ubuntu 22.04 LTS |

### Где арендовать
- **Бесплатно для учёбы:** [Oracle Cloud Free Tier](https://www.oracle.com/cloud/free/) — 2 vCPU, 1 GB RAM навсегда бесплатно
- **Российские**: Selectel, Timeweb Cloud, Beget VPS — от 300 ₽/мес
- **Международные**: DigitalOcean, Hetzner — от $5/мес

---

## 2. Подготовка сервера

### 2.1 Подключение к серверу
```bash
ssh root@<IP_СЕРВЕРА>
```

### 2.2 Обновление системы
```bash
apt update && apt upgrade -y
```

### 2.3 Установка Docker
```bash
# Удаляем старые версии (если есть)
apt remove -y docker docker-engine docker.io containerd runc 2>/dev/null || true

# Устанавливаем зависимости
apt install -y ca-certificates curl gnupg lsb-release

# Добавляем официальный репозиторий Docker
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | \
  gpg --dearmor -o /etc/apt/keyrings/docker.gpg
chmod a+r /etc/apt/keyrings/docker.gpg

echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
  https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | \
  tee /etc/apt/sources.list.d/docker.list > /dev/null

# Устанавливаем Docker Engine + Compose
apt update
apt install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

# Проверяем установку
docker --version
docker compose version
```

### 2.4 Настройка файрвола
```bash
# Разрешаем SSH, HTTP, HTTPS
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable
ufw status
```

### 2.5 Создание рабочего пользователя (рекомендуется)
```bash
# Создаём пользователя deploy (не запускаем всё от root)
adduser --disabled-password --gecos "" deploy
usermod -aG docker deploy
# Копируем SSH-ключ
rsync --archive --chown=deploy:deploy ~/.ssh /home/deploy
```

---

## 3. Загрузка проекта

### Вариант А — из GitHub
```bash
su - deploy        # или остаёмся root
cd /opt

git clone https://github.com/<ВАШ_АККАУНТ>/graduation-work.git
cd graduation-work
```

### Вариант Б — загрузка архивом (если репозиторий приватный)
На **локальной машине** (Windows):
```powershell
# Создаём архив (из папки выше graduation-work)
cd C:\Users\arsen
tar -czf graduation-work.tar.gz graduation-work --exclude graduation-work/node_modules --exclude graduation-work/frontend/node_modules --exclude graduation-work/backend/node_modules --exclude graduation-work/.git

# Загружаем на сервер
scp graduation-work.tar.gz root@<IP_СЕРВЕРА>:/opt/
```

На **сервере**:
```bash
cd /opt
tar -xzf graduation-work.tar.gz
cd graduation-work
```

---

## 4. Настройка переменных окружения

```bash
cd /opt/graduation-work

# Копируем шаблон
cp .env.prod.example .env.prod

# Открываем для редактирования
nano .env.prod
```

Заполняем файл `.env.prod`:

```env
# PostgreSQL
POSTGRES_USER=events_user
POSTGRES_PASSWORD=           # ← придумайте надёжный пароль (мин. 20 символов)
POSTGRES_DB=events_db

# Redis
REDIS_PASSWORD=              # ← отдельный пароль для Redis

# JWT — генерируем случайные строки:
# openssl rand -hex 64
JWT_SECRET=                  # ← вставьте результат команды выше
QR_SECRET=                   # ← ещё раз запустите openssl rand -hex 64

JWT_EXPIRES_IN=15m
REFRESH_TOKEN_EXPIRES_IN=7d
```

**Команды для генерации секретов:**
```bash
# Генерировать JWT_SECRET
openssl rand -hex 64

# Генерировать QR_SECRET
openssl rand -hex 64

# Генерировать пароль для БД
openssl rand -base64 32
```

**Защищаем файл с секретами:**
```bash
chmod 600 .env.prod
```

---

## 5. Первый запуск

### 5.1 Сборка и запуск контейнеров
```bash
cd /opt/graduation-work

docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --build
```

> Первая сборка занимает **5–10 минут** (компиляция TypeScript, сборка Vite, скачивание образов).

### 5.2 Проверка статуса
```bash
# Все контейнеры должны быть в статусе "Up"
docker compose -f docker-compose.prod.yml ps

# Ожидаемый вывод:
# NAME               STATUS          PORTS
# events_postgres    Up (healthy)
# events_redis       Up (healthy)
# events_backend     Up              4000/tcp
# events_frontend    Up              0.0.0.0:80->80/tcp
```

### 5.3 Проверка работы
```bash
# API (должен вернуть JSON)
curl http://localhost/api/health

# Или с IP сервера из браузера:
# http://<IP_СЕРВЕРА>
```

### 5.4 Заполнение начальных данных (seed)
```bash
# Заходим в контейнер бэкенда
docker exec -it events_backend sh

# Внутри контейнера:
npx ts-node prisma/seed.ts
exit
```

---

## 6. Настройка домена и HTTPS

> Если домена ещё нет — пропустите этот раздел. Сайт будет доступен по IP.

### 6.1 Привязка домена
В панели управления DNS-регистратора добавьте A-запись:
```
Тип: A
Имя: @  (или поддомен, например events)
Значение: <IP_СЕРВЕРА>
TTL: 3600
```
Проверка (подождать 5–30 минут после добавления):
```bash
ping ВАШ_ДОМЕН.ru
```

### 6.2 Получение SSL-сертификата (Let's Encrypt)

**Шаг 1 — обновляем nginx.conf фронтенда** для подтверждения домена:

Откройте `/opt/graduation-work/frontend/nginx.conf` и добавьте блок для certbot перед `location /`:
```nginx
# Добавить ПЕРЕД location /
location /.well-known/acme-challenge/ {
    root /var/www/certbot;
}
```

**Шаг 2 — добавляем certbot в docker-compose.prod.yml:**
```yaml
# Добавить сервис certbot
  certbot:
    image: certbot/certbot
    volumes:
      - ./certbot/conf:/etc/letsencrypt
      - ./certbot/www:/var/www/certbot
```

В сервисе `frontend` добавить тома:
```yaml
    volumes:
      - ./certbot/conf:/etc/letsencrypt:ro
      - ./certbot/www:/var/www/certbot:ro
```

**Шаг 3 — получаем сертификат:**
```bash
# Останавливаем текущий фронтенд
docker compose -f docker-compose.prod.yml stop frontend

# Получаем сертификат (замените домен и email)
docker run --rm -v "$(pwd)/certbot/conf:/etc/letsencrypt" \
  -v "$(pwd)/certbot/www:/var/www/certbot" \
  -p 80:80 certbot/certbot certonly --standalone \
  -d ВАШ_ДОМЕН.ru --email ВАШ_EMAIL@gmail.com --agree-tos --no-eff-email
```

**Шаг 4 — обновляем nginx.conf** для HTTPS:
```nginx
# Редирект HTTP → HTTPS
server {
    listen 80;
    server_name ВАШ_ДОМЕН.ru;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    server_name ВАШ_ДОМЕН.ru;

    ssl_certificate /etc/letsencrypt/live/ВАШ_ДОМЕН.ru/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/ВАШ_ДОМЕН.ru/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers off;

    root /usr/share/nginx/html;
    index index.html;

    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml image/svg+xml;

    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff2?)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        try_files $uri =404;
    }

    location /api/ {
        proxy_pass http://backend:4000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

**Шаг 5 — пересобираем и запускаем:**
```bash
docker compose -f docker-compose.prod.yml up -d --build frontend
```

**Шаг 6 — автопродление сертификата (cron):**
```bash
crontab -e
# Добавить строку (обновление каждые 12 часов):
0 0,12 * * * cd /opt/graduation-work && docker run --rm -v "$(pwd)/certbot/conf:/etc/letsencrypt" -v "$(pwd)/certbot/www:/var/www/certbot" certbot/certbot renew --quiet && docker exec events_frontend nginx -s reload
```

---

## 7. Управление и обновление

### Остановка / запуск
```bash
# Остановить всё
docker compose -f docker-compose.prod.yml down

# Запустить снова
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d

# Перезапустить один сервис
docker compose -f docker-compose.prod.yml restart backend
```

### Обновление после изменений в коде

```bash
cd /opt/graduation-work

# Если репозиторий на GitHub:
git pull

# Пересобрать изменённые сервисы и перезапустить
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --build

# Старые образы можно удалить, чтобы освободить место:
docker image prune -f
```

---

## 8. Резервное копирование

### Бэкап базы данных
```bash
# Создать дамп
docker exec events_postgres pg_dump \
  -U events_user events_db | gzip > /opt/backups/db_$(date +%Y%m%d_%H%M).sql.gz

# Создать папку для бэкапов
mkdir -p /opt/backups
```

### Автоматический бэкап (каждый день в 3:00)
```bash
crontab -e

# Добавить:
0 3 * * * docker exec events_postgres pg_dump -U events_user events_db | gzip > /opt/backups/db_$(date +\%Y\%m\%d).sql.gz && find /opt/backups -name "*.sql.gz" -mtime +30 -delete
```

### Восстановление из бэкапа
```bash
gunzip -c /opt/backups/db_20260101_0300.sql.gz | \
  docker exec -i events_postgres psql -U events_user events_db
```

---

## 9. Мониторинг и логи

### Просмотр логов
```bash
# Все контейнеры в реальном времени
docker compose -f docker-compose.prod.yml logs -f

# Только бэкенд
docker compose -f docker-compose.prod.yml logs -f backend

# Только фронтенд (nginx)
docker compose -f docker-compose.prod.yml logs -f frontend

# Последние 100 строк бэкенда
docker compose -f docker-compose.prod.yml logs --tail=100 backend
```

### Использование ресурсов
```bash
# CPU и RAM контейнеров
docker stats

# Занятое место на диске
docker system df
```

---

## 10. Решение проблем

### Контейнер не запускается
```bash
# Смотрим подробные логи
docker compose -f docker-compose.prod.yml logs backend

# Частая причина — неверный DATABASE_URL или БД ещё не готова
# Проверяем healthcheck базы:
docker inspect events_postgres | grep -A 10 Health
```

### Ошибка "port 80 already in use"
```bash
# Найти, кто занимает порт
lsof -i :80
# Остановить
systemctl stop nginx   # если установлен системный nginx
```

### Нет места на диске
```bash
# Удалить неиспользуемые образы, контейнеры, тома
docker system prune -a --volumes

# ⚠️ Это удалит и данные БД если том не именованный!
# Для удаления только образов (безопасно):
docker image prune -a -f
```

### Забыл пароль администратора
```bash
# Подключиться к БД
docker exec -it events_postgres psql -U events_user -d events_db

# Внутри psql — сбросить пароль пользователя admin:
UPDATE "User" SET "passwordHash" = '$2b$10$...' WHERE login = 'admin';
# Хеш генерируется через bcrypt, проще создать нового пользователя через seed
\q
```

---

## Быстрая шпаргалка

```bash
# Запустить
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --build

# Остановить
docker compose -f docker-compose.prod.yml down

# Логи
docker compose -f docker-compose.prod.yml logs -f

# Статус
docker compose -f docker-compose.prod.yml ps

# Бэкап БД
docker exec events_postgres pg_dump -U events_user events_db | gzip > backup.sql.gz

# Обновить после git pull
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --build
```
