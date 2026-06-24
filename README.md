# Nuxt + Fastify Starter Template

A full-stack starter template with **Nuxt 4** (frontend), **Fastify** (backend), **PostgreSQL** (database), and a complete deployment stack. Ready to clone and build your next project.

## What's Included

### Backend (Fastify)

- **Plugin architecture** — modular Fastify plugins for DB, auth, WebSocket, push notifications, and unified notifications
- **JWT authentication** — access + refresh token flow with cookie-based transport
- **WebSocket pubsub** — channel-based real-time messaging with auto-reconnect
- **Push notifications** — Web Push via VAPID with automatic subscription cleanup
- **Unified notify service** — online users get WebSocket toasts, offline users get push notifications
- **PostgreSQL** with migration runner (SQL + optional JS migrations)
- **Rate limiting**, CORS, multipart uploads, static file serving

### Frontend (Nuxt 4)

- **Theming system** — 4 built-in templates (Light, Modern/Glass, Dark, Modern Dark) with CSS custom properties
- **Auth composable** — login, register, logout, auto-refresh with SSR support
- **WebSocket composable** — auto-connect, channel subscriptions, event handlers, reconnect with backoff
- **Push notifications composable** — permission management, service worker registration, VAPID subscription
- **Toast system** — non-blocking notification toasts with transitions
- **PWA ready** — service worker, push support, offline-capable
- **Tailwind CSS** — themed utility classes (`t-surface`, `t-text`, `btn-primary`, etc.)

### Infrastructure

- **Docker Compose** — dev (Postgres + nginx) and prod (full stack with SSL)
- **Nginx configs** — dev proxy + production HTTPS with gzip, rate limiting, security headers
- **Deploy scripts** — one-command deploy, database backup/restore, SSL initialization
- **Multi-stage Dockerfiles** — optimized builds for both frontend and backend

## Prerequisites

- **Node.js** 20+
- **Docker** & Docker Compose
- **npm** (comes with Node.js)

## Quick Start

```bash
# 1. Copy the template
cp -r nuxt-fastify-template my-project
cd my-project

# 2. Configure environment
cp backend/.env.example backend/.env
# Edit backend/.env — set JWT_SECRET at minimum

# 3. Start database & nginx
npm run dev:infra

# 4. Install dependencies
npm run install:all

# 5. Start development servers
npm run dev
```

The app will be available at:
- **Frontend:** http://localhost:3000
- **Backend API:** http://localhost:3001
- **Via nginx proxy:** http://localhost (port 80)

## Project Structure

```
├── package.json                    # Root: dev scripts with concurrently
├── backend/
│   ├── src/
│   │   ├── index.ts                # Fastify entry point
│   │   ├── plugins/                # db, auth, ws, push, notify
│   │   ├── adapters/               # AuthAdapter interface + JWT implementation
│   │   ├── middleware/             # requireAuth, requireRole guards
│   │   └── routes/                 # auth, health, push
│   ├── package.json
│   ├── Dockerfile
│   └── .env.example
├── frontend/
│   ├── app/
│   │   ├── app.vue                 # Root component with theme vars
│   │   ├── assets/css/main.css     # Tailwind + themed utilities
│   │   ├── layouts/default.vue     # Header + nav
│   │   ├── pages/                  # index, login, register
│   │   ├── composables/            # useAuth, useWebSocket, usePush, useTheme, useToast, useDomain
│   │   ├── plugins/                # ws.client, auth-refresh.client
│   │   ├── middleware/             # auth guard
│   │   ├── utils/templates.ts      # Theme definitions + color utilities
│   │   └── components/             # ToastContainer, PushOptIn, WsStatus
│   ├── public/sw-push.js           # Push notification service worker
│   ├── nuxt.config.ts
│   ├── package.json
│   └── Dockerfile
├── shared/
│   └── types/                      # TypeScript types shared between FE & BE
├── database/
│   ├── init.sql                    # Initial schema
│   ├── migrations/                 # SQL (+ optional JS) migrations
│   └── seeds/                      # Seed data
└── deployment/
    ├── docker-compose.yml          # Dev infrastructure
    ├── docker-compose.prod.yml     # Production stack
    ├── nginx/                      # Dev + prod nginx configs
    ├── scripts/                    # deploy, backup, ssl
    └── .env.example                # Production env template
```

## Adding New Features

### Backend Route

1. Create `backend/src/routes/my-feature.ts`:

```typescript
import type { FastifyInstance } from 'fastify'
import { requireAuth } from '../middleware/guards.js'

export async function myFeatureRoutes(app: FastifyInstance) {
  app.get('/my-feature', { preHandler: [requireAuth] }, async (request) => {
    const userId = request.authUser!.userId
    const result = await app.db.query('SELECT * FROM my_table WHERE user_id = $1', [userId])
    return { data: result.rows }
  })
}
```

2. Register in `backend/src/index.ts`:

```typescript
import { myFeatureRoutes } from './routes/my-feature.js'
// ...
await app.register(myFeatureRoutes, { prefix: '/api/v1' })
```

### Frontend Page

Create `frontend/app/pages/my-page.vue` — Nuxt auto-registers it as a route:

```vue
<template>
  <div class="t-surface border t-border rounded-2xl p-6">
    <h1 class="text-2xl font-bold t-text">My Page</h1>
    <p class="t-text-muted mt-2">Content here</p>
    <button class="btn-primary mt-4" @click="doSomething">Action</button>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ middleware: ['auth'] })
// your logic...
</script>
```

### Database Migration

1. Create `database/migrations/001_create_my_table.sql`:

```sql
CREATE TABLE my_table (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

2. Migrations run automatically on backend startup, ordered by filename.

3. For data transformations, add a matching JS file (`001_create_my_table.js`) that exports a default async function:

```javascript
export default async function(pool) {
  await pool.query("UPDATE my_table SET name = 'default' WHERE name IS NULL")
}
```

## Theming

The template includes 4 built-in themes controlled by CSS custom properties:

| Theme | ID | Glass Effect |
|---|---|---|
| Light | `light` | No |
| Modern | `modern` | Yes (blur + translucent) |
| Dark | `dark` | No |
| Modern Dark | `modern-dark` | Yes (blur + translucent) |

### Switching Themes

```typescript
const { setTemplate, setColors } = useTheme()

setTemplate('modern')
setColors('#6366F1', '#06B6D4', '#F0F4FF')
```

### Themed CSS Classes

| Class | Purpose |
|---|---|
| `t-surface` | Background surface color |
| `t-surface-alt` | Alternate surface |
| `t-border` | Border color |
| `t-text` | Primary text |
| `t-text-muted` | Muted text |
| `t-primary` | Primary accent color |
| `t-primary-soft` | Soft primary background |
| `btn-primary` | Primary action button |
| `btn-secondary` | Secondary action button |
| `btn-danger` | Destructive action button |
| `field-input` | Form input field |

## Push Notifications

### Generate VAPID Keys

```bash
cd backend
npx web-push generate-vapid-keys
```

Copy the keys to `backend/.env`:

```env
VAPID_PUBLIC_KEY=BPxyz...
VAPID_PRIVATE_KEY=abc123...
VAPID_SUBJECT=mailto:admin@your-domain.com
```

### Sending Notifications

From any backend route with access to `app`:

```typescript
// Single user — WS toast if online, push if offline
await app.notify.notifyUser(userId, 'Title', 'Body', { type: 'my_event', url: '/some-page' })

// Multiple users
await app.notify.notifyUsers(userIds, 'Title', 'Body', { type: 'my_event' })

// Push only (bypasses WS check)
await app.push.sendToUser(userId, 'Title', 'Body', { url: '/some-page' })
```

### Deep Linking

The service worker (`sw-push.js`) reads `data.url` from the notification payload and opens it on click. Pass a `url` field in your notification data:

```typescript
await app.notify.notifyUser(userId, 'New message', 'You have a new message', {
  type: 'message',
  url: '/messages/123'
})
```

## Production Deployment

### First-Time Setup

```bash
cd deployment

# 1. Configure environment
cp .env.example .env
# Edit .env — set all values, especially:
#   POSTGRES_PASSWORD, JWT_SECRET, VAPID keys, APP_DOMAIN

# 2. Search and replace YOUR_DOMAIN in:
#   - deployment/nginx/nginx.prod.conf
#   - deployment/nginx/nginx.dev.conf
#   - deployment/docker-compose.prod.yml
#   - backend/src/index.ts (CORS origin)

# 3. Deploy
./scripts/deploy.sh
```

### SSL Setup

```bash
# Option 1: HTTP challenge (single domain)
./scripts/ssl-init.sh your-domain.com admin@your-domain.com

# Option 2: DNS challenge (wildcard)
# Follow the instructions printed by ssl-init.sh
```

### Database Backups

```bash
# Manual backup
./scripts/backup-db.sh

# Restore from backup
./scripts/backup-db.sh --restore backups/app_20250101_020000.sql.gz

# Automated daily backup (crontab)
0 2 * * * /path/to/deployment/scripts/backup-db.sh >> /var/log/db-backup.log 2>&1
```

### Updates

```bash
cd deployment
git pull
./scripts/deploy.sh
```

## Checklist: New Project Setup

- [ ] Copy template folder and rename
- [ ] Search for `YOUR_DOMAIN` and replace with your domain everywhere
- [ ] Update `APP_NAME` in `.env` files
- [ ] Update CORS origins in `backend/src/index.ts`
- [ ] Generate and set `JWT_SECRET`
- [ ] Generate and set VAPID keys
- [ ] Set Postgres credentials
- [ ] Add your app icon to `frontend/public/icons/`
- [ ] Create a `manifest.json` in `frontend/public/` for PWA
- [ ] Customize the default layout and theme
- [ ] Add your first database migration and backend route
