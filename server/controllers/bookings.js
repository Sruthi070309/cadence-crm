import { Room, Booking, Deal } from '../models/index.js';
import { checkWindow, mins, hhmm, httpError, wrap } from '../utils.js';

// Overlap rule: existing.start < new.end AND existing.end > new.start  (back-to-back bookings are fine)
export const clash = (room, { date, startTime, endTime }, ignoreId) =>
  Booking.exists({ room, date, status: 'confirmed', startTime: { $lt: endTime }, endTime: { $gt: startTime }, ...(ignoreId && { _id: { $ne: ignoreId } }) });

// Next free slots of the same length on a day (08:00-19:00, 30 min steps). Used when a request conflicts.
export async function findSlots({ date, duration, capacity = 1, facilities = [], limit = 4 }) {
  const rooms = await Room.find({ active: true, capacity: { $gte: capacity }, ...(facilities.length && { facilities: { $all: facilities } }) });
  const taken = await Booking.find({ date, status: 'confirmed', room: { $in: rooms.map(r => r._id) } });
  const out = [];
  for (let s = 8 * 60; s + duration <= 19 * 60 && out.length < limit; s += 30) {
    for (const room of rooms) {
      const busy = taken.some(b => b.room.equals(room._id) && mins(b.startTime) < s + duration && mins(b.endTime) > s);
      if (!busy) { out.push({ room: { _id: room._id, name: room.name }, date, startTime: hhmm(s), endTime: hhmm(s + duration) }); break; }
    }
  }
  return out;
}

export const create = wrap(async (req, res) => {
  const { room, deal, title, date, startTime, endTime } = req.body;
  const attendees = Number(req.body.attendees) || 1;
  checkWindow(req.body);
  if (!room || !title?.trim()) throw httpError(400, 'Room and purpose are required');
  const r = await Room.findOne({ _id: room, active: true });
  if (!r) throw httpError(404, 'Room not found');
  if (attendees > r.capacity) throw httpError(400, `${r.name} fits ${r.capacity} people`);
  const admin = req.user.role === 'admin';
  if (deal && !(await Deal.exists({ _id: deal, ...(!admin && { owner: req.user._id }) }))) throw httpError(404, 'Deal not found');
  if (await clash(r._id, req.body)) {
    const suggestions = await findSlots({ date, duration: mins(endTime) - mins(startTime), capacity: attendees });
    throw httpError(409, `${r.name} is already booked at that time`, { suggestions });
  }
  const b = await Booking.create({ room: r._id, user: req.user._id, deal: deal || undefined, title, date, startTime, endTime, attendees, status: admin ? 'confirmed' : 'pending' });
  res.status(201).json(await b.populate('room', 'name location'));
});

export const list = wrap(async (req, res) => {
  const filter = req.user.role === 'admin' ? {} : { user: req.user._id };
  if (['pending', 'confirmed', 'cancelled'].includes(req.query.status)) filter.status = req.query.status;
  res.json(await Booking.find(filter).sort('date startTime').populate('room', 'name location').populate('user', 'name').populate('deal', 'name company'));
});

export const setStatus = wrap(async (req, res) => {
  const { status } = req.body;
  if (!['pending', 'confirmed', 'cancelled'].includes(status)) throw httpError(400, 'Invalid status');
  const b = await Booking.findById(req.params.id);
  if (!b) throw httpError(404, 'Booking not found');
  const admin = req.user.role === 'admin';
  if (!admin && !(b.user.equals(req.user._id) && status === 'cancelled')) throw httpError(403, 'Only an admin can change this booking');
  if (status === 'confirmed' && (await clash(b.room, b, b._id))) throw httpError(409, 'Cannot confirm: another confirmed booking overlaps this slot');
  b.status = status;
  await b.save();
  res.json(b);
});
