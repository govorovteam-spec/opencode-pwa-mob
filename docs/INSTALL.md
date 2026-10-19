# Установка OpenCode PWA Mob

Три варианта: всё в Docker (рекомендуется), консольный opencode + клиент, подключение к уже работающему opencode.

---

## Вариант A. Всё в Docker (рекомендуется)

Требования: VPS/ПК с Docker и Docker Compose.

```bash
git clone https://github.com/<you>/opencode-pwa-mob.git
cd opencode-pwa-mob
bash scripts/setup.sh
```

Скрипт:
1. создаст `.env` и спросит пароли (`OPENCODE_PASSWORD`, `WEB_PASSWORD`);
2. создаст `opencode-config/opencode.json` (заготовка провайдера);
3. поднимет `opencode serve` (официальный образ `ghcr.io/anomalyco/opencode`) и клиент.

Откройте `http://<IP>:3000`, логин `admin`, пароль из `.env`.

**Провайдер и ключ.** Отредактируйте `opencode-config/opencode.json` и добавьте ключ (или используйте `{env:VAR}` и передайте переменную в контейнер). Пример для DeepSeek:

```json
{
  "provider": {
    "deepseekai": {
      "npm": "@ai-sdk/openai-compatible",
      "name": "DeepSeek",
      "options": {
        "baseURL": "https://api.deepseek.com/v1",
        "apiKey": "{env:DEEPSEEK_API_KEY}"
      },
      "models": { "deepseek-chat": { "name": "DeepSeek Chat" } }
    }
  },
  "model": "deepseekai/deepseek-chat"
}
```

Затем `docker compose restart opencode`.

**HTTPS.** Поставьте перед клиентом Caddy/Traefik/nginx. Пример Caddy:

```caddy
chat.example.com {
    reverse_proxy 127.0.0.1:3000
}
```

Для SSE в nginx: `proxy_buffering off;`.

---

## Вариант B. Консольный opencode + клиент (без Docker)

### 1. Установить opencode CLI

```bash
curl -fsSL https://opencode.ai/install | bash
# или
npm install -g opencode-ai
```

Проверка:

```bash
opencode --version
```

Скрипт из репозитория (делает то же самое):

```bash
bash scripts/install-opencode.sh
```

### 2. Настроить провайдера

```bash
opencode auth login
```

Или создайте `~/.config/opencode/opencode.json` с провайдером и моделью (см. пример выше). Ключ можно хранить в переменной окружения.

### 3. Запустить сервер opencode

```bash
export OPENCODE_SERVER_PASSWORD='длинный-пароль'
opencode serve --port 8888 --hostname 0.0.0.0
```

> Для официального UI (`opencode web`) нужен **проект** — папка, выбранная в интерфейсе. Наш клиент этого не требует: он создаёт сессии напрямую.

### 4. Запустить веб-клиент

```bash
cd opencode-pwa-mob
npm install --omit=dev   # зависимостей нет, шаг не обязателен
OPENCODE_URL=http://127.0.0.1:8888 \
OPENCODE_PASSWORD='длинный-пароль' \
WEB_USER=admin \
WEB_PASSWORD='пароль-для-входа' \
node server.mjs
```

Откройте `http://<IP>:3000`.

---

## Вариант C. Подключение к уже работающему opencode

Если `opencode serve` уже крутится на другом хосте:

```bash
OPENCODE_URL=http://192.168.1.10:8888 \
OPENCODE_PASSWORD='...' \
WEB_USER=admin WEB_PASSWORD='...' \
node server.mjs
```

Или в `docker-compose.yml` уберите сервис `opencode` и задайте `OPENCODE_URL` в `.env`.

---

## Обновление

```bash
git pull
docker compose up -d --build
```

Или, для консольного варианта, обновите opencode (`curl -fsSL https://opencode.ai/install | bash`) и перезапустите `opencode serve`.

---

## Частые проблемы

- **401 / просит пароль** — проверьте `WEB_USER`/`WEB_PASSWORD`, а для opencode — `OPENCODE_PASSWORD` (Basic, пользователь `opencode`).
- **Ответы не стримятся** — reverse-proxy буферизует SSE: отключите буферизацию (`proxy_buffering off` / `X-Accel-Buffering: no`).
- **PWA не устанавливается** — нужен HTTPS (или localhost). По `http://IP` установка недоступна.
- **Официальный UI не создаёт сессию** — сначала добавьте проект (папку) в интерфейсе. Наш клиент работает без проекта.
