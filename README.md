# Spieletracker

A game score tracker PWA for card games and board games. Supports generic round-based scoring and Phase 10.

## Tech Stack

- **Frontend:** Nuxt 4, Tailwind CSS, PWA (@vite-pwa/nuxt)
- **Backend:** Fastify 5, TypeScript
- **Database:** PostgreSQL 16
- **Real-time:** WebSockets (@fastify/websocket)
- **Auth:** JWT with HTTP-only cookies

## Quick Start

```bash
# Copy and configure environment
cp backend/.env.example backend/.env
# Set ADMIN_PASSWORD in backend/.env

# Start infrastructure (PostgreSQL + nginx)
npm run dev:infra

# Install dependencies
npm run install:all

# Start development servers
npm run dev
```

**URLs:**
- Frontend: http://localhost:3000
- Backend API: http://localhost:3001
- Via nginx: http://localhost

## Features

- **Generic Game:** Round-based score table with totals
- **Phase 10:** Phase completion grid + score tracking + ranking
- **Real-time:** Live score updates via WebSocket
- **Invite System:** Admin generates app invite links, game creators generate game codes
- **PWA:** Installable, offline-capable
- **Mobile-first:** Optimized for mobile with safe-area support

## Project Structure

```
├── backend/          Fastify API server
├── frontend/         Nuxt 4 app
├── shared/types/     Shared TypeScript types
├── database/         SQL schema & migrations
└── deployment/       Docker, nginx, scripts
```

## Environment Variables

See `backend/.env.example` for all available options. Key variables:

- `DATABASE_URL` - PostgreSQL connection string
- `JWT_SECRET` - Secret for JWT token signing
- `ADMIN_USERNAME` - Initial admin username (default: admin)
- `ADMIN_PASSWORD` - Initial admin password (required for first run)
