import { useState } from 'react';
import { api } from '../api.js';

const FACILITIES = ['projector', 'wifi', 'ac', 'whiteboard'];
const today = () => new Date().toISOString().slice(0, 10);

export default function Spaces({ user, notify, draft, clearDraft, onBooked }) {
  const [f, setF] = useState({ date: today(), startTime: '10:00', endTime: '11:00', capacity: 2, q: '', facilities: [], purpose: '' });
  const [res, setRes] = useState(null);       // { rooms, suggestions }
  const [state, setState] = useState({ loading: false, error: '' });
  const [adding, setAdding] = useState(false);
  const [room, setRoom] = useState({ name: '', location: '', capacity: '', facilities: '' });
  const purpose = f.purpose || (draft ? `Follow-up: ${draft.name}, ${draft.company}` : '');
  const set = k => e => setF({ ...f, [k]: e.target.value });
  const toggle = x => setF({ ...f, facilities: f.facilities.includes(x) ? f.facilities.filter(y => y !== x) : [...f.facilities, x] });

  async function search(next = f) {
    setState({ loading: true, error: '' });
    try {
      setRes(await api('/rooms/availability', { params: { date: next.date, startTime: next.startTime, endTime: next.endTime, capacity: next.capacity, q: next.q, facilities: next.facilities } }));
      setState({ loading: false, error: '' });
    } catch (e) { setRes(null); setState({ loading: false, error: e.message }); }
  }

  async function book(r, w = f) {
    try {
      await api('/bookings', { method: 'POST', body: { room: r._id, deal: draft?._id, title: purpose || 'Meeting', date: w.date, startTime: w.startTime, endTime: w.endTime, attendees: Number(f.capacity) || 1 } });
      notify(user.role === 'admin' ? `${r.name} booked and confirmed` : `${r.name} requested. A coordinator will confirm it.`);
      onBooked();
    } catch (e) {
      if (e.status === 409) { setRes({ rooms: [], suggestions: e.data.suggestions || [] }); notify(e.message, 'bad'); }
      else notify(e.message, 'bad');
    }
  }

  const useSlot = s => { const n = { ...f, date: s.date, startTime: s.startTime, endTime: s.endTime }; setF(n); book(s.room, n); };

  async function addRoom(e) {
    e.preventDefault();
    try { await api('/rooms', { method: 'POST', body: { ...room, capacity: Number(room.capacity) } }); notify('Room added'); setRoom({ name: '', location: '', capacity: '', facilities: '' }); setAdding(false); res && search(); }
    catch (e2) { notify(e2.message, 'bad'); }
  }

  return (
    <>
      <header className="page-head">
        <div><h1>Find a room for the follow-up</h1><p className="sub">Only rooms that are free for your exact time show up, so a booking can't collide.</p></div>
        {user.role === 'admin' && <button className="btn ghost" onClick={() => setAdding(!adding)}>{adding ? 'Close' : 'Add room'}</button>}
      </header>

      {draft && <p className="banner">Scheduling for <b>{draft.name}</b> at {draft.company}. <button className="link" onClick={clearDraft}>Clear</button></p>}

      {adding && (
        <form className="card add" onSubmit={addRoom}>
          <label>Name<input value={room.name} onChange={e => setRoom({ ...room, name: e.target.value })} required /></label>
          <label>Location<input value={room.location} onChange={e => setRoom({ ...room, location: e.target.value })} /></label>
          <label>Capacity<input type="number" min="1" value={room.capacity} onChange={e => setRoom({ ...room, capacity: e.target.value })} required /></label>
          <label>Facilities (comma separated)<input value={room.facilities} onChange={e => setRoom({ ...room, facilities: e.target.value })} placeholder="projector, wifi, ac" /></label>
          <button className="btn">Save room</button>
        </form>
      )}

      <form className="card finder" onSubmit={e => { e.preventDefault(); search(); }}>
        <label>Date<input type="date" min={today()} value={f.date} onChange={set('date')} required /></label>
        <label>Starts<input type="time" value={f.startTime} onChange={set('startTime')} required /></label>
        <label>Ends<input type="time" value={f.endTime} onChange={set('endTime')} required /></label>
        <label>People<input type="number" min="1" value={f.capacity} onChange={set('capacity')} /></label>
        <label className="wide">Purpose<input value={purpose} onChange={set('purpose')} placeholder="Demo, contract review, intro call" /></label>
        <label className="wide">Room name<input value={f.q} onChange={set('q')} placeholder="Optional: search by name" /></label>
        <div className="chips wide" role="group" aria-label="Facilities">
          {FACILITIES.map(x => <button type="button" key={x} className={f.facilities.includes(x) ? 'chip on' : 'chip'} onClick={() => toggle(x)}>{x}</button>)}
        </div>
        <button className="btn">{state.loading ? 'Checking…' : 'Find available rooms'}</button>
      </form>

      {state.error && <div className="card state bad"><p>{state.error}</p></div>}
      {res && res.rooms.length > 0 && (
        <div className="grid">
          {res.rooms.map(r => (
            <article key={r._id} className="card room">
              <h3>{r.name}</h3>
              <p>{r.location || 'No location set'} · seats {r.capacity}</p>
              <p className="tags">{r.facilities.map(x => <span key={x}>{x}</span>)}</p>
              <button className="btn sm" onClick={() => book(r)}>{user.role === 'admin' ? 'Book now' : 'Request this room'}</button>
            </article>
          ))}
        </div>
      )}
      {res && res.rooms.length === 0 && (
        <div className="card state">
          <p>No room is free for {f.startTime}–{f.endTime} on {f.date}.{res.suggestions.length ? ' These slots are open on the same day:' : ' Try another day or fewer facilities.'}</p>
          <div className="chips">{res.suggestions.map((s, i) => <button key={i} className="chip" onClick={() => useSlot(s)}>{s.room.name} · {s.startTime}–{s.endTime}</button>)}</div>
        </div>
      )}
    </>
  );
}
