# SBIMiniapp — Telegram Mini App бота «Расширенные заметки»

Интерфейс бота [SBIBot](https://github.com/Zave001/SBIBot): главная со слайдером, дела,
задачи, статистика, профиль. React + TypeScript + Vite, тема и кнопки Telegram.

Сайт — статика на GitHub Pages; данные приложение берёт из API бота (`/api/app/*`)
на его сервере. Пользователь определяется по `initData`, подписанному Telegram:
сервер проверяет подпись, белый список и вход в OpenAI.

Адрес: https://zave001.github.io/SBIMiniapp/ — сборка ветки `main`. Её открывают и
тестовый, и продакшн-бот: каждый бот передаёт адрес своего сервера в ссылке
(`?api=https://…`), а приложение принимает только адреса из списка, заданного при
сборке. Без параметра используется `PROD_API_BASE`.

Workflow [`pages.yml`](.github/workflows/pages.yml) собирает и публикует сайт при
каждом пуше в `main`.

## Настройка (один раз)

1. **Settings → Pages → Build and deployment → Source: GitHub Actions.**
2. **Settings → Secrets and variables → Actions → Variables:**
   - `TEST_API_BASE` = `https://is-torus.online` (это значение по умолчанию)
   - `PROD_API_BASE` = `https://<домен продакшн-сервера>` (когда появится)
3. В боте (секреты репозитория SBIBot) у обоих ботов один адрес:
   `WEBAPP_URL=https://zave001.github.io/SBIMiniapp`. Свой сервер бот подставляет
   в `?api=` сам — из `WEBAPP_DOMAIN` (или `WEBAPP_API_URL`).

   Бот ставит этот адрес в кнопку меню «📱 Приложение» и разрешает запросы к API
   с `https://zave001.github.io` (CORS).

## Разработка

```bash
npm install
npm run dev          # http://localhost:5173, API проксируется на локальный бот (127.0.0.1:8081)
npm run build        # проверка типов + сборка в dist/
```

Внутри Telegram открыть dev-сервер нельзя (нужен HTTPS); для проверки в Telegram
пушьте в `main` — изменения сразу увидят оба бота.

Переменные сборки: `VITE_BASE` — путь сайта (`/SBIMiniapp/`), `VITE_API_BASE` — сервер
бота по умолчанию, `VITE_API_SERVERS` — разрешённые серверы для `?api=` (через запятую).

## Совместимость с ботом

Формат API задаёт бот (`notes_bot/services/webapp.py` в SBIBot), типы ответов — в
[`src/types.ts`](src/types.ts). При изменении API выкатывайте сначала бота, затем
интерфейс — иначе приложение может не понять новый ответ.
