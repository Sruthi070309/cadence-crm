import { Router } from 'express';
import { protect, requireRole } from '../middleware/auth.js';
import * as auth from '../controllers/auth.js';
import * as rooms from '../controllers/rooms.js';
import * as bookings from '../controllers/bookings.js';
import * as deals from '../controllers/deals.js';

const r = Router();
const admin = requireRole('admin');

r.post('/auth/register', auth.register);
r.post('/auth/login', auth.login);
r.get('/auth/me', protect, auth.me);

r.get('/rooms', protect, rooms.list);
r.get('/rooms/availability', protect, rooms.availability);   // must stay above any /rooms/:id GET
r.post('/rooms', protect, admin, rooms.create);
r.put('/rooms/:id', protect, admin, rooms.update);

r.post('/bookings', protect, bookings.create);
r.get('/bookings', protect, bookings.list);
r.patch('/bookings/:id/status', protect, bookings.setStatus);

r.get('/deals', protect, deals.list);
r.post('/deals', protect, deals.create);
r.put('/deals/:id', protect, deals.update);
r.post('/deals/:id/touch', protect, deals.touch);

export default r;
