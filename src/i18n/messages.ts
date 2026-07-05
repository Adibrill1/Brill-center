// All API-facing strings live here — never hardcoded in routes/services.
// Hebrew is the default language; English is always provided.

export type Lang = 'he' | 'en';

export const messages = {
  'auth.registered': {
    he: 'ההרשמה הושלמה בהצלחה',
    en: 'Registration completed successfully',
  },
  'auth.invalid_credentials': {
    he: 'אימייל או סיסמה שגויים',
    en: 'Invalid email or password',
  },
  'auth.email_taken': {
    he: 'כתובת האימייל כבר רשומה במערכת',
    en: 'Email address is already registered',
  },
  'auth.unauthorized': {
    he: 'נדרשת הזדהות',
    en: 'Authentication required',
  },
  'auth.forbidden': {
    he: 'אין לך הרשאה לבצע פעולה זו',
    en: 'You are not allowed to perform this action',
  },
  'common.not_found': {
    he: 'המשאב המבוקש לא נמצא',
    en: 'The requested resource was not found',
  },
  'common.validation_error': {
    he: 'הנתונים שנשלחו אינם תקינים',
    en: 'The submitted data is invalid',
  },
  'common.internal_error': {
    he: 'אירעה שגיאה פנימית',
    en: 'An internal error occurred',
  },
  'space.created': {
    he: 'המרחב נוצר בהצלחה',
    en: 'Space created successfully',
  },
  'space.updated': {
    he: 'המרחב עודכן בהצלחה',
    en: 'Space updated successfully',
  },
  'booking.created': {
    he: 'ההזמנה נקלטה וממתינה לאישור',
    en: 'Booking received and pending approval',
  },
  'booking.confirmed': {
    he: 'ההזמנה אושרה — קוד גישה זמני נוצר',
    en: 'Booking confirmed — a temporary access code was generated',
  },
  'booking.cancelled': {
    he: 'ההזמנה בוטלה וקוד הגישה נוקה',
    en: 'Booking cancelled and access code revoked',
  },
  'booking.overlap': {
    he: 'המרחב תפוס בזמן המבוקש',
    en: 'The space is already booked for the requested time',
  },
  'access_code.valid': {
    he: 'קוד הגישה תקף',
    en: 'Access code is valid',
  },
  'access_code.invalid': {
    he: 'קוד הגישה שגוי, פג תוקף או בוטל',
    en: 'Access code is wrong, expired or revoked',
  },
  'inventory.created': {
    he: 'הפריט נוסף למלאי',
    en: 'Item added to inventory',
  },
  'inventory.usage_recorded': {
    he: 'הדיווח נקלט והמלאי עודכן',
    en: 'Usage recorded and inventory updated',
  },
  'inventory.low_stock': {
    he: 'שים לב: המלאי ירד מתחת לסף המינימום',
    en: 'Warning: stock has dropped below the minimum threshold',
  },
  'inventory.insufficient': {
    he: 'אין מספיק מלאי לדיווח המבוקש',
    en: 'Not enough stock for the requested usage',
  },
  'idea.submitted': {
    he: 'הרעיון נקלט בגלריית הרעיונות',
    en: 'Idea submitted to the idea gallery',
  },
  'idea.status_updated': {
    he: 'סטטוס הרעיון עודכן',
    en: 'Idea status updated',
  },
  'idea.vote_recorded': {
    he: 'ההצבעה נקלטה',
    en: 'Vote recorded',
  },
  'idea.already_voted': {
    he: 'כבר הצבעת לרעיון זה',
    en: 'You have already voted for this idea',
  },
  'idea.invalid_proposal_xml': {
    he: 'בלוק ה-XML של ההצעה אינו תקין',
    en: 'The proposal XML block is invalid',
  },
  'treasury.transaction_recorded': {
    he: 'התנועה נרשמה בקופה',
    en: 'Transaction recorded in treasury',
  },
  'treasury.insufficient_funds': {
    he: 'אין יתרה מספקת בקופה',
    en: 'Insufficient treasury balance',
  },
  'webhook.invalid_signature': {
    he: 'חתימת ה-Webhook אינה תקינה',
    en: 'Invalid webhook signature',
  },
  'webhook.received': {
    he: 'האירוע נקלט',
    en: 'Event received',
  },
} as const satisfies Record<string, Record<Lang, string>>;

export type MessageKey = keyof typeof messages;

export function t(key: MessageKey, lang: Lang): string {
  return messages[key][lang];
}
