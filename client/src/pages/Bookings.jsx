import { api, useAsync } from '../api.js';

export default function Bookings({ user, notify }) {
  const { data, loading, error, reload } = useAsync(() => api('/bookings'), []);
  const admin = user.role === 'admin';

  async function setStatus(id, status) {
    try { await api(`/bookings/${id}/status`, { method: 'PATCH', body: { status } }); notify(`Booking ${status}`); reload(); }
    catch (e) { notify(e.message, 'bad'); }
  }

  return (
    <>
      <header className="page-head"><div><h1>Bookings</h1><p className="sub">{admin ? 'Confirm or cancel requests from the whole team.' : 'Your requests and their status.'}</p></div></header>
      {loading && <div className="card skel" />}
      {error && <div className="card state bad"><p>{error}</p><button className="btn sm" onClick={reload}>Try again</button></div>}
      {data && data.length === 0 && <div className="card state"><p>No bookings yet. Open a deal and choose Book follow-up to reserve a room.</p></div>}
      {data && data.length > 0 && (
        <div className="list">
          {data.map(b => (
            <article key={b._id} className="card row">
              <div className="when"><b>{b.date}</b><span>{b.startTime}–{b.endTime}</span></div>
              <div className="what"><h3>{b.room?.name}</h3><p>{b.title}{b.deal ? ` · ${b.deal.company}` : ''}{admin ? ` · by ${b.user?.name}` : ''}</p></div>
              <span className={`pill b-${b.status}`}>{b.status}</span>
              <div className="acts">
                {admin && b.status !== 'confirmed' && <button className="btn sm" onClick={() => setStatus(b._id, 'confirmed')}>Confirm</button>}
                {b.status !== 'cancelled' && <button className="btn ghost sm" onClick={() => setStatus(b._id, 'cancelled')}>Cancel</button>}
              </div>
            </article>
          ))}
        </div>
      )}
    </>
  );
}
