# Crossy Pets Next

Новая версия проекта: настоящий браузерный 3D на Babylon.js + TypeScript, Go-сервер.

## Стек

- Go — HTTP/API и отдача production build.
- TypeScript — игровая логика.
- Babylon.js — WebGL/WebGPU 3D.
- Vite — сборка frontend bundle без CDN.

## Почему так

Babylon.js попадает внутрь production bundle. Пользователь открывает обычную ссылку, а браузер загружает все ассеты с вашего сайта. Никаких внешних CDN во время игры не требуется.

## Разработка

```bash
cd web
npm install
npm run dev
```

Обычно Vite откроется на:

```text
http://localhost:5173
```

## Production

```bash
cd web
npm install
npm run build
cd ..
go run .
```

После этого:

```text
http://localhost:8080
```

## Git

```bash
git add .
git commit -m "Rewrite game with Babylon 3D"
git push
```

## GitHub Pages

GitHub Pages запускает только статический frontend и не запускает Go.

Для Pages можно публиковать содержимое `web/dist` после `npm run build`.
Go-сервер позже можно разместить отдельно на Render, Fly.io, Railway или другом Go-хостинге.

Пока gameplay полностью работает на клиенте, поэтому Go API не обязателен для самой игры.

## Управление

Desktop: стрелки / WASD / Space.
Mobile: тап вперед, свайпы и экранные стрелки.

Персонаж, вставший на бревно, движется вместе с ним.
