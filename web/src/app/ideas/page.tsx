'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useI18n } from '@/lib/i18n';
import { api, getUser } from '@/lib/api';

interface Idea {
  id: string;
  contentHe: string | null;
  contentEn: string | null;
  status: 'PROPOSED' | 'APPROVED' | 'REJECTED';
  votesCount: number;
  user?: { name: string };
}

export default function IdeasPage() {
  const { lang, t } = useI18n();
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [text, setText] = useState('');
  const [error, setError] = useState('');
  const signedIn = typeof window !== 'undefined' && Boolean(getUser());

  const load = () => {
    if (!signedIn) return;
    api<{ ideas: Idea[] }>('/api/ideas', { lang }).then((d) => setIdeas(d.ideas)).catch(() => {});
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(load, [lang, signedIn]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      const hebrew = /[֐-׿]/.test(text);
      await api('/api/ideas', {
        method: 'POST',
        body: hebrew ? { contentHe: text } : { contentEn: text },
        lang,
      });
      setText('');
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('common.error'));
    }
  };

  const vote = async (id: string) => {
    try {
      await api(`/api/ideas/${id}/vote`, { method: 'POST', lang });
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('common.error'));
    }
  };

  return (
    <>
      <h1 className="page-title">{t('ideas.title')}</h1>
      <p className="page-sub">{t('ideas.sub')}</p>

      {!signedIn ? (
        <p className="notice info">
          {t('ideas.login_first')} · <Link href="/login" style={{ textDecoration: 'underline' }}>{t('nav.login')}</Link>
        </p>
      ) : (
        <div className="card">
          <form onSubmit={submit}>
            <div className="field">
              <label>{t('ideas.propose')}</label>
              <textarea
                rows={3}
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder={t('ideas.placeholder')}
                required
              />
            </div>
            <button type="submit" className="btn btn-primary">
              {t('ideas.submit')}
            </button>
          </form>
        </div>
      )}

      {error && <p className="notice err">{error}</p>}

      <div className="grid cols-2 mt">
        {ideas.map((i) => (
          <div key={i.id} className="card idea-card">
            <span className={`badge status-${i.status}`}>{i.status}</span>
            <div style={{ fontSize: 16 }}>
              {lang === 'he' ? (i.contentHe ?? i.contentEn) : (i.contentEn ?? i.contentHe)}
            </div>
            <div className="votes">
              <button className="vote-btn" onClick={() => vote(i.id)} disabled={!signedIn}>
                👍 {i.votesCount}
              </button>
              <span className="muted">{i.user?.name}</span>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
