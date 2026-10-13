import dns from 'node:dns';
dns.setServers(['8.8.8.8', '1.1.1.1']);
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import routes from './routes/index.js';

const app = express();
app.use(cors({ origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173' }));
app.use(express.json({ limit: '100kb' }));
app.use('/api', routes);
app.use((req, res) => res.status(404).json({ message: 'Route not found' }));
app.use((err, req, res, next) => {
  let status = err.status || 500;
  if (err.name === 'ValidationError' || err.name === 'CastError') status = 400;
  if (err.code === 11000) status = 409;
  if (status === 500) console.error(err);
  res.status(status).json({ message: status === 500 ? 'Server error' : err.message, suggestions: err.suggestions });
});

const port = process.env.PORT || 5000;
mongoose.connect(process.env.MONGO_URI)
  .then(() => app.listen(port, () => console.log(`Cadence API on http://localhost:${port}`)))
  .catch(e => { console.error('MongoDB connection failed:', e.message); process.exit(1); });
