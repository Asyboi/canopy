# Taskly

A task management REST API built with Node.js, Express, and PostgreSQL.

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Health check |
| GET | `/feed/:userId` | Get personalized task feed for a user |
| POST | `/reports/weekly/:teamId` | Generate weekly CSV report for a team |
| POST | `/auth/login` | Log in and receive JWT tokens |
| POST | `/auth/refresh` | Refresh an access token |
| POST | `/auth/logout` | Invalidate a refresh token |

## Setup

```bash
npm install
export DATABASE_URL=postgresql://localhost:5432/taskly
export JWT_SECRET=your-secret-here
npm run dev
```

## Project Structure

```
src/
├── auth/           — JWT authentication and session management
├── feed/           — Personalized user activity feed
├── notifications/  — Email and push notification delivery
├── reports/        — Weekly CSV report generation
├── db/             — PostgreSQL connection pool
└── server.ts       — Express app entry point
```

## Note for Canopy Demo

This repo intentionally contains three sustainability anti-patterns
for demonstration purposes:

- **Polling** in `src/notifications/index.ts`
- **N+1 queries** in `src/feed/index.ts`
- **Synchronous blocking I/O** in `src/reports/index.ts`
