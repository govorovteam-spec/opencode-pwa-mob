# РЈСЃС‚Р°РЅРѕРІРєР° OpenCode PWA Mob

РўСЂРё РІР°СЂРёР°РЅС‚Р°: РІСЃС‘ РІ Docker (СЂРµРєРѕРјРµРЅРґСѓРµС‚СЃСЏ), РєРѕРЅСЃРѕР»СЊРЅС‹Р№ opencode + РєР»РёРµРЅС‚, РїРѕРґРєР»СЋС‡РµРЅРёРµ Рє СѓР¶Рµ СЂР°Р±РѕС‚Р°СЋС‰РµРјСѓ opencode.

---

## Р’Р°СЂРёР°РЅС‚ A. Р’СЃС‘ РІ Docker (СЂРµРєРѕРјРµРЅРґСѓРµС‚СЃСЏ)

РўСЂРµР±РѕРІР°РЅРёСЏ: VPS/РџРљ СЃ Docker Рё Docker Compose.

```bash
git clone https://github.com/govorovteam-spec/opencode-pwa-mob.git
cd opencode-pwa-mob
bash scripts/setup.sh
```

РЎРєСЂРёРїС‚:
1. СЃРѕР·РґР°СЃС‚ `.env` Рё СЃРїСЂРѕСЃРёС‚ РїР°СЂРѕР»Рё (`OPENCODE_PASSWORD`, `WEB_PASSWORD`);
2. СЃРѕР·РґР°СЃС‚ `opencode-config/opencode.json` (Р·Р°РіРѕС‚РѕРІРєР° РїСЂРѕРІР°Р№РґРµСЂР°);
3. РїРѕРґРЅРёРјРµС‚ `opencode serve` (РѕС„РёС†РёР°Р»СЊРЅС‹Р№ РѕР±СЂР°Р· `ghcr.io/anomalyco/opencode`) Рё РєР»РёРµРЅС‚.

РћС‚РєСЂРѕР№С‚Рµ `http://<IP>:3000`, Р»РѕРіРёРЅ `admin`, РїР°СЂРѕР»СЊ РёР· `.env`.

**РџСЂРѕРІР°Р№РґРµСЂ Рё РєР»СЋС‡.** РћС‚СЂРµРґР°РєС‚РёСЂСѓР№С‚Рµ `opencode-config/opencode.json` Рё РґРѕР±Р°РІСЊС‚Рµ РєР»СЋС‡ (РёР»Рё РёСЃРїРѕР»СЊР·СѓР№С‚Рµ `{env:VAR}` Рё РїРµСЂРµРґР°Р№С‚Рµ РїРµСЂРµРјРµРЅРЅСѓСЋ РІ РєРѕРЅС‚РµР№РЅРµСЂ). РџСЂРёРјРµСЂ РґР»СЏ DeepSeek:

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

Р—Р°С‚РµРј `docker compose restart opencode`.

**HTTPS.** РџРѕСЃС‚Р°РІСЊС‚Рµ РїРµСЂРµРґ РєР»РёРµРЅС‚РѕРј Caddy/Traefik/nginx. РџСЂРёРјРµСЂ Caddy:

```caddy
chat.example.com {
    reverse_proxy 127.0.0.1:3000
}
```

Р”Р»СЏ SSE РІ nginx: `proxy_buffering off;`.

---

## Р’Р°СЂРёР°РЅС‚ B. РљРѕРЅСЃРѕР»СЊРЅС‹Р№ opencode + РєР»РёРµРЅС‚ (Р±РµР· Docker)

### 1. РЈСЃС‚Р°РЅРѕРІРёС‚СЊ opencode CLI

```bash
curl -fsSL https://opencode.ai/install | bash
# РёР»Рё
npm install -g opencode-ai
```

РџСЂРѕРІРµСЂРєР°:

```bash
opencode --version
```

РЎРєСЂРёРїС‚ РёР· СЂРµРїРѕР·РёС‚РѕСЂРёСЏ (РґРµР»Р°РµС‚ С‚Рѕ Р¶Рµ СЃР°РјРѕРµ):

```bash
bash scripts/install-opencode.sh
```

### 2. РќР°СЃС‚СЂРѕРёС‚СЊ РїСЂРѕРІР°Р№РґРµСЂР°

```bash
opencode auth login
```

РР»Рё СЃРѕР·РґР°Р№С‚Рµ `~/.config/opencode/opencode.json` СЃ РїСЂРѕРІР°Р№РґРµСЂРѕРј Рё РјРѕРґРµР»СЊСЋ (СЃРј. РїСЂРёРјРµСЂ РІС‹С€Рµ). РљР»СЋС‡ РјРѕР¶РЅРѕ С…СЂР°РЅРёС‚СЊ РІ РїРµСЂРµРјРµРЅРЅРѕР№ РѕРєСЂСѓР¶РµРЅРёСЏ.

### 3. Р—Р°РїСѓСЃС‚РёС‚СЊ СЃРµСЂРІРµСЂ opencode

```bash
export OPENCODE_SERVER_PASSWORD='РґР»РёРЅРЅС‹Р№-РїР°СЂРѕР»СЊ'
opencode serve --port 8888 --hostname 0.0.0.0
```

> Р”Р»СЏ РѕС„РёС†РёР°Р»СЊРЅРѕРіРѕ UI (`opencode web`) РЅСѓР¶РµРЅ **РїСЂРѕРµРєС‚** вЂ” РїР°РїРєР°, РІС‹Р±СЂР°РЅРЅР°СЏ РІ РёРЅС‚РµСЂС„РµР№СЃРµ. РќР°С€ РєР»РёРµРЅС‚ СЌС‚РѕРіРѕ РЅРµ С‚СЂРµР±СѓРµС‚: РѕРЅ СЃРѕР·РґР°С‘С‚ СЃРµСЃСЃРёРё РЅР°РїСЂСЏРјСѓСЋ.

### 4. Р—Р°РїСѓСЃС‚РёС‚СЊ РІРµР±-РєР»РёРµРЅС‚

```bash
cd opencode-pwa-mob
npm install --omit=dev   # Р·Р°РІРёСЃРёРјРѕСЃС‚РµР№ РЅРµС‚, С€Р°Рі РЅРµ РѕР±СЏР·Р°С‚РµР»РµРЅ
OPENCODE_URL=http://127.0.0.1:8888 \
OPENCODE_PASSWORD='РґР»РёРЅРЅС‹Р№-РїР°СЂРѕР»СЊ' \
WEB_USER=admin \
WEB_PASSWORD='РїР°СЂРѕР»СЊ-РґР»СЏ-РІС…РѕРґР°' \
node server.mjs
```

РћС‚РєСЂРѕР№С‚Рµ `http://<IP>:3000`.

---

## Р’Р°СЂРёР°РЅС‚ C. РџРѕРґРєР»СЋС‡РµРЅРёРµ Рє СѓР¶Рµ СЂР°Р±РѕС‚Р°СЋС‰РµРјСѓ opencode

Р•СЃР»Рё `opencode serve` СѓР¶Рµ РєСЂСѓС‚РёС‚СЃСЏ РЅР° РґСЂСѓРіРѕРј С…РѕСЃС‚Рµ:

```bash
OPENCODE_URL=http://192.168.1.10:8888 \
OPENCODE_PASSWORD='...' \
WEB_USER=admin WEB_PASSWORD='...' \
node server.mjs
```

РР»Рё РІ `docker-compose.yml` СѓР±РµСЂРёС‚Рµ СЃРµСЂРІРёСЃ `opencode` Рё Р·Р°РґР°Р№С‚Рµ `OPENCODE_URL` РІ `.env`.

---

## РћР±РЅРѕРІР»РµРЅРёРµ

```bash
git pull
docker compose up -d --build
```

РР»Рё, РґР»СЏ РєРѕРЅСЃРѕР»СЊРЅРѕРіРѕ РІР°СЂРёР°РЅС‚Р°, РѕР±РЅРѕРІРёС‚Рµ opencode (`curl -fsSL https://opencode.ai/install | bash`) Рё РїРµСЂРµР·Р°РїСѓСЃС‚РёС‚Рµ `opencode serve`.

---

## Р§Р°СЃС‚С‹Рµ РїСЂРѕР±Р»РµРјС‹

- **401 / РїСЂРѕСЃРёС‚ РїР°СЂРѕР»СЊ** вЂ” РїСЂРѕРІРµСЂСЊС‚Рµ `WEB_USER`/`WEB_PASSWORD`, Р° РґР»СЏ opencode вЂ” `OPENCODE_PASSWORD` (Basic, РїРѕР»СЊР·РѕРІР°С‚РµР»СЊ `opencode`).
- **РћС‚РІРµС‚С‹ РЅРµ СЃС‚СЂРёРјСЏС‚СЃСЏ** вЂ” reverse-proxy Р±СѓС„РµСЂРёР·СѓРµС‚ SSE: РѕС‚РєР»СЋС‡РёС‚Рµ Р±СѓС„РµСЂРёР·Р°С†РёСЋ (`proxy_buffering off` / `X-Accel-Buffering: no`).
- **PWA РЅРµ СѓСЃС‚Р°РЅР°РІР»РёРІР°РµС‚СЃСЏ** вЂ” РЅСѓР¶РµРЅ HTTPS (РёР»Рё localhost). РџРѕ `http://IP` СѓСЃС‚Р°РЅРѕРІРєР° РЅРµРґРѕСЃС‚СѓРїРЅР°.
- **РћС„РёС†РёР°Р»СЊРЅС‹Р№ UI РЅРµ СЃРѕР·РґР°С‘С‚ СЃРµСЃСЃРёСЋ** вЂ” СЃРЅР°С‡Р°Р»Р° РґРѕР±Р°РІСЊС‚Рµ РїСЂРѕРµРєС‚ (РїР°РїРєСѓ) РІ РёРЅС‚РµСЂС„РµР№СЃРµ. РќР°С€ РєР»РёРµРЅС‚ СЂР°Р±РѕС‚Р°РµС‚ Р±РµР· РїСЂРѕРµРєС‚Р°.

