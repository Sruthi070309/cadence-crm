import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User } from '../models/index.js';
import { httpError, wrap } from '../utils.js';

const sign = u => jwt.sign({ sub: u._id }, process.env.JWT_SECRET, { expiresIn: '1d' });
const safe = u => ({ _id: u._id, name: u.name, email: u.email, role: u.role });

export const register = wrap(async (req, res) => {
  const { name, email, password } = req.body;       // role is deliberately NOT read from the body
  if (!name?.trim() || !/^\S+@\S+\.\S+$/.test(email || '')) throw httpError(400, 'A name and a valid email are required');
  if (!password || password.length < 8) throw httpError(400, 'Password must be at least 8 characters');
  if (await User.exists({ email: email.toLowerCase() })) throw httpError(409, 'An account with this email already exists');
  const user = await User.create({ name, email, password: await bcrypt.hash(password, 12), role: 'member' });
  res.status(201).json({ token: sign(user), user: safe(user) });
});

export const login = wrap(async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email: String(email || '').toLowerCase() }).select('+password');
  if (!user || !(await bcrypt.compare(String(password || ''), user.password))) throw httpError(401, 'Incorrect email or password');
  res.json({ token: sign(user), user: safe(user) });
});

export const me = (req, res) => res.json({ user: safe(req.user) });
