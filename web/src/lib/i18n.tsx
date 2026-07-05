'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

export type Lang = 'he' | 'en';

/** Every UI string lives here — Hebrew and English, no hardcoded text. */
const dict = {
  'nav.home': { he: 'בית', en: 'Home' },
  'nav.book': { he: 'הזמנת מרחב', en: 'Book a space' },
  'nav.ideas': { he: 'גלריית רעיונות', en: 'Idea Gallery' },
  'nav.studio': { he: 'סטודיו בריל', en: 'Brill Studio' },
  'nav.login': { he: 'התחברות', en: 'Sign in' },
  'nav.logout': { he: 'התנתקות', en: 'Sign out' },

  'home.title': { he: 'ברוכים הבאים למרכז בריל', en: 'Welcome to Brill Center' },
  'home.sub': {
    he: 'מרחבים קהילתיים חכמים ואנלוגיים — הקהילה נפגשת כאן',
    en: 'Smart & analog community spaces — where the community meets',
  },
  'home.upcoming': { he: 'פעילויות קרובות', en: 'Upcoming activities' },
  'home.no_activities': {
    he: 'אין פעילויות קרובות בלוח — זה הזמן להציע רעיון!',
    en: 'No upcoming activities — a great time to propose an idea!',
  },
  'home.approved_ideas': { he: 'רעיונות שאושרו מהקהילה', en: 'Approved community ideas' },
  'home.votes': { he: 'קולות', en: 'votes' },
  'home.book_cta': { he: 'הזמינו מרחב עכשיו', en: 'Book a space now' },

  'login.title': { he: 'התחברות למרכז בריל', en: 'Sign in to Brill Center' },
  'login.email': { he: 'אימייל', en: 'Email' },
  'login.password': { he: 'סיסמה', en: 'Password' },
  'login.submit': { he: 'התחברות', en: 'Sign in' },
  'login.google': { he: 'התחברות עם Google', en: 'Sign in with Google' },
  'login.google_hint': {
    he: 'התחברות עם Google תתאפשר לאחר הגדרת GOOGLE_CLIENT_ID',
    en: 'Google sign-in will appear once GOOGLE_CLIENT_ID is configured',
  },
  'login.or': { he: 'או', en: 'or' },
  'login.register_title': { he: 'עוד לא רשומים?', en: 'New here?' },
  'login.name': { he: 'שם מלא', en: 'Full name' },
  'login.register': { he: 'הרשמה', en: 'Register' },

  'book.title': { he: 'תיאום חכם — הזמנת מרחב', en: 'Smart booking' },
  'book.sub': {
    he: 'המערכת מדרגת עבורך את הזמנים לפי ביקוש — שעות שקטות מאושרות אוטומטית',
    en: 'Slots are ranked by demand — quiet hours are confirmed automatically',
  },
  'book.space': { he: 'מרחב', en: 'Space' },
  'book.date': { he: 'תאריך', en: 'Date' },
  'book.duration': { he: 'משך (דקות)', en: 'Duration (minutes)' },
  'book.activity_title': { he: 'שם הפעילות (יוצג בלוח)', en: 'Activity title (shown on the schedule)' },
  'book.find': { he: 'הצג זמנים מומלצים', en: 'Show suggested slots' },
  'book.suggestions': { he: 'זמנים מומלצים (שקט קודם)', en: 'Suggested slots (quietest first)' },
  'book.no_slots': { he: 'אין זמנים פנויים בתאריך זה', en: 'No free slots on this date' },
  'book.demand.low': { he: 'ביקוש נמוך', en: 'Low demand' },
  'book.demand.medium': { he: 'ביקוש בינוני', en: 'Medium demand' },
  'book.demand.high': { he: 'ביקוש גבוה', en: 'High demand' },
  'book.auto_badge': { he: 'אישור אוטומטי ⚡', en: 'Auto-confirm ⚡' },
  'book.submit': { he: 'הזמן את המרחב', en: 'Book this slot' },
  'book.your_code': { he: 'קוד הגישה הזמני שלך', en: 'Your temporary access code' },
  'book.code_hint': {
    he: 'הקוד תקף רק בחלון ההזמנה. שמור אותו — הוא לא יוצג שוב.',
    en: 'Valid only during your booking window. Save it — it will not be shown again.',
  },
  'book.login_first': { he: 'יש להתחבר כדי להזמין מרחב', en: 'Please sign in to book a space' },

  'ideas.title': { he: 'גלריית הרעיונות', en: 'Idea Gallery' },
  'ideas.sub': {
    he: 'הציעו פעילויות, הצביעו לרעיונות — הקהילה מחליטה',
    en: 'Propose activities and vote — the community decides',
  },
  'ideas.propose': { he: 'הצעת רעיון חדש', en: 'Propose a new idea' },
  'ideas.placeholder': { he: 'מה תרצו שיקרה במרכז?', en: 'What would you like to happen at the center?' },
  'ideas.submit': { he: 'שליחה', en: 'Submit' },
  'ideas.vote': { he: 'הצבעה', en: 'Vote' },
  'ideas.login_first': { he: 'יש להתחבר כדי להציע ולהצביע', en: 'Sign in to propose and vote' },

  'studio.title': { he: 'סטודיו בריל — מרכז הבקרה', en: 'Brill Studio — Control Center' },
  'studio.tab.bookings': { he: 'הזמנות', en: 'Bookings' },
  'studio.tab.inventory': { he: 'מלאי', en: 'Inventory' },
  'studio.tab.treasury': { he: 'קופה', en: 'Treasury' },
  'studio.tab.ideas': { he: 'אישור רעיונות', en: 'Idea approval' },
  'studio.tab.content': { he: 'מחולל תכנים AI', en: 'AI Content Studio' },
  'studio.operators_only': { he: 'אזור זה מיועד למפעילים בלבד', en: 'This area is for operators only' },
  'studio.confirm': { he: 'אישור', en: 'Confirm' },
  'studio.cancel': { he: 'ביטול', en: 'Cancel' },
  'studio.approve': { he: 'אישור', en: 'Approve' },
  'studio.reject': { he: 'דחייה', en: 'Reject' },
  'studio.when': { he: 'מתי', en: 'When' },
  'studio.what': { he: 'פעילות', en: 'Activity' },
  'studio.status': { he: 'סטטוס', en: 'Status' },
  'studio.actions': { he: 'פעולות', en: 'Actions' },
  'studio.item': { he: 'פריט', en: 'Item' },
  'studio.qty': { he: 'כמות', en: 'Qty' },
  'studio.threshold': { he: 'סף התראה', en: 'Threshold' },
  'studio.low_stock': { he: 'מלאי נמוך!', en: 'Low stock!' },
  'studio.report_usage': { he: 'דיווח שימוש', en: 'Report usage' },
  'studio.balance': { he: 'יתרה', en: 'Balance' },
  'studio.tx_type': { he: 'סוג', en: 'Type' },
  'studio.tx_credit': { he: 'זיכוי', en: 'Credit' },
  'studio.tx_debit': { he: 'חיוב', en: 'Debit' },
  'studio.amount': { he: 'סכום', en: 'Amount' },
  'studio.reason': { he: 'סיבה', en: 'Reason' },
  'studio.record_tx': { he: 'רישום תנועה', en: 'Record transaction' },
  'studio.audit_log': { he: 'יומן תנועות', en: 'Transaction log' },

  'content.title': { he: 'מחולל תכנים שיווקיים', en: 'Marketing content generator' },
  'content.sub': {
    he: 'הודעות וואטסאפ, פלאיירים ופוסטים — נוצרים אוטומטית מלוח הפעילויות האמיתי',
    en: 'WhatsApp messages, flyers and posts — generated from the real schedule',
  },
  'content.kind': { he: 'סוג תוכן', en: 'Content type' },
  'content.kind.whatsapp': { he: 'הודעת וואטסאפ', en: 'WhatsApp message' },
  'content.kind.flyer': { he: 'פלאייר להדפסה', en: 'Printable flyer' },
  'content.kind.social': { he: 'פוסט לרשתות', en: 'Social post' },
  'content.language': { he: 'שפת התוכן', en: 'Content language' },
  'content.days': { he: 'טווח ימים קדימה', en: 'Days ahead' },
  'content.extra': { he: 'הנחיות נוספות (אופציונלי)', en: 'Extra instructions (optional)' },
  'content.generate': { he: 'צור תוכן ✨', en: 'Generate ✨' },
  'content.generating': { he: 'יוצר תוכן...', en: 'Generating...' },
  'content.copy': { he: 'העתקה', en: 'Copy' },
  'content.copied': { he: 'הועתק!', en: 'Copied!' },
  'content.print': { he: 'הדפסה', en: 'Print' },
  'content.history': { he: 'תכנים אחרונים', en: 'Recent content' },

  'common.loading': { he: 'טוען...', en: 'Loading...' },
  'common.error': { he: 'משהו השתבש — נסו שוב', en: 'Something went wrong — try again' },
  'common.hello': { he: 'שלום', en: 'Hello' },
} as const;

export type DictKey = keyof typeof dict;

interface I18nContextValue {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: DictKey) => string;
}

const I18nContext = createContext<I18nContextValue>({
  lang: 'he',
  setLang: () => {},
  t: (k) => dict[k].he,
});

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>('he');

  useEffect(() => {
    const saved = window.localStorage.getItem('brill.lang');
    if (saved === 'he' || saved === 'en') setLangState(saved);
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'he' ? 'rtl' : 'ltr';
  }, [lang]);

  const setLang = (l: Lang) => {
    setLangState(l);
    window.localStorage.setItem('brill.lang', l);
  };

  const t = (key: DictKey) => dict[key][lang];

  return <I18nContext.Provider value={{ lang, setLang, t }}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  return useContext(I18nContext);
}
