# OpenCode на телефоне: мобильный PWA-клиент к терминальному AI-агенту

*Материал подготовлен с помощью AI-ассистента OpenCode; факты, код и выводы проверены автором.*

Я каждый день работаю с [opencode](https://opencode.ai) — терминальным AI-агентом, который правит код, запускает команды и держит контекст проекта. На ПК всё отлично: TUI, хоткеи, привычный workflow. Проблема начинается, когда нужно отойти от ноутбука: посмотреть, что делает агент, ответить на вопрос или запустить задачу с телефона.

У opencode есть официальный веб-интерфейс (`opencode web`), и это важно сказать сразу. Но он проектный: сначала нужно добавить папку проекта, потом создать сессию. Для сценария «достал телефон, открыл чат, написал» это лишние шаги. Плюс мне хотелось видеть привычный лог инструментов и статусы, а не абстрактный спиннер.

Так появился **OpenCode PWA Mob** — тонкий PWA-клиент к `opencode serve`. В этой статье — архитектура, код, грабли и честное сравнение с официальным UI.

Репозиторий: [github.com/govorovteam-spec/opencode-pwa-mob](https://github.com/govorovteam-spec/opencode-pwa-mob)

---

## Что уже есть у opencode

opencode умеет запускаться как сервер:

```bash
OPENCODE_SERVER_PASSWORD=secret opencode serve --port 8888 --hostname 0.0.0.0
```

Сервер отдаёт HTTP API: сессии, сообщения, модели, события. Официальный `opencode web` — это фронтенд к этому же API. Мой проект — альтернативный фронтенд: мобильный, компактный и без обязательного выбора проекта.

Что важно: **своей базы у клиента нет**. Все сессии и сообщения живут в opencode. Клиент — это прокси и SPA.

## Архитектура

```
Телефон/браузер (PWA)
        │  HTTP + SSE
        ▼
   server.mjs
   (Basic auth, прокси, стриминг)
        │  HTTP API
        ▼
   opencode serve :8888
        │
        ├── DeepSeek / OpenAI / Anthropic / Ollama
        └── инструменты: bash, edit, read, grep…
```

Три задачи `server.mjs`:

1. Отдать статику (один HTML);
2. Закрыть всё Basic-авторизацией;
3. Проксировать API и SSE, чтобы браузер не общался с opencode напрямую.

## Прокси: 60 строк

Вся связь с opencode — одна функция:

```js
const OC_URL = process.env.OPENCODE_URL || 'http://127.0.0.1:8888';
const OC_AUTH = 'Basic ' + Buffer.from('opencode:' + process.env.OPENCODE_PASSWORD).toString('base64');

async function oc(method, path, body) {
  const r = await fetch(OC_URL + path, {
    method,
    headers: { 'Authorization': OC_AUTH, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined
  });
  return { status: r.status, text: await r.text() };
}
```

Дальше — обычные ручки: `POST /api/send`, `GET /api/messages`, `POST /api/stop`, `GET /api/models`, `GET /api/menu`. `send` создаёт сессию, если её нет, ставит модель и отправляет prompt:

```js
if (!sid) {
  const c = await oc('POST', '/api/session', { title: 'Chat' });
  sid = JSON.parse(c.text).data.id;
}
await oc('POST', `/api/session/${sid}/model`, { model: b.model });
await oc('POST', `/api/session/${sid}/prompt`, { prompt: { text: b.text } });
```

## Стриминг без велосипеда

opencode отдаёт события через SSE. Прокси просто перекладывает поток:

```js
res.writeHead(200, {
  'Content-Type': 'text/event-stream; charset=utf-8',
  'Cache-Control': 'no-cache, no-transform',
  'Connection': 'keep-alive',
  'X-Accel-Buffering': 'no'
});
const r = await fetch(`${OC_URL}/api/session/${sid}/event`, {
  headers: { 'Authorization': OC_AUTH, 'Accept': 'text/event-stream' }
});
const reader = r.body.getReader();
while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  res.write(Buffer.from(value));
}
```

На клиенте — обычный `EventSource`. По событиям обновляю статус и подтягиваю сообщения:

```js
if (/reasoning\.(started|delta)/.test(t)) setStatus('Размышление');
else if (/tool\.(called|progress)/.test(t)) setStatus('Выполнение');
else if (/text\.(started|delta)/.test(t)) setStatus('Ответ');
else if (/compaction\.(started|delta)/.test(t)) setStatus('Сжатие чата');
```

## Лог инструментов, а не спиннер

Мне важно видеть, что именно делает агент. Сообщения opencode приходят частями: текст, reasoning и `tool`. Из tool-частей собираю компактные строки:

```js
function verb(n) {
  return ({
    bash: 'Оболочка', write: 'Написать', edit: 'Редактировать',
    read: 'Читать', grep: 'Поиск', glob: 'Поиск',
    webfetch: 'Открыть', task: 'Задача'
  })[n] || n;
}
```

Для `edit`/`write` считаю diff по входным строкам и показываю `+N −M`:

```js
if (n === 'edit') {
  const a = String(inp.newString || '').split('\n').length;
  const r = String(inp.oldString || '').split('\n').length;
  return `<span class="a">+${a}</span> <span class="d">−${r}</span>`;
}
```

Получается как в TUI: «Оболочка `npm test`», «Редактировать `server.mjs` +12 −3».

## PWA: установка на телефон

Клиент — один HTML плюс манифест и service worker. Манифест:

```json
{
  "name": "OpenCode PWA Mob",
  "short_name": "OpenCode",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#0b0b0b",
  "theme_color": "#0b0b0b",
  "icons": [
    { "src": "/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icon-512.png", "sizes": "512x512", "type": "image/png" }
  ]
}
```

Service worker кэширует оболочку, но **не трогает `/api/`** — иначе стриминг и сессии сломаются:

```js
if (u.pathname.startsWith('/api/')) return;
```

Установка работает по HTTPS (или localhost): «Добавить на главный экран» → приложение открывается без адресной строки.

## Docker: одна команда

В репозитории — compose с официальным образом opencode и клиентом:

```yaml
services:
  opencode:
    image: ghcr.io/anomalyco/opencode:latest
    command: ["serve", "--port", "8888", "--hostname", "0.0.0.0"]
    environment:
      OPENCODE_SERVER_PASSWORD: ${OPENCODE_PASSWORD}

  web:
    build: .
    ports: ["3000:3000"]
    environment:
      OPENCODE_URL: http://opencode:8888
      OPENCODE_PASSWORD: ${OPENCODE_PASSWORD}
      WEB_USER: ${WEB_USER:-admin}
      WEB_PASSWORD: ${WEB_PASSWORD}
```

`opencode serve` наружу не публикуется — только клиент. Для HTTPS достаточно Caddy:

```caddy
chat.example.com {
    reverse_proxy 127.0.0.1:3000
}
```

## Что получилось

![Мобильный](docs/screenshot-mobile-frame.png)

Что умеет:

- чат и продолжение сессий;
- стриминг ответа;
- лог инструментов и diff;
- статусы: размышление, выполнение, ответ, сжатие чата, ошибка, остановлено;
- выбор модели и стоп;
- `/` — команды и навыки opencode;
- PWA на телефон.

## Грабли

**SSE и reverse-proxy.** nginx по умолчанию буферизует ответы — стриминг «залипает». Лечится `proxy_buffering off;` и заголовком `X-Accel-Buffering: no`.

**PWA и HTTPS.** По `http://IP:3000` установка не предложится. Нужен HTTPS или localhost.

**Официальный UI и проекты.** `opencode web` сначала просит добавить проект (папку). Мой клиент создаёт сессию напрямую — для сценария «просто чат» это удобнее.

**Версии API.** opencode развивается, API может меняться. Клиент — тонкий; при изменениях правится в одном месте.

**Безопасность.** `opencode serve` нельзя выставлять в интернет. Клиент закрыт Basic auth, но для публичного доступа обязателен HTTPS и нормальный reverse-proxy.

## Зачем свой клиент, если есть официальный

Честный ответ: если нужен полный веб-интерфейс — берите `opencode web`. Свой клиент имеет смысл, когда нужно:

- мобильный сценарий: PWA, крупные кнопки, компактный чат;
- встроить агента в свой продукт (у меня он живёт вкладкой в трекере);
- свой UX: лог инструментов, статусы, стоп, минимум лишнего;
- подключиться к удалённому `opencode serve` без выставления полного UI.

## Ссылки

- Репозиторий: https://github.com/govorovteam-spec/opencode-pwa-mob
- Установка: https://github.com/govorovteam-spec/opencode-pwa-mob/blob/main/docs/INSTALL.md
- opencode: https://opencode.ai

Лицензия — MIT. Если пригодится — ставьте звезду и пишите issue.
