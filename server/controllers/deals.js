import { Deal, Booking, STAGES } from '../models/index.js';
import { escapeRegex, httpError, wrap } from '../utils.js';

// How many days a deal may sit untouched before it is "cold", per stage.
const CADENCE = { lead: 3, contacted: 4, demo: 5, proposal: 3 };
const ORDER = { cold: 0, due: 1, warm: 2, scheduled: 3, won: 4, lost: 5 };

// The one rule Cadence enforces: every open deal needs a next step.
// A future meeting = "scheduled". No meeting = the deal's heat climbs until someone acts.
function decorate(deal, next) {
  const days = Math.floor((Date.now() - deal.lastTouch) / 864e5);
  const cadence = CADENCE[deal.stage];
  const heat = cadence ? +(days / cadence).toFixed(2) : 0;
  const state = !cadence ? deal.stage : next ? 'scheduled' : heat >= 1 ? 'cold' : heat >= 0.6 ? 'due' : 'warm';
  return { ...deal.toObject(), days, heat, state, nextMeeting: next || null };
}

const body = b => ({ name: b.name, company: b.company, value: b.value, stage: b.stage, notes: b.notes });
const clean = o => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined));
const owned = async req => {
  const d = await Deal.findOne({ _id: req.params.id, ...(req.user.role !== 'admin' && { owner: req.user._id }) });
  if (!d) throw httpError(404, 'Deal not found');
  return d;
};

export const list = wrap(async (req, res) => {
  const { q, stage } = req.query;
  const filter = {
    ...(req.user.role !== 'admin' && { owner: req.user._id }),
    ...(STAGES.includes(stage) && { stage }),
    ...(q && { $or: [{ name: new RegExp(escapeRegex(q), 'i') }, { company: new RegExp(escapeRegex(q), 'i') }] })
  };
  const deals = await Deal.find(filter);
  const today = new Date().toISOString().slice(0, 10);
  const meetings = await Booking.find({ deal: { $in: deals.map(d => d._id) }, status: { $ne: 'cancelled' }, date: { $gte: today } })
    .sort('date startTime').populate('room', 'name');
  const nextBy = {};
  for (const m of meetings) nextBy[m.deal] ??= { date: m.date, startTime: m.startTime, room: m.room?.name, status: m.status };
  res.json(deals.map(d => decorate(d, nextBy[d._id])).sort((a, b) => ORDER[a.state] - ORDER[b.state] || b.heat - a.heat));
});

export const create = wrap(async (req, res) => {
  const data = clean(body(req.body));
  if (!data.name?.trim() || !data.company?.trim()) throw httpError(400, 'Contact name and company are required');
  res.status(201).json(await Deal.create({ ...data, owner: req.user._id }));
});

export const update = wrap(async (req, res) => {
  const d = await owned(req);
  Object.assign(d, clean(body(req.body)));
  await d.save();
  res.json(d);
});

export const touch = wrap(async (req, res) => {
  const d = await owned(req);
  d.lastTouch = new Date();
  if (req.body.note?.trim()) d.notes = `${new Date().toISOString().slice(0, 10)}: ${req.body.note.trim()}\n${d.notes}`.slice(0, 2000);
  await d.save();
  res.json(d);
});
