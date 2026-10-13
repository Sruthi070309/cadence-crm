import { Room, Booking } from '../models/index.js';
import { checkWindow, mins, escapeRegex, parseList, httpError, wrap } from '../utils.js';
import { findSlots } from './bookings.js';

const roomFilter = ({ q, capacity, facilities }) => ({
  active: true,
  ...(capacity > 1 && { capacity: { $gte: capacity } }),
  ...(facilities.length && { facilities: { $all: facilities } }),
  ...(q && { name: new RegExp(escapeRegex(q), 'i') })   // escaped: user input never becomes a raw regex
});
const pick = b => ({ name: b.name, location: b.location, capacity: Number(b.capacity), facilities: parseList(Array.isArray(b.facilities) ? b.facilities.join(',') : b.facilities) });

export const list = wrap(async (req, res) => {
  res.json(await Room.find(roomFilter({ q: req.query.q, capacity: +req.query.minCapacity || 1, facilities: parseList(req.query.facilities) })).sort('name'));
});

export const availability = wrap(async (req, res) => {
  checkWindow(req.query);
  const { date, startTime, endTime, q } = req.query;
  const capacity = +req.query.capacity || 1, facilities = parseList(req.query.facilities);
  const rooms = await Room.find(roomFilter({ q, capacity, facilities })).sort('name');
  const busy = await Booking.find({ date, status: 'confirmed', startTime: { $lt: endTime }, endTime: { $gt: startTime } }).distinct('room');
  const free = rooms.filter(r => !busy.some(id => id.equals(r._id)));
  const suggestions = free.length ? [] : await findSlots({ date, duration: mins(endTime) - mins(startTime), capacity, facilities });
  res.json({ rooms: free, suggestions });
});

export const create = wrap(async (req, res) => {
  const data = pick(req.body);
  if (!data.name?.trim() || !(data.capacity >= 1)) throw httpError(400, 'Room name and capacity (1 or more) are required');
  res.status(201).json(await Room.create(data));
});

export const update = wrap(async (req, res) => {
  const room = await Room.findByIdAndUpdate(req.params.id, pick(req.body), { new: true, runValidators: true });
  if (!room) throw httpError(404, 'Room not found');
  res.json(room);
});
