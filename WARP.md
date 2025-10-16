# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

Project overview and architecture

- Repository layout
  - frontend/: React 17 + TypeScript (Create React App), Redux, Ant Design, SCSS
  - backend/: Node.js + Express + Sequelize (MySQL), Redis client, Socket.IO for realtime chat
  - nginx/: Reverse proxy for frontend and backend in containerized runs
  - docker-compose.yml: Orchestrates nginx, backend, frontend, Redis, and MariaDB
- Service topology (docker-compose)
  - nginx listens on 3009 and proxies:
    - / -> frontend at frontend:3033
    - /api -> backend at backend:3001
  - backend container exposes 3001; frontend container serves built assets via nginx at 3033
- Local (non-Docker) development defaults
  - Backend server port comes from backend/src/config/serverConfig.js: 3003 in development
  - MySQL defaults (development): host localhost, port 3306, user root, password 1234, database case
  - Redis defaults: connects to localhost:6379 (see backend/src/redis/manager.js)
  - Frontend API base: frontend/src/api/config.js -> API_URL = http://localhost:3003/api
- Backend layering (big picture)
  - Routes (backend/routes.js) register feature modules under ./src (auth, case, module, user)
  - Controllers and Services under backend/src/controllers and backend/src/services encapsulate business logic
  - Sequelize models under backend/src/models map to MySQL tables
  - Redis cache bootstrap in backend/src/redis/manager.js loads item metadata into a Redis hash on connect
  - Realtime chat via Socket.IO in backend/src/socket/chat.js (server is attached in backend/server.js)

Install dependencies

- Backend: from backend/, run: npm install
- Frontend: from frontend/, run: npm install

Common commands (PowerShell)

Local development (without Docker)

- Start backend (requires local MySQL and Redis):
  - From backend/: npm start
  - Server listens on http://localhost:3003
- Start frontend (Create React App dev server):
  - From frontend/: npm start
  - Dev server on http://localhost:3000; frontend calls API at http://localhost:3003/api as configured in src/api/config.js
- Frontend tests (Jest via react-scripts)
  - Watch all tests interactively: npm test
  - Run a single test by name: npm test -- -t "YourTestName"
  - Run a specific test file once (CI mode):
    - $env:CI=1; npm test -- src/path/to/YourComponent.test.tsx
    - To return to normal mode: Remove/clear the CI env var in your shell session
- Frontend linting (ESLint):
  - From frontend/: npm run lint -- src
- Frontend build (production bundle):
  - From frontend/: npm run build

Containerized development and run

- Build and start the full stack (nginx, backend, frontend, Redis, MariaDB):
  - docker-compose up --build
- Access via reverse proxy:
  - Frontend: http://localhost:3009
  - Backend API (proxied): http://localhost:3009/api
- Notes:
  - MariaDB is seeded from ./mysql/case_db.sql on first run (see docker-compose.yml volume mapping)
  - Backend and frontend Dockerfiles live in backend/ and frontend/ respectively; the frontend container builds the CRA app and serves it via nginx inside the image specified by frontend/Dockerfile

Configuration notes

- Backend configuration is selected by NODE_ENV (development or production) in backend/src/config/serverConfig.js. It reads environment variables via dotenv when present.
- Avoid committing or exposing secrets. Email transport credentials are currently hardcoded in backend/src/config/email.js; prefer overriding via environment variables when running locally or in containers.
- The backend process has a CI guard (backend/server.js) that exits immediately when CI is set; do not set CI=true for normal local development runs.
- If you change backend ports or hosts, update frontend/src/api/config.js (SITENAME and API_URL) accordingly.

What to look at first (for quick orientation)

- Frontend API contract: frontend/src/api/fetch.js and frontend/src/api/all/* define how the SPA calls the backend (base URL, headers, token handling)
- Backend endpoints wiring: backend/routes.js shows which feature areas are mounted; corresponding route handlers live under backend/src/routes and controllers under backend/src/controllers
- Data layer: backend/src/models/* (Sequelize) and backend/src/services/* for DB access patterns
- Realtime: backend/src/socket/chat.js and frontend/src/components/chat/* for WebSocket-driven chat

Key ports summary

- Local dev defaults: frontend 3000, backend 3003, MySQL 3306, Redis 6379
- Docker-compose: nginx 3009 (public), backend 3001 (internal and published), frontend 3033 (internal)

README highlights

- Installation per README.md: run npm install inside both backend/ and frontend/
