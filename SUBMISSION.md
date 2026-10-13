# Submission: Day 5 Hands-On, Part D (Room Availability & Allocation)

**Project:** Cadence, a CRM for startups with built-in meeting-room allocation
**Stack:** React (Vite) · Node.js + Express · MongoDB (Mongoose) · JWT · bcrypt

## Checklist mapping
| Requirement | Where it is implemented |
|---|---|
| Room list: name, location, capacity, facilities, status | `server/models/index.js` (Room), `GET /api/rooms`, `client/src/pages/Spaces.jsx` |
| Search by name; filter by capacity and facilities | `roomFilter()` in `server/controllers/rooms.js` |
| Availability form (date, start, end, capacity, purpose) | `Spaces.jsx` → `GET /api/rooms/availability` |
| Only rooms that fit capacity and are free are shown | `availability()` in `rooms.js` |
| Create booking with user, room, date, times, purpose | `create()` in `server/controllers/bookings.js` |
| End time must be after start time; required fields | `checkWindow()` in `server/utils.js` |
| Overlapping confirmed bookings rejected (409) | `clash()` in `bookings.js`: existing.start < new.end AND existing.end > new.start |
| Booking outside an existing period is allowed | back-to-back slots (11:00 after 10:00-11:00) return 201 |
| Booking status pending / confirmed / cancelled | Booking model, `Bookings.jsx` |
| Admin adds/edits rooms, confirms/cancels bookings | `requireRole('admin')` in `server/routes/index.js` (403 otherwise) |
| Data persists in MongoDB after restart | Mongoose models; `npm run seed` is only for demo data |
| Clear messages (no room, conflict, success) | `Spaces.jsx` empty state, 409 handler, toasts |

## Flow explained
React UI → Express route → `protect` (verifies JWT, loads user from DB) → `requireRole` / ownership check → validation → Mongoose → MongoDB → JSON response → React state update.

## Custom feature (the "one problem solved")
Deals go cold when nobody follows up. Each deal gets a heat score (days since last touch ÷ stage cadence). Booking a follow-up room moves the deal to "Meeting set". When a requested slot is taken, the API returns the nearest open slots so the user is never stuck.

## Security notes
Passwords hashed (bcrypt, 12 rounds) · role forced to `member` at registration · role re-read from DB on every request · regex input escaped · field whitelisting on create/update · secrets only in `.env` (not included).

## AI usage statement
AI assistance was used to generate the initial code. I reviewed, ran and tested it and can explain every file.
(Edit this paragraph to describe what you changed or learned.)

## Test evidence to attach (screenshots)
1. Postman: `Postman_Collection.json` in this folder, run in order.
2. Browser: sign in, Pipeline, Book follow-up, conflict message with suggested slots, Bookings confirm/cancel as admin.
