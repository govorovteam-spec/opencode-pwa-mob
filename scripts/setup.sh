#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

if [ ! -f .env ]; then
  cp .env.example .env
  read -rsp "Пароль для opencode (OPENCODE_PASSWORD): " OC; echo
  read -rsp "Пароль для веб-клиента (WEB_PASSWORD): " WEB; echo
  sed -i "s/^OPENCODE_PASSWORD=.*/OPENCODE_PASSWORD=${OC}/" .env
  sed -i "s/^WEB_PASSWORD=.*/WEB_PASSWORD=${WEB}/" .env
fi

mkdir -p opencode-config
if [ ! -f opencode-config/opencode.json ]; then
  cat > opencode-config/opencode.json <<'JSON'
{
  "provider": {
    "deepseekai": {
      "npm": "@ai-sdk/openai-compatible",
      "name": "DeepSeek",
      "options": {
        "baseURL": "https://api.deepseek.com/v1",
        "apiKey": "{env:DEEPSEEK_API_KEY}"
      },
      "models": {
        "deepseek-chat": { "name": "DeepSeek Chat" }
      }
    }
  },
  "model": "deepseekai/deepseek-chat"
}
JSON
  echo "Создан opencode-config/opencode.json — добавьте провайдера и ключ."
fi

if ! command -v docker >/dev/null 2>&1; then
  echo "Docker не найден. Установите Docker и Docker Compose, затем повторите." >&2
  exit 1
fi

docker compose up -d --build
echo "Готово. Откройте http://<IP>:3000 (логин: ${WEB_USER:-admin})."
