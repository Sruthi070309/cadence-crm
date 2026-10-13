import { useEffect, useState, useCallback } from 'react';
import { api, tokenStore } from './api.js';
import Auth from './pages/Auth.jsx';
import Pipeline from './pages/Pipeline.jsx';
import Spaces from './pages/Spaces.jsx';
import Bookings from './pages/Bookings.jsx';

const TABS = [['pipeline', 'Pipeline'], ['spaces', 'Meeting spaces'], ['bookings', 'Bookings']];

export default function App() {
  const [user, setUser] = useState(null);
  const [booting, setBooting] = useState(!!tokenStore.get());
  const [tab, setTab] = useState('pipeline');
  const [draft, setDraft] = useState(null);   // deal being scheduled: carries context from Pipeline -> Spaces
  const [toast, setToast] = useState(null);

  useEffect(() => {
    if (!tokenStore.get()) return;
    api('/auth/me').then(r => setUser(r.user)).catch(() => tokenStore.clear()).finally(() => setBooting(false));
  }, []);

  const notify = useCallback((text, kind = 'ok') => {
    setToast({ text, kind });
    setTimeout(() => setToast(null), 3500);
  }, []);
  const logout = () => { tokenStore.clear(); setUser(null); setTab('pipeline'); };
  const bookFor = deal => { setDraft(deal); setTab('spaces'); };

  if (booting) return <div className="boot">Loading…</div>;
  if (!user) return <Auth onAuth={({ token, user }) => { tokenStore.set(token); setUser(user); }} />;

  return (
    <div className="shell">
      <aside className="rail">
        <div className="brand"><span className="pulse" />Cadence</div>
        <nav aria-label="Main">
          {TABS.map(([id, label]) => (
            <button key={id} className={tab === id ? 'nav on' : 'nav'} onClick={() => setTab(id)} aria-current={tab === id ? 'page' : undefined}>{label}</button>
          ))}
        </nav>
        <div className="me">
          <b>{user.name}</b>
          <span>{user.role === 'admin' ? 'Admin · coordinator' : 'Team member'}</span>
          <button className="link" onClick={logout}>Sign out</button>
        </div>
      </aside>
      <main className="main">
        {tab === 'pipeline' && <Pipeline notify={notify} onBook={bookFor} />}
        {tab === 'spaces' && <Spaces user={user} notify={notify} draft={draft} clearDraft={() => setDraft(null)} onBooked={() => { setDraft(null); setTab('bookings'); }} />}
        {tab === 'bookings' && <Bookings user={user} notify={notify} />}
      </main>
      {toast && <div className={`toast ${toast.kind}`} role="status">{toast.text}</div>}
    </div>
  );
}
