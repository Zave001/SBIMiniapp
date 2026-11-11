# SBIMiniapp — Telegram Mini App бота «Расширенные заметки»

Интерфейс бота [SBIBot](https://github.com/Zave001/SBIBot): главная со слайдером, дела,
задачи, статистика, профиль. React + TypeScript + Vite, тема и кнопки Telegram.

Сайт — статика на GitHub Pages; данные приложение берёт из API бота (`/api/app/*`)
на его сервере. Пользователь определяется по `initData`, подписанному Telegram:
сервер проверяет подпись, белый список и вход в OpenAI.

| Ветка | Адрес | Сервер бота (API) |
|---|---|---|
| `main` | https://zave001.github.io/SBIMiniapp/ | `PROD_API_BASE` |
| `test` | https://zave001.github.io/SBIMiniapp/test/ | `TEST_API_BASE` (по умолчанию https://is-torus.online) |

При пуше в любую из веток workflow [`pages.yml`](.github/workflows/pages.yml) собирает
**обе** и публикует вместе: изменения в `test` не попадают в продакшн, пока их не влили
в `main`.

## Настройка (один раз)

1. **Settings → Pages → Build and deployment → Source: GitHub Actions.**
2. **Settings → Secrets and variables → Actions → Variables:**
   - `TEST_API_BASE` = `https://is-torus.online`
   - `PROD_API_BASE` = `https://<домен продакшн-сервера>` (когда появится)
3. Ветка `test`: `git switch -c test && git push -u origin test`.
4. В боте (секреты репозитория SBIBot):
   - `TEST_NOTES_BOT_ENV`: `WEBAPP_URL=https://zave001.github.io/SBIMiniapp/test`
   - `PROD_NOTES_BOT_ENV`: `WEBAPP_URL=https://zave001.github.io/SBIMiniapp`

   Бот ставит этот адрес в кнопку меню «📱 Приложение» и разрешает запросы к API
   с `https://zave001.github.io` (CORS).

## Разработка

```bash
npm install
npm run dev          # http://localhost:5173, API проксируется на локальный бот (127.0.0.1:8081)
npm run build        # проверка типов + сборка в dist/
```

Внутри Telegram открыть dev-сервер нельзя (нужен HTTPS); для проверки в Telegram
пушьте в `test`.

Переменные сборки: `VITE_BASE` — путь сайта (`/SBIMiniapp/` или `/SBIMiniapp/test/`),
`VITE_API_BASE` — адрес сервера бота.

## Совместимость с ботом

Формат API задаёт бот (`notes_bot/services/webapp.py` в SBIBot), типы ответов — в
[`src/types.ts`](src/types.ts). При изменении API выкатывайте сначала бота, затем
интерфейс — иначе приложение может не понять новый ответ.
