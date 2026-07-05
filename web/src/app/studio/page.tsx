'use client';

import { useEffect, useState } from 'react';
import { useI18n, type DictKey } from '@/lib/i18n';
import { api, getUser } from '@/lib/api';

type Tab = 'bookings' | 'inventory' | 'treasury' | 'ideas' | 'content';

export default function StudioPage() {
  const { t } = useI18n();
  const [tab, setTab] = useState<Tab>('bookings');
  const [allowed, setAllowed] = useState<boolean | null>(null);

  useEffect(() => {
    const u = getUser();
    setAllowed(Boolean(u && u.role !== 'CLIENT'));
  }, []);

  if (allowed === null) return <p className="muted mt">{t('common.loading')}</p>;
  if (!allowed) return <p className="notice info mt">{t('studio.operators_only')}</p>;

  const tabs: Array<{ id: Tab; label: DictKey }> = [
    { id: 'bookings', label: 'studio.tab.bookings' },
    { id: 'inventory', label: 'studio.tab.inventory' },
    { id: 'treasury', label: 'studio.tab.treasury' },
    { id: 'ideas', label: 'studio.tab.ideas' },
    { id: 'content', label: 'studio.tab.content' },
  ];

  return (
    <>
      <h1 className="page-title">{t('studio.title')}</h1>
      <div className="tabs mt">
        {tabs.map(({ id, label }) => (
          <button key={id} className={`tab ${tab === id ? 'active' : ''}`} onClick={() => setTab(id)}>
            {t(label)}
          </button>
        ))}
      </div>
      {tab === 'bookings' && <BookingsTab />}
      {tab === 'inventory' && <InventoryTab />}
      {tab === 'treasury' && <TreasuryTab />}
      {tab === 'ideas' && <IdeasTab />}
      {tab === 'content' && <ContentTab />}
    </>
  );
}

// ---------------------------------------------------------------------------

interface Booking {
  id: string;
  title: string | null;
  startTime: string;
  endTime: string;
  status: string;
  space: { nameHe: string; nameEn: string };
}

function BookingsTab() {
  const { lang, t } = useI18n();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [notice, setNotice] = useState('');
  const locale = lang === 'he' ? 'he-IL' : 'en-US';

  const load = () => api<{ bookings: Booking[] }>('/api/bookings', { lang }).then((d) => setBookings(d.bookings));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => void load(), [lang]);

  const act = async (id: string, action: 'confirm' | 'cancel') => {
    const d = await api<{ message: string; accessCode?: string }>(`/api/bookings/${id}/${action}`, {
      method: 'POST',
      lang,
    });
    setNotice(d.accessCode ? `${d.message} · ${d.accessCode}` : d.message);
    load();
  };

  return (
    <div className="card">
      {notice && <p className="notice ok">{notice}</p>}
      <table className="table">
        <thead>
          <tr>
            <th>{t('studio.when')}</th>
            <th>{t('studio.what')}</th>
            <th>{t('studio.status')}</th>
            <th>{t('studio.actions')}</th>
          </tr>
        </thead>
        <tbody>
          {bookings.map((b) => (
            <tr key={b.id}>
              <td>
                {new Date(b.startTime).toLocaleString(locale, {
                  dateStyle: 'short',
                  timeStyle: 'short',
                  hour12: false,
                  timeZone: 'UTC',
                })}
              </td>
              <td>
                {b.title ?? '—'}
                <div className="muted">{lang === 'he' ? b.space.nameHe : b.space.nameEn}</div>
              </td>
              <td>
                <span className={`badge status-${b.status}`}>{b.status}</span>
              </td>
              <td>
                <span className="row" style={{ gap: 6 }}>
                  {b.status === 'PENDING' && (
                    <button className="btn btn-ok btn-sm" onClick={() => act(b.id, 'confirm')}>
                      {t('studio.confirm')}
                    </button>
                  )}
                  {['PENDING', 'CONFIRMED'].includes(b.status) && (
                    <button className="btn btn-danger btn-sm" onClick={() => act(b.id, 'cancel')}>
                      {t('studio.cancel')}
                    </button>
                  )}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ---------------------------------------------------------------------------

interface InventoryItem {
  id: string;
  itemName: string;
  quantity: number;
  threshold: number;
}

function InventoryTab() {
  const { lang, t } = useI18n();
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [alert, setAlert] = useState('');

  const load = () => api<{ items: InventoryItem[] }>('/api/inventory', { lang }).then((d) => setItems(d.items));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => void load(), [lang]);

  const reportUsage = async (id: string) => {
    const d = await api<{ alert?: string; message: string }>(`/api/inventory/${id}/usage`, {
      method: 'POST',
      body: { amount: 1 },
      lang,
    });
    setAlert(d.alert ?? '');
    load();
  };

  return (
    <div className="card">
      {alert && <p className="notice err">{alert}</p>}
      <table className="table">
        <thead>
          <tr>
            <th>{t('studio.item')}</th>
            <th>{t('studio.qty')}</th>
            <th>{t('studio.threshold')}</th>
            <th>{t('studio.actions')}</th>
          </tr>
        </thead>
        <tbody>
          {items.map((i) => (
            <tr key={i.id}>
              <td>
                {i.itemName}{' '}
                {i.quantity <= i.threshold && <span className="badge high">{t('studio.low_stock')}</span>}
              </td>
              <td>{i.quantity}</td>
              <td>{i.threshold}</td>
              <td>
                <button className="btn btn-ghost btn-sm" onClick={() => reportUsage(i.id)}>
                  −1 · {t('studio.report_usage')}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ---------------------------------------------------------------------------

interface Space {
  id: string;
  name: string;
}

interface TreasuryTx {
  id: string;
  type: string;
  amount: string;
  balanceAfter: string;
  reason: string;
  at: string;
}

function TreasuryTab() {
  const { lang, t } = useI18n();
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [spaceId, setSpaceId] = useState('');
  const [balance, setBalance] = useState('');
  const [log, setLog] = useState<TreasuryTx[]>([]);
  const [type, setType] = useState<'credit' | 'debit'>('credit');
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    api<{ spaces: Space[] }>('/api/spaces', { lang }).then((d) => {
      setSpaces(d.spaces);
      if (d.spaces[0]) setSpaceId((prev) => prev || d.spaces[0].id);
    });
  }, [lang]);

  const load = (id: string) =>
    api<{ treasury: { balance: string; transactionsJson: TreasuryTx[] } }>(`/api/treasury/${id}`, { lang }).then(
      (d) => {
        setBalance(String(d.treasury.balance));
        setLog([...(d.treasury.transactionsJson ?? [])].reverse());
      },
    );

  useEffect(() => {
    if (spaceId) void load(spaceId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spaceId, lang]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await api(`/api/treasury/${spaceId}/transactions`, {
        method: 'POST',
        body: { type, amount: Number(amount), reason },
        lang,
      });
      setAmount('');
      setReason('');
      load(spaceId);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('common.error'));
    }
  };

  return (
    <div className="grid cols-2">
      <div className="card">
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
        <h2 className="section" style={{ marginTop: 6 }}>
          {t('studio.balance')}: ₪{balance}
        </h2>
        <form onSubmit={submit}>
          <div className="field">
            <label>{t('studio.tx_type')}</label>
            <select value={type} onChange={(e) => setType(e.target.value as 'credit' | 'debit')}>
              <option value="credit">{t('studio.tx_credit')}</option>
              <option value="debit">{t('studio.tx_debit')}</option>
            </select>
          </div>
          <div className="field">
            <label>{t('studio.amount')}</label>
            <input type="number" min="0.01" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} required />
          </div>
          <div className="field">
            <label>{t('studio.reason')}</label>
            <input value={reason} onChange={(e) => setReason(e.target.value)} required />
          </div>
          {error && <p className="notice err">{error}</p>}
          <button type="submit" className="btn btn-primary">
            {t('studio.record_tx')}
          </button>
        </form>
      </div>
      <div className="card">
        <h2 className="section" style={{ marginTop: 0 }}>
          {t('studio.audit_log')}
        </h2>
        <table className="table">
          <tbody>
            {log.slice(0, 12).map((tx) => (
              <tr key={tx.id}>
                <td>
                  <span className={`badge ${tx.type === 'credit' ? 'low' : 'high'}`}>
                    {tx.type === 'credit' ? '+' : '−'}₪{tx.amount}
                  </span>
                </td>
                <td>{tx.reason}</td>
                <td className="muted">₪{tx.balanceAfter}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------

interface Idea {
  id: string;
  contentHe: string | null;
  contentEn: string | null;
  status: string;
  votesCount: number;
}

function IdeasTab() {
  const { lang, t } = useI18n();
  const [ideas, setIdeas] = useState<Idea[]>([]);

  const load = () => api<{ ideas: Idea[] }>('/api/ideas', { lang }).then((d) => setIdeas(d.ideas));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => void load(), [lang]);

  const setStatus = async (id: string, status: 'APPROVED' | 'REJECTED') => {
    await api(`/api/ideas/${id}/status`, { method: 'POST', body: { status }, lang });
    load();
  };

  return (
    <div className="grid cols-2">
      {ideas.map((i) => (
        <div key={i.id} className="card idea-card">
          <span className={`badge status-${i.status}`}>{i.status}</span>
          <div>{lang === 'he' ? (i.contentHe ?? i.contentEn) : (i.contentEn ?? i.contentHe)}</div>
          <div className="row">
            <span className="muted">👍 {i.votesCount}</span>
            {i.status === 'PROPOSED' && (
              <>
                <button className="btn btn-ok btn-sm" onClick={() => setStatus(i.id, 'APPROVED')}>
                  {t('studio.approve')}
                </button>
                <button className="btn btn-danger btn-sm" onClick={() => setStatus(i.id, 'REJECTED')}>
                  {t('studio.reject')}
                </button>
              </>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------

interface GeneratedItem {
  id: string;
  type: 'WHATSAPP' | 'FLYER' | 'SOCIAL';
  language: 'HE' | 'EN';
  title: string;
  body: string;
  createdAt: string;
}

function ContentTab() {
  const { lang, t } = useI18n();
  const [kind, setKind] = useState<'whatsapp' | 'flyer' | 'social'>('whatsapp');
  const [contentLang, setContentLang] = useState<'he' | 'en'>('he');
  const [days, setDays] = useState(14);
  const [extra, setExtra] = useState('');
  const [busy, setBusy] = useState(false);
  const [current, setCurrent] = useState<GeneratedItem | null>(null);
  const [history, setHistory] = useState<GeneratedItem[]>([]);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');

  const loadHistory = () =>
    api<{ items: GeneratedItem[] }>('/api/content', { lang }).then((d) => setHistory(d.items));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => void loadHistory(), []);

  const generate = async () => {
    setBusy(true);
    setError('');
    setCurrent(null);
    try {
      const d = await api<{ content: GeneratedItem }>('/api/content/generate', {
        method: 'POST',
        body: { kind, language: contentLang, days, extraInstructions: extra || undefined },
        lang,
      });
      setCurrent(d.content);
      loadHistory();
    } catch (e) {
      setError(e instanceof Error ? e.message : t('common.error'));
    } finally {
      setBusy(false);
    }
  };

  const copy = async () => {
    if (!current) return;
    await navigator.clipboard.writeText(current.body);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const printFlyer = () => {
    if (!current) return;
    const w = window.open('', '_blank');
    if (w) {
      w.document.write(current.body);
      w.document.close();
      w.print();
    }
  };

  return (
    <>
      <p className="page-sub">{t('content.sub')}</p>
      <div className="grid cols-2">
        <div className="card">
          <div className="field">
            <label>{t('content.kind')}</label>
            <select value={kind} onChange={(e) => setKind(e.target.value as typeof kind)}>
              <option value="whatsapp">{t('content.kind.whatsapp')}</option>
              <option value="flyer">{t('content.kind.flyer')}</option>
              <option value="social">{t('content.kind.social')}</option>
            </select>
          </div>
          <div className="field">
            <label>{t('content.language')}</label>
            <select value={contentLang} onChange={(e) => setContentLang(e.target.value as 'he' | 'en')}>
              <option value="he">עברית</option>
              <option value="en">English</option>
            </select>
          </div>
          <div className="field">
            <label>{t('content.days')}</label>
            <input type="number" min={1} max={60} value={days} onChange={(e) => setDays(Number(e.target.value))} />
          </div>
          <div className="field">
            <label>{t('content.extra')}</label>
            <textarea rows={2} value={extra} onChange={(e) => setExtra(e.target.value)} />
          </div>
          {error && <p className="notice err">{error}</p>}
          <button className="btn btn-accent" onClick={generate} disabled={busy}>
            {busy ? t('content.generating') : t('content.generate')}
          </button>
        </div>

        <div className="card">
          {current ? (
            <>
              <div className="row" style={{ justifyContent: 'space-between', marginBottom: 12 }}>
                <strong>{current.title}</strong>
                <span className="row" style={{ gap: 6 }}>
                  {current.type !== 'FLYER' && (
                    <button className="btn btn-ghost btn-sm" onClick={copy}>
                      {copied ? t('content.copied') : t('content.copy')}
                    </button>
                  )}
                  {current.type === 'FLYER' && (
                    <button className="btn btn-ghost btn-sm" onClick={printFlyer}>
                      {t('content.print')} 🖨
                    </button>
                  )}
                </span>
              </div>
              {current.type === 'FLYER' ? (
                <iframe className="flyer-frame" srcDoc={current.body} title={current.title} />
              ) : (
                <div className="content-preview" dir={current.language === 'HE' ? 'rtl' : 'ltr'}>
                  {current.body}
                </div>
              )}
            </>
          ) : (
            <p className="muted">{t('content.title')}</p>
          )}
        </div>
      </div>

      {history.length > 0 && (
        <>
          <h2 className="section">{t('content.history')}</h2>
          <div className="row">
            {history.slice(0, 8).map((h) => (
              <button key={h.id} className="btn btn-ghost btn-sm" onClick={() => setCurrent(h)}>
                {h.title} · {new Date(h.createdAt).toLocaleDateString()}
              </button>
            ))}
          </div>
        </>
      )}
    </>
  );
}
