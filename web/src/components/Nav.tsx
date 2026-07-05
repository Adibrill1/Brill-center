'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useI18n } from '@/lib/i18n';
import { clearSession, getUser, type SessionUser } from '@/lib/api';

export function Nav() {
  const { lang, setLang, t } = useI18n();
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<SessionUser | null>(null);

  useEffect(() => {
    setUser(getUser());
  }, [pathname]);

  const links = [
    { href: '/', label: t('nav.home') },
    { href: '/book', label: t('nav.book') },
    { href: '/ideas', label: t('nav.ideas') },
    ...(user && user.role !== 'CLIENT' ? [{ href: '/studio', label: t('nav.studio') }] : []),
  ];

  return (
    <nav className="nav">
      <div className="nav-inner">
        <Link href="/" className="logo">
          ✦ Brill Center
        </Link>
        {links.map((l) => (
          <Link key={l.href} href={l.href} className={`link ${pathname === l.href ? 'active' : ''}`}>
            {l.label}
          </Link>
        ))}
        <span className="spacer" />
        <button className="pill" onClick={() => setLang(lang === 'he' ? 'en' : 'he')}>
          {lang === 'he' ? 'EN' : 'עב'}
        </button>
        {user ? (
          <button
            className="pill"
            onClick={() => {
              clearSession();
              setUser(null);
              router.push('/');
            }}
          >
            {t('common.hello')}, {user.name.split(' ')[0]} · {t('nav.logout')}
          </button>
        ) : (
          <Link href="/login" className="pill">
            {t('nav.login')}
          </Link>
        )}
      </div>
    </nav>
  );
}
