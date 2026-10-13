import mongoose from 'mongoose';
const { Schema, model } = mongoose;
const ref = name => ({ type: Schema.Types.ObjectId, ref: name });

export const User = model('User', new Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true, select: false },
  role: { type: String, enum: ['member', 'admin'], default: 'member' }
}, { timestamps: true }));

export const Room = model('Room', new Schema({
  name: { type: String, required: true, unique: true, trim: true },
  location: { type: String, default: '' },
  capacity: { type: Number, required: true, min: 1 },
  facilities: [{ type: String, lowercase: true, trim: true }],
  active: { type: Boolean, default: true }
}, { timestamps: true }));

export const STAGES = ['lead', 'contacted', 'demo', 'proposal', 'won', 'lost'];
export const Deal = model('Deal', new Schema({
  name: { type: String, required: true, trim: true },
  company: { type: String, required: true, trim: true },
  value: { type: Number, default: 0, min: 0 },
  stage: { type: String, enum: STAGES, default: 'lead' },
  lastTouch: { type: Date, default: Date.now },
  notes: { type: String, default: '' },
  owner: { ...ref('User'), required: true }
}, { timestamps: true }));

const booking = new Schema({
  room: { ...ref('Room'), required: true },
  user: { ...ref('User'), required: true },
  deal: ref('Deal'),
  title: { type: String, required: true, trim: true },
  date: { type: String, required: true },       // YYYY-MM-DD
  startTime: { type: String, required: true },  // HH:mm (zero-padded, so string compare is safe)
  endTime: { type: String, required: true },
  attendees: { type: Number, default: 1, min: 1 },
  status: { type: String, enum: ['pending', 'confirmed', 'cancelled'], default: 'pending' }
}, { timestamps: true });
booking.index({ room: 1, date: 1, status: 1 });
export const Booking = model('Booking', booking);
