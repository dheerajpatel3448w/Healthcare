# 🚀 Nginx Setup — Smart Healthcare Project

## Architecture Overview

All traffic enters through **Nginx on port 80**. Nginx routes each request to the correct microservice based on the URL prefix.

```
Browser / App
     │
     ▼
  Nginx :80
     │
     ├─ /api/auth/*         → auth-service:4001
     ├─ /api/user/*         → user-service:4002
     ├─ /api/doctor/*       → doctor-service:4003
     ├─ /api/appointment/*  → appointment-service:4004
     ├─ /api/habit/*        → habit-service:4005
     ├─ /api/ai/*           → ai-service:4006  (+ WebSocket)
     ├─ /socket.io/*        → ai-service:4006  (Socket.IO)
     └─ /                   → frontend:3000    (Next.js)
```

---

## ✅ Verified Routes (from source code audit)

### Auth Service — port `4001`
| Method | Nginx URL | Internal Path | Auth |
|--------|-----------|---------------|------|
| POST | `/api/auth/auth/register` | `/auth/register` | Public |
| POST | `/api/auth/auth/login` | `/auth/login` | Public |
| POST | `/api/auth/auth/logout` | `/auth/logout` | Public |
| GET  | `/api/auth/auth/me` | `/auth/me` | Protected |

> **Note:** The double `/auth/auth/` is because the service mounts its router at `/auth` internally. To fix this (optional), rename the internal prefix to `/` in `auth-service/src/app.ts`.

---

### User Service — port `4002`
| Method | Nginx URL | Internal Path | Auth |
|--------|-----------|---------------|------|
| POST   | `/api/user/profile/create` | `/profile/create` | Protected |
| GET    | `/api/user/profile/getprofile` | `/profile/getprofile` | Protected |
| PUT    | `/api/user/profile/updateprofile` | `/profile/updateprofile` | Protected |
| DELETE | `/api/user/profile/deleteprofile` | `/profile/deleteprofile` | Protected |
| GET    | `/api/user/profile/:id` | `/profile/:id` | Protected |

---

### Doctor Service — port `4003`
| Method | Nginx URL | Internal Path | Auth |
|--------|-----------|---------------|------|
| GET    | `/api/doctor/doctor/all` | `/doctor/all` | Public |
| POST   | `/api/doctor/doctor/create` | `/doctor/create` | Protected |
| GET    | `/api/doctor/doctor/getprofile` | `/doctor/getprofile` | Protected |
| PUT    | `/api/doctor/doctor/updateprofile` | `/doctor/updateprofile` | Protected |
| DELETE | `/api/doctor/doctor/deleteprofile` | `/doctor/deleteprofile` | Protected |
| GET    | `/api/doctor/doctor/:id` | `/doctor/:id` | Public |

---

### Appointment Service — port `4004`
| Method | Nginx URL | Internal Path | Auth |
|--------|-----------|---------------|------|
| POST   | `/api/appointment/api/v1/appointments/create` | `/api/v1/appointments/create` | Protected |
| GET    | `/api/appointment/api/v1/appointments/my-appointments` | `/api/v1/appointments/my-appointments` | Protected |
| GET    | `/api/appointment/api/v1/appointments/doctor/:doctorId` | `/api/v1/appointments/doctor/:doctorId` | Protected |
| PATCH  | `/api/appointment/api/v1/appointments/:id/status` | `/api/v1/appointments/:id/status` | Protected |
| PATCH  | `/api/appointment/api/v1/appointments/:id/cancel` | `/api/v1/appointments/:id/cancel` | Protected |
| POST   | `/api/appointment/api/v1/appointments/:id/reschedule` | `/api/v1/appointments/:id/reschedule` | Protected |
| GET    | `/api/appointment/api/v1/appointments/doctor/:id/booked-slots` | `/api/v1/appointments/doctor/:id/booked-slots` | Protected |
| GET    | `/api/appointment/api/v1/appointments/:id` | `/api/v1/appointments/:id` | Protected |

---

### Habit Tracker Service — port `4005`
| Method | Nginx URL | Internal Path | Auth |
|--------|-----------|---------------|------|
| GET    | `/api/habit/health` | `/health` | Public |
| GET    | `/api/habit/api/v1/habits/goals` | `/api/v1/habits/goals` | Protected |
| POST   | `/api/habit/api/v1/habits/goals` | `/api/v1/habits/goals` | Protected |
| POST   | `/api/habit/api/v1/habits/log` | `/api/v1/habits/log` | Protected |
| GET    | `/api/habit/api/v1/habits/today` | `/api/v1/habits/today` | Protected |
| GET    | `/api/habit/api/v1/habits/streak` | `/api/v1/habits/streak` | Protected |
| GET    | `/api/habit/api/v1/habits/trends` | `/api/v1/habits/trends` | Protected |
| GET    | `/api/habit/api/v1/habits/tip` | `/api/v1/habits/tip` | Protected |

---

### AI Service — port `4006` (also serves Socket.IO)
| Method | Nginx URL | Internal Path | Auth |
|--------|-----------|---------------|------|
| POST   | `/api/ai/images/upload` | `/images/upload` | Protected |
| GET    | `/api/ai/images/job-status/:jobId` | `/images/job-status/:jobId` | Protected |
| GET    | `/api/ai/images/reports` | `/images/reports` | Protected |
| GET    | `/api/ai/analysis/` | `/analysis/` | Protected |
| POST   | `/api/ai/analysis/reports` | `/analysis/reports` | Protected |
| GET    | `/api/ai/analysis/history` | `/analysis/history` | Protected |
| POST   | `/api/ai/ai/chat` | `/ai/chat` | Protected |
| GET    | `/api/ai/ai/history` | `/ai/history` | Protected |
| POST   | `/api/ai/doctor-ai/chat` | `/doctor-ai/chat` | Protected |
| GET    | `/api/ai/doctor-ai/history` | `/doctor-ai/history` | Protected |
| WS     | `/socket.io/*` | `/socket.io/*` | — |

> [!IMPORTANT]
> The AI service uses **Socket.IO** for real-time features. Nginx has a dedicated `/socket.io/` location block with WebSocket `Upgrade` headers so the handshake works correctly.

---

## Port Map

| Service | Container Port | Nginx Prefix |
|---------|---------------|--------------|
| auth-service | 4001 | `/api/auth/` |
| user-service | 4002 | `/api/user/` |
| doctor-service | 4003 | `/api/doctor/` |
| appointment-service | 4004 | `/api/appointment/` |
| habit-service | 4005 | `/api/habit/` |
| ai-service | 4006 | `/api/ai/` + `/socket.io/` |
| frontend (Next.js) | 3000 | `/` |

---

## Files Created

```
minor project/
├── nginx/
│   ├── nginx.conf        ✅ created
│   └── Dockerfile        ✅ created
└── docker-compose.yml    ✅ created
```

---

## How to Run

```powershell
# From project root (minor project/)
docker compose up --build

# Detached mode (background)
docker compose up --build -d

# View Nginx logs
docker compose logs -f nginx

# View all logs
docker compose logs -f

# Stop everything
docker compose down
```

---

## Quick Verification Tests

```powershell
# Nginx health
curl http://localhost/nginx-health

# Auth — register
curl -X POST http://localhost/api/auth/auth/register `
  -H "Content-Type: application/json" `
  -d '{"email":"test@test.com","password":"Test1234!"}'

# Doctor list (public)
curl http://localhost/api/doctor/doctor/all

# AI service health (via Nginx)
curl http://localhost/api/ai/images/reports
```

---

## ⚠️ Known Double-Prefix Issue

Because each service mounts its own prefix internally:
- Auth: `app.use("/auth", router)` → `/auth/register`
- User: `app.use("/profile", router)` → `/profile/create`
- Doctor: `app.use("/doctor", doctorRoutes)` → `/doctor/all`

When Nginx strips `/api/auth/` and passes `/` to the service, the service then adds its own prefix back. This creates paths like `/api/auth/auth/register`.

**Fix (optional):** Update your frontend API calls to include the double prefix, OR rename the internal service prefixes to `/` in each `app.ts`.

---

## CORS Fix

Since everything goes through Nginx on port 80, update `FRONTEND_URL` in each service to:
```
FRONTEND_URL=http://localhost
```
This is already handled by the `environment:` override in `docker-compose.yml`.
