import dns from 'node:dns';
dns.setServers(['8.8.8.8', '1.1.1.1']);
import 'dotenv/config';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { User, Room, Deal, Booking } from './models/index.js';


await mongoose.connect(process.env.MONGO_URI);
await Promise.all([User, Room, Deal, Booking].map(M => M.deleteMany({})));
const hash = await bcrypt.hash(process.env.SEED_ADMIN_PASSWORD || 'ChangeMe-Demo-123', 12);
const admin = await User.create({ name: 'Demo Admin', email: 'admin@cadence.dev', password: hash, role: 'admin' });
await Room.insertMany([
  { name: 'Foundry', location: 'Floor 2', capacity: 10, facilities: ['projector', 'wifi', 'ac'] },
  { name: 'Phone Booth A', location: 'Floor 1', capacity: 2, facilities: ['wifi'] },
  { name: 'Demo Studio', location: 'Floor 2', capacity: 6, facilities: ['projector', 'wifi', 'ac', 'whiteboard'] },
  { name: 'Town Hall', location: 'Ground', capacity: 30, facilities: ['projector', 'wifi', 'ac'] }
]);
const ago = d => new Date(Date.now() - d * 864e5);
await Deal.insertMany([
  { name: 'Priya Nair', company: 'Lumio Health', value: 12000, stage: 'proposal', lastTouch: ago(6) },
  { name: 'Marcus Webb', company: 'Torque Labs', value: 4800, stage: 'demo', lastTouch: ago(4) },
  { name: 'Aiko Tanaka', company: 'Parcelly', value: 25000, stage: 'contacted', lastTouch: ago(1) },
  { name: 'Sam Ortiz', company: 'Greenloop', value: 3200, stage: 'lead', lastTouch: ago(2) },
  { name: 'Dana Cole', company: 'Northbeam', value: 18000, stage: 'won', lastTouch: ago(9) }
].map(d => ({ ...d, owner: admin._id })));
console.log('Seeded. Login: admin@cadence.dev / (SEED_ADMIN_PASSWORD from .env)');
await mongoose.disconnect();
