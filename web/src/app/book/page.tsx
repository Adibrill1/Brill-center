'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useI18n } from '@/lib/i18n';
import { api, getUser } from '@/lib/api';

interface Space {
  id: string;
  name: string;
  type: string;
}

interface Slot {
  startTime: string;
  endTime: string;
  demandLevel: 'low' | 'medium' | 'high';
  autoConfirm: boolean;
}

interface BookingResponse {
  message: string;
  accessCode?: string;
  autoConfirmed?: boolean;
}

export default function BookPage() {
  const { lang, t } = useI18n();
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [spaceId, setSpaceId] = useState('');
  const [date, setDate] = useState(() => new Date(Date.now() + 86400000).toISOString().slice(0, 10));
  const [duration, setDuration] = useState(60);
  const [title, setTitle] = useState('');
  const [slots, setSlots] = useState<Slot[] | null>(null);
  const [selected, setSelected] = useState<Slot | null>(null);
  const [result, setResult] = useState<BookingResponse | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const signedIn = typeof window !== 'undefined' && Boolean(getUser());

  useEffect(() => {
    api<{ spaces: Space[] }>('/api/spaces', { lang }).then((d) => {
      setSpaces(d.spaces);
      if (d.spaces[0]) setSpaceId((prev) => prev || d.spaces[0].id);
    });
  }, [lang]);

  const findSlots = async () => {
    setError('');
    setResult(null);
    setSelected(null);
    setSlots(null);
    try {
      const d = await api<{ slots: Slot[] }>(
        `/api/schedule/${spaceId}/suggestions?date=${date}&durationMinutes=${duration}`,
        { lang },
      );
      setSlots(d.slots);
    } catch (e) {
      setError(e instanceof Error ? e.message : t('common.error'));
    }
  };

  const book = async () => {
    if (!selected) return;
    setBusy(true);
    setError('');
    try {
      const d = await api<BookingResponse>('/api/bookings', {
        method: 'POST',
        body: {
          spaceId,
          title: title || undefined,
          startTime: selected.startTime,
          endTime: selected.endTime,
        },
        lang,
      });
      setResult(d);
      setSlots(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : t('common.error'));
    } finally {
      setBusy(false);
    }
  };

  const locale = lang === 'he' ? 'he-IL' : 'en-US';
  const fmtTime = (iso: string) =>
    new Date(iso).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'UTC' });

  return (
    <>
      <h1 className="page-title">{t('book.title')}</h1>
      <p className="page-sub">{t('book.sub')}</p>

      {!signedIn && (
        <p className="notice info">
          {t('book.login_first')} · <Link href="/login" style={{ textDecoration: 'underline' }}>{t('nav.login')}</Link>
        </p>
      )}

      <div className="card">
        <div className="grid cols-3">
          <div className="field">
            <label>{t('book.space')}</label>
            <select value={spaceId} onChange={(e) => setSpaceId(e.target.value)}>
              {spaces.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>{t('book.date')}</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div className="field">
            <label>{t('book.duration')}</label>
            <select value={duration} onChange={(e) => setDuration(Number(e.target.value))}>
              {[60, 90, 120, 180, 240].map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="field">
          <label>{t('book.activity_title')}</label>
          <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} />
        </div>
        <button className="btn btn-primary" onClick={findSlots} disabled={!spaceId}>
          {t('book.find')}
        </button>
      </div>

      {error && <p className="notice err">{error}</p>}

      {slots && (
        <>
          <h2 className="section">{t('book.suggestions')}</h2>
          {slots.length === 0 ? (
            <p className="muted">{t('book.no_slots')}</p>
          ) : (
            <div className="grid cols-2">
              {slots.slice(0, 12).map((s) => (
                <button
                  key={s.startTime}
                  className={`slot ${selected?.startTime === s.startTime ? 'selected' : ''}`}
                  onClick={() => setSelected(s)}
                >
                  <span>
                    {fmtTime(s.startTime)} – {fmtTime(s.endTime)}
                  </span>
                  <span className="row" style={{ gap: 6 }}>
                    {s.autoConfirm && <span className="badge low">{t('book.auto_badge')}</span>}
                    <span className={`badge ${s.demandLevel}`}>{t(`book.demand.${s.demandLevel}`)}</span>
                  </span>
                </button>
              ))}
            </div>
          )}
          {selected && (
            <div className="mt">
              <button className="btn btn-accent" onClick={book} disabled={busy || !signedIn}>
                {t('book.submit')}
              </button>
            </div>
          )}
        </>
      )}

      {result && (
        <div className="card mt">
          <p className="notice ok">{result.message}</p>
          {result.accessCode && (
            <>
              <h2 className="section">{t('book.your_code')}</h2>
              <div className="access-code">{result.accessCode}</div>
              <p className="muted">{t('book.code_hint')}</p>
            </>
          )}
        </div>
      )}
    </>
  );
}
