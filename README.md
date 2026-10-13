# Cadence: CRM for startups that won't let deals go cold

**The problem it solves:** deals die from silence, not rejection. A normal CRM records the past; nobody notices the deal nobody touched for a week.
Cadence tracks a *heat* score per deal (days since last touch ÷ the stage's allowed gap). A deal only stops cooling when a follow-up meeting is booked,
and booking that meeting reserves a conflict-free room in the same click. Pipeline, calendar and room allocation are one flow.

This project satisfies **Part D (Room Availability & Allocation)** of the Day 5 brief, with rooms/bookings tied to CRM deals.

## Run locally
Needs Node 18+ and MongoDB (local or Atlas).

```bash
# 1. backend  (http://localhost:5000)
cd server && cp .env.example .env     # edit MONGO_URI and JWT_SECRET
npm install && npm run seed && npm run dev

# 2. frontend (http://localhost:5173)
cd client && cp .env.example .env
npm install && npm run dev
```
Demo admin after seeding: `admin@cadence.dev` / the `SEED_ADMIN_PASSWORD` you set in `server/.env`. Anyone registering publicly becomes a `member`.

## Environment variables
| File | Variable | Purpose |
|---|---|---|
| server/.env | `MONGO_URI`, `JWT_SECRET`, `PORT`, `CLIENT_ORIGIN`, `SEED_ADMIN_PASSWORD` | DB, token signing, CORS origin, demo seed |
| client/.env | `VITE_API_URL` | backend base URL |

## API summary (all except auth need `Authorization: Bearer <token>`)
| Method & path | Who | Notes |
|---|---|---|
| POST /api/auth/register, /login · GET /auth/me | public / any | role is forced to `member` on register |
| GET /api/rooms | any | `?q=&minCapacity=&facilities=projector,wifi` |
| GET /api/rooms/availability | any | `?date=YYYY-MM-DD&startTime=HH:mm&endTime=HH:mm&capacity=30`; returns free rooms, or alternative slots if none |
| POST /api/rooms · PUT /api/rooms/:id | admin | 403 for members |
| POST /api/bookings | any | 409 + suggested slots on overlap with a confirmed booking; admin bookings auto-confirm |
| GET /api/bookings | any | admin sees all, members see their own |
| PATCH /api/bookings/:id/status | admin (owner may cancel) | re-checks conflicts before confirming |
| GET/POST /api/deals · PUT /api/deals/:id · POST /api/deals/:id/touch | any (own deals; admin all) | list returns `heat`, `state`, `nextMeeting`, sorted coldest first |

## How it flows
React UI → Express route → `protect` (JWT) → `requireRole` / ownership check → validation → Mongoose → MongoDB → JSON → React state.

## Postman checks for the Part D acceptance list
1. Book Foundry 10:00-11:00 as admin (confirmed). Book it again 10:30-11:30 → **409**.
2. Book Foundry 11:00-12:00 → **201** (back-to-back is allowed).
3. Availability with `capacity=30` → only Town Hall. 4. Member `POST /api/rooms` → **403**. 5. Restart the server; data remains.
