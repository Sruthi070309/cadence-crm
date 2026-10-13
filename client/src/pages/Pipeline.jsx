import { useEffect, useState } from 'react';
import { api, useAsync } from '../api.js';

const STAGES = ['lead', 'contacted', 'demo', 'proposal', 'won', 'lost'];
const LABEL = { cold: 'Gone cold', due: 'Due soon', warm: 'On track', scheduled: 'Meeting set', won: 'Won', lost: 'Lost' };
const money = n => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n || 0);
const ago = d => (d === 0 ? 'today' : d === 1 ? 'yesterday' : `${d} days ago`);

function Heat({ deal }) {
  const open = ['lead', 'contacted', 'demo', 'proposal'].includes(deal.stage);
  if (!open) return null;
  const pos = deal.state === 'scheduled' ? 4 : Math.min(deal.heat / 1.2, 1) * 100;
  return (
    <div className={`strip s-${deal.state}`} role="img" aria-label={`${LABEL[deal.state]}, last touched ${ago(deal.days)}`}>
      <i style={{ left: `${pos}%` }} />
    </div>
  );
}

function Deal({ deal, onBook, onChanged, notify }) {
  const [noting, setNoting] = useState(false);
  const [note, setNote] = useState('');
  const act = async (fn, msg) => { try { await fn(); notify(msg); onChanged(); } catch (e) { notify(e.message, 'bad'); } };
  const m = deal.nextMeeting;
  return (
    <article className={`card deal d-${deal.state}`}>
      <header>
        <div><h3>{deal.name}</h3><p>{deal.company}</p></div>
        <div className="val">{money(deal.value)}</div>
      </header>
      <Heat deal={deal} />
      <p className="status">
        <b className={`pill p-${deal.state}`}>{LABEL[deal.state]}</b>
        {m ? <span>{m.room} · {m.date} at {m.startTime}{m.status === 'pending' ? ' (awaiting confirmation)' : ''}</span>
          : ['won', 'lost'].includes(deal.stage) ? null : <span>Last touched {ago(deal.days)}. No meeting booked.</span>}
      </p>
      {noting && (
        <form className="inline" onSubmit={e => { e.preventDefault(); act(() => api(`/deals/${deal._id}/touch`, { method: 'POST', body: { note } }), 'Touch logged'); setNoting(false); setNote(''); }}>
          <label className="sr">Note<input autoFocus placeholder="What happened? (optional)" value={note} onChange={e => setNote(e.target.value)} /></label>
          <button className="btn sm">Save touch</button>
        </form>
      )}
      <footer>
        <select aria-label={`Stage for ${deal.name}`} value={deal.stage} onChange={e => act(() => api(`/deals/${deal._id}`, { method: 'PUT', body: { stage: e.target.value } }), 'Stage updated')}>
          {STAGES.map(s => <option key={s}>{s}</option>)}
        </select>
        <button className="btn ghost sm" onClick={() => setNoting(!noting)}>Log touch</button>
        {!['won', 'lost'].includes(deal.stage) && <button className="btn sm" onClick={() => onBook(deal)}>Book follow-up</button>}
      </footer>
    </article>
  );
}

export default function Pipeline({ notify, onBook }) {
  const [q, setQ] = useState('');
  const [term, setTerm] = useState('');
  const [stage, setStage] = useState('');
  const [adding, setAdding] = useState(false);
  const [f, setF] = useState({ name: '', company: '', value: '', stage: 'lead' });
  useEffect(() => { const t = setTimeout(() => setTerm(q.trim()), 250); return () => clearTimeout(t); }, [q]);
  const { data: deals, loading, error, reload } = useAsync(() => api('/deals', { params: { q: term, stage } }), [term, stage]);

  const risky = (deals || []).filter(d => d.state === 'cold' || d.state === 'due');
  const atRisk = risky.reduce((s, d) => s + d.value, 0);

  async function add(e) {
    e.preventDefault();
    try { await api('/deals', { method: 'POST', body: { ...f, value: Number(f.value) || 0 } }); notify('Deal added'); setF({ name: '', company: '', value: '', stage: 'lead' }); setAdding(false); reload(); }
    catch (e2) { notify(e2.message, 'bad'); }
  }

  return (
    <>
      <header className="page-head">
        <div>
          <h1>{loading && !deals ? 'Checking your pipeline…' : risky.length ? `${risky.length} ${risky.length === 1 ? 'deal is' : 'deals are'} cooling` : 'Every deal has a next step'}</h1>
          <p className="sub">{risky.length ? `${money(atRisk)} is at risk. Book a follow-up or log a touch to warm it back up.` : 'Nothing is slipping. Keep it that way.'}</p>
        </div>
        <button className="btn" onClick={() => setAdding(!adding)}>{adding ? 'Close' : 'Add deal'}</button>
      </header>

      {adding && (
        <form className="card add" onSubmit={add}>
          <label>Contact<input value={f.name} onChange={e => setF({ ...f, name: e.target.value })} required /></label>
          <label>Company<input value={f.company} onChange={e => setF({ ...f, company: e.target.value })} required /></label>
          <label>Value (USD)<input type="number" min="0" value={f.value} onChange={e => setF({ ...f, value: e.target.value })} /></label>
          <label>Stage<select value={f.stage} onChange={e => setF({ ...f, stage: e.target.value })}>{STAGES.map(s => <option key={s}>{s}</option>)}</select></label>
          <button className="btn">Save deal</button>
        </form>
      )}

      <div className="toolbar">
        <label className="sr" htmlFor="dq">Search deals</label>
        <input id="dq" className="search" placeholder="Search by contact or company" value={q} onChange={e => setQ(e.target.value)} />
        <div className="chips" role="group" aria-label="Filter by stage">
          {['', ...STAGES].map(s => <button key={s} className={stage === s ? 'chip on' : 'chip'} onClick={() => setStage(s)}>{s || 'all'}</button>)}
        </div>
      </div>

      {loading && !deals && <div className="grid">{[0, 1, 2].map(i => <div key={i} className="card skel" />)}</div>}
      {error && <div className="card state bad"><p>{error}</p><button className="btn sm" onClick={reload}>Try again</button></div>}
      {deals && deals.length === 0 && (
        <div className="card state"><p>{term || stage ? 'No deals match that search. Try a different name or clear the stage filter.' : 'No deals yet. Add your first one and Cadence will start watching it.'}</p></div>
      )}
      {deals && <div className="grid">{deals.map(d => <Deal key={d._id} deal={d} onBook={onBook} onChanged={reload} notify={notify} />)}</div>}
    </>
  );
}
