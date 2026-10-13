import { useState } from 'react';
import { api } from '../api.js';

export default function Auth({ onAuth }) {
  const [mode, setMode] = useState('login');
  const [f, setF] = useState({ name: '', email: '', password: '' });
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const set = k => e => setF({ ...f, [k]: e.target.value });

  async function submit(e) {
    e.preventDefault(); setErr(''); setBusy(true);
    try { onAuth(await api(`/auth/${mode}`, { method: 'POST', body: f })); }
    catch (e2) { setErr(e2.message); }
    finally { setBusy(false); }
  }

  return (
    <div className="auth">
      <section className="auth-pitch">
        <div className="brand big"><span className="pulse" />Cadence</div>
        <h1>No deal without a next step.</h1>
        <p>Most CRMs store what happened. Cadence watches what's <em>not</em> happening: every open deal cools until a meeting is on the calendar, and the room is already held for it.</p>
        <div className="strip" aria-hidden><i style={{ left: '12%' }} /></div>
      </section>
      <form className="card auth-form" onSubmit={submit}>
        <h2>{mode === 'login' ? 'Welcome back' : 'Create your account'}</h2>
        {mode === 'register' && <label>Full name<input value={f.name} onChange={set('name')} autoComplete="name" required /></label>}
        <label>Email<input type="email" value={f.email} onChange={set('email')} autoComplete="email" required /></label>
        <label>Password<input type="password" minLength={mode === 'register' ? 8 : undefined} value={f.password} onChange={set('password')} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} required /></label>
        {err && <p className="msg bad" role="alert">{err}</p>}
        <button className="btn" disabled={busy}>{busy ? 'One moment…' : mode === 'login' ? 'Sign in' : 'Create account'}</button>
        <button type="button" className="link" onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setErr(''); }}>
          {mode === 'login' ? 'New here? Create an account' : 'Have an account? Sign in'}
        </button>
      </form>
    </div>
  );
}
