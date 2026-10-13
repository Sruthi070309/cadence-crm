export const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;
export const DATE = /^\d{4}-\d{2}-\d{2}$/;
export const mins = t => { const [h, m] = t.split(':'); return h * 60 + +m; };
export const hhmm = n => `${String(Math.floor(n / 60)).padStart(2, '0')}:${String(n % 60).padStart(2, '0')}`;
export const httpError = (status, message, extra = {}) => Object.assign(new Error(message), { status, ...extra });
export const wrap = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
export const escapeRegex = s => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
export const parseList = v => (v ? String(v).split(',').map(s => s.trim().toLowerCase()).filter(Boolean) : []);
export function checkWindow({ date, startTime, endTime }) {
  if (!DATE.test(date || '') || !TIME.test(startTime || '') || !TIME.test(endTime || ''))
    throw httpError(400, 'date (YYYY-MM-DD), startTime and endTime (HH:mm) are required');
  if (mins(endTime) <= mins(startTime)) throw httpError(400, 'End time must be later than start time');
}
