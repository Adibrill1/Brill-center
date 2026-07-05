'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useI18n } from '@/lib/i18n';
import { api } from '@/lib/api';

interface Activity {
  id: string;
  title: string | null;
  spaceName: string;
  startTime: string;
  endTime: string;
}

interface FeedIdea {
  id: string;
  content: string | null;
  votesCount: number;
  spaceName: string | null;
}

export default function HomePage() {
  const { lang, t } = useI18n();
  const [activities, setActivities] = useState<Activity[] | null>(null);
  const [ideas, setIdeas] = useState<FeedIdea[]>([]);

  useEffect(() => {
    api<{ activities: Activity[]; ideas: FeedIdea[] }>('/api/schedule/feed?days=21', { lang })
      .then((d) => {
        setActivities(d.activities);
        setIdeas(d.ideas);
      })
      .catch(() => setActivities([]));
  }, [lang]);

  const locale = lang === 'he' ? 'he-IL' : 'en-US';

  return (
    <>
      <h1 className="page-title">{t('home.title')}</h1>
      <p className="page-sub">{t('home.sub')}</p>

      <div className="row">
        <Link href="/book">
          <button className="btn btn-accent">{t('home.book_cta')} ←</button>
        </Link>
      </div>

      <h2 className="section">{t('home.upcoming')}</h2>
      {activities === null ? (
        <p className="muted">{t('common.loading')}</p>
      ) : activities.length === 0 ? (
        <p className="muted">{t('home.no_activities')}</p>
      ) : (
        <div className="grid">
          {activities.map((a) => {
            const start = new Date(a.startTime);
            return (
              <div key={a.id} className="activity">
                <div className="date-badge">
                  <div className="d">{start.toLocaleDateString(locale, { day: 'numeric', timeZone: 'UTC' })}</div>
                  <div className="m">{start.toLocaleDateString(locale, { month: 'short', timeZone: 'UTC' })}</div>
                </div>
                <div className="info">
                  <div className="t">{a.title ?? '—'}</div>
                  <div className="meta">
                    {a.spaceName} ·{' '}
                    {start.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'UTC' })}
                    –
                    {new Date(a.endTime).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'UTC' })}
                    {' · '}
                    {start.toLocaleDateString(locale, { weekday: 'long', timeZone: 'UTC' })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {ideas.length > 0 && (
        <>
          <h2 className="section">{t('home.approved_ideas')}</h2>
          <div className="grid cols-3">
            {ideas.map((i) => (
              <div key={i.id} className="card idea-card">
                <div>{i.content}</div>
                <div className="muted">
                  👍 {i.votesCount} {t('home.votes')}
                  {i.spaceName ? ` · ${i.spaceName}` : ''}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </>
  );
}
