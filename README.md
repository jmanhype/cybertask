# CyberTask

Task management web app with project organization, team collaboration, and real-time updates. Built with TypeScript across both frontend and backend.

## Status

Deployed to production. Demo account available.

| Environment | URL | Platform |
|-------------|-----|----------|
| Frontend | https://cybertask.vercel.app | Vercel |
| API | https://cybertask-backend.railway.app/api | Railway |
| API docs | https://cybertask-backend.railway.app/api-docs | Swagger UI |
| Database | PostgreSQL | Railway |

Demo login: `demo@cybertask.com` / `Demo123!`

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, TypeScript, Redux Toolkit, Tailwind CSS, Vite |
| Backend | Node.js, Express, TypeScript, Prisma ORM |
| Database | PostgreSQL 14+ |
| Auth | JWT with refresh tokens |
| Real-time | Socket.io WebSockets |
| Testing | Jest, React Testing Library, MSW, Vitest |

## Project Structure

```
backend/
  src/
    controllers/     # Route handlers
    services/        # Business logic
    middleware/       # Auth, validation
    prisma/          # Schema, migrations, seed
frontend/
  src/
    pages/           # Dashboard, Tasks, Projects, Settings
    components/      # TaskCard, CreateTaskModal, Navbar
    store/slices/    # Redux: auth, task, project, notification
    services/        # API client, auth, task, project services
tests/
  cypress/e2e/       # Auth flow, task management
  performance/       # k6 load tests
```

## Setup

### Requirements

- Node.js 18+
- PostgreSQL 14+
- npm 8+

### Backend

```bash
cd backend
npm install
cp .env.example .env       # Add database credentials
npx prisma migrate dev
npx prisma db seed
npm run dev
```

### Frontend

```bash
cd frontend
npm install
cp .env.example .env       # Default API: http://localhost:3000
npm run dev
```

### Docker

```bash
docker-compose up -d
```

## Environment Variables

### Backend

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET` | Token signing key |
| `JWT_REFRESH_SECRET` | Refresh token signing key |
| `PORT` | Server port (default: 3000) |
| `CORS_ORIGIN` | Allowed origin (default: http://localhost:5173) |

### Frontend

| Variable | Purpose |
|----------|---------|
| `VITE_API_URL` | Backend API URL |
| `VITE_WS_URL` | WebSocket URL |

## Testing

```bash
npm run test              # All tests
npm run test:coverage     # With coverage report
cd backend && npm test    # Backend only
cd frontend && npm test   # Frontend only
```

## Limitations

- No email verification on signup
- WebSocket reconnection handling is basic
- No rate limiting configuration exposed
- The "AI-powered" task suggestions referenced in the original description are not implemented in the current codebase

## License

MIT
