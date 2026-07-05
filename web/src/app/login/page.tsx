'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { useI18n } from '@/lib/i18n';
import { api, setSession, type SessionUser } from '@/lib/api';

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? '';

interface AuthResponse {
  token: string;
  user: SessionUser;
}

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (cfg: { client_id: string; callback: (r: { credential: string }) => void }) => void;
          renderButton: (el: HTMLElement, cfg: Record<string, unknown>) => void;
        };
      };
    };
  }
}

export default function LoginPage() {
  const { lang, t } = useI18n();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const googleDiv = useRef<HTMLDivElement>(null);

  const finish = (d: AuthResponse) => {
    setSession(d.token, d.user);
    router.push('/');
  };

  // Google Identity Services — rendered only when a client id is configured.
  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) return;
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.onload = () => {
      if (!window.google || !googleDiv.current) return;
      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: async ({ credential }) => {
          try {
            const d = await api<AuthResponse>('/api/auth/google', {
              method: 'POST',
              body: { idToken: credential, languagePref: lang.toUpperCase() },
              lang,
            });
            finish(d);
          } catch (e) {
            setError(e instanceof Error ? e.message : t('common.error'));
          }
        },
      });
      window.google.accounts.id.renderButton(googleDiv.current, {
        theme: 'filled_blue',
        size: 'large',
        width: 320,
        locale: lang === 'he' ? 'iw' : 'en',
      });
    };
    document.body.appendChild(script);
    return () => {
      script.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      const d =
        mode === 'login'
          ? await api<AuthResponse>('/api/auth/login', { method: 'POST', body: { email, password }, lang })
          : await api<AuthResponse>('/api/auth/register', {
              method: 'POST',
              body: { name, email, password, languagePref: lang.toUpperCase() },
              lang,
            });
      finish(d);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('common.error'));
    }
  };

  return (
    <div style={{ maxWidth: 420, margin: '40px auto' }}>
      <h1 className="page-title">{t('login.title')}</h1>

      <div className="card mt">
        {GOOGLE_CLIENT_ID ? (
          <>
            <div ref={googleDiv} style={{ display: 'flex', justifyContent: 'center' }} />
            <p className="muted" style={{ textAlign: 'center', margin: '14px 0' }}>
              — {t('login.or')} —
            </p>
          </>
        ) : (
          <p className="notice info">{t('login.google_hint')}</p>
        )}

        <form onSubmit={submit}>
          {mode === 'register' && (
            <div className="field">
              <label>{t('login.name')}</label>
              <input value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
          )}
          <div className="field">
            <label>{t('login.email')}</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div className="field">
            <label>{t('login.password')}</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} />
          </div>
          {error && <p className="notice err">{error}</p>}
          <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>
            {mode === 'login' ? t('login.submit') : t('login.register')}
          </button>
        </form>

        <p className="muted mt" style={{ textAlign: 'center' }}>
          {t('login.register_title')}{' '}
          <button className="btn btn-ghost btn-sm" onClick={() => setMode(mode === 'login' ? 'register' : 'login')}>
            {mode === 'login' ? t('login.register') : t('login.submit')}
          </button>
        </p>
      </div>
    </div>
  );
}
