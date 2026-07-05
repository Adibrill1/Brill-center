import Anthropic from '@anthropic-ai/sdk';
import type { Language, Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { scheduleFeed } from './scheduling.js';

/**
 * AI marketing content generator: WhatsApp messages, printable flyers and
 * social posts built from the space's real schedule.
 *
 * With ANTHROPIC_API_KEY configured, content is written by Claude
 * (claude-opus-4-8). Without it, a deterministic template engine produces
 * solid bilingual output — the feature degrades gracefully, never breaks.
 */

export type ContentKind = 'whatsapp' | 'flyer' | 'social';

interface ScheduleItem {
  title: string;
  spaceName: string;
  start: Date;
  end: Date;
}

interface GenerateInput {
  kind: ContentKind;
  language: 'he' | 'en';
  spaceId?: string;
  days: number;
  extraInstructions?: string;
  userId: string;
}

const LOCALE = { he: 'he-IL', en: 'en-US' } as const;

async function collectSchedule(spaceId: string | undefined, days: number, lang: 'he' | 'en') {
  const feed = await scheduleFeed(days);
  const bookings = spaceId ? feed.bookings.filter((b) => b.spaceId === spaceId) : feed.bookings;
  const items: ScheduleItem[] = bookings.map((b) => ({
    title: b.title ?? (lang === 'he' ? 'פעילות קהילתית' : 'Community activity'),
    spaceName: lang === 'he' ? b.space.nameHe : b.space.nameEn,
    start: b.startTime,
    end: b.endTime,
  }));
  return items;
}

function fmtDay(d: Date, lang: 'he' | 'en'): string {
  return new Intl.DateTimeFormat(LOCALE[lang], {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: 'UTC',
  }).format(d);
}

function fmtTime(d: Date, lang: 'he' | 'en'): string {
  return new Intl.DateTimeFormat(LOCALE[lang], {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'UTC',
  }).format(d);
}

// ---------------------------------------------------------------------------
// Template fallback (no API key required)
// ---------------------------------------------------------------------------

function templateWhatsapp(items: ScheduleItem[], lang: 'he' | 'en'): string {
  if (lang === 'he') {
    const lines = items.map(
      (i) => `🔹 *${i.title}* — ${fmtDay(i.start, 'he')}, ${fmtTime(i.start, 'he')}–${fmtTime(i.end, 'he')} (${i.spaceName})`,
    );
    return [
      '🌟 *מה קורה השבוע במרכז בריל?* 🌟',
      '',
      ...(lines.length ? lines : ['הלוח מתעדכן ממש בקרוב — עקבו אחרינו! ✨']),
      '',
      '📲 להרשמה ולהזמנת מקום — היכנסו לאפליקציה.',
      'נתראה במרכז! 💙',
    ].join('\n');
  }
  const lines = items.map(
    (i) => `🔹 *${i.title}* — ${fmtDay(i.start, 'en')}, ${fmtTime(i.start, 'en')}–${fmtTime(i.end, 'en')} (${i.spaceName})`,
  );
  return [
    "🌟 *What's on at Brill Center this week?* 🌟",
    '',
    ...(lines.length ? lines : ['New schedule coming very soon — stay tuned! ✨']),
    '',
    '📲 Book your spot in the app.',
    'See you at the center! 💙',
  ].join('\n');
}

function templateFlyer(items: ScheduleItem[], lang: 'he' | 'en'): string {
  const rtl = lang === 'he';
  const title = rtl ? 'מרכז בריל · לוח פעילויות' : 'Brill Center · Activity Schedule';
  const subtitle = rtl ? 'הקהילה נפגשת כאן' : 'Where the community meets';
  const empty = rtl ? 'לוח הפעילויות מתעדכן בקרוב' : 'Schedule coming soon';
  const footer = rtl ? 'להרשמה: אפליקציית מרכז בריל' : 'Sign up: the Brill Center app';

  const rows = items
    .map(
      (i) => `
      <div class="item">
        <div class="when"><span class="day">${fmtDay(i.start, lang)}</span><span class="time">${fmtTime(i.start, lang)}–${fmtTime(i.end, lang)}</span></div>
        <div class="what"><strong>${i.title}</strong><span class="where">${i.spaceName}</span></div>
      </div>`,
    )
    .join('');

  return `<!doctype html>
<html lang="${lang}" dir="${rtl ? 'rtl' : 'ltr'}">
<head>
<meta charset="utf-8">
<title>${title}</title>
<style>
  @page { size: A4; margin: 0; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Rubik', 'Segoe UI', sans-serif; background: #10312e; color: #f6f1e7; min-height: 100vh; padding: 48px; }
  .frame { border: 2px solid #d9a441; border-radius: 18px; padding: 40px; min-height: calc(100vh - 96px); display: flex; flex-direction: column; }
  h1 { font-size: 42px; color: #d9a441; letter-spacing: 1px; }
  .sub { font-size: 18px; opacity: .85; margin-top: 6px; margin-bottom: 34px; }
  .item { display: flex; gap: 24px; padding: 16px 0; border-bottom: 1px dashed rgba(217,164,65,.4); align-items: baseline; }
  .when { min-width: 220px; display: flex; flex-direction: column; }
  .day { font-weight: 600; color: #e8c67f; }
  .time { font-size: 14px; opacity: .8; }
  .what { display: flex; flex-direction: column; }
  .what strong { font-size: 20px; }
  .where { font-size: 14px; opacity: .75; }
  .empty { padding: 40px 0; font-size: 22px; opacity: .8; }
  .footer { margin-top: auto; padding-top: 32px; font-size: 16px; color: #e8c67f; }
</style>
</head>
<body>
  <div class="frame">
    <h1>${title}</h1>
    <div class="sub">${subtitle}</div>
    ${rows || `<div class="empty">${empty}</div>`}
    <div class="footer">${footer} · brill.center</div>
  </div>
</body>
</html>`;
}

function templateSocial(items: ScheduleItem[], lang: 'he' | 'en'): string {
  const first = items[0];
  if (lang === 'he') {
    return first
      ? `השבוע במרכז בריל: ${first.title} ב${first.spaceName} 🎉 ${fmtDay(first.start, 'he')} בשעה ${fmtTime(first.start, 'he')}. מספר המקומות מוגבל — שריינו מקום עכשיו! #מרכז_בריל #קהילה`
      : 'משהו חדש מתבשל במרכז בריל... עקבו אחרינו לעדכונים 👀 #מרכז_בריל #קהילה';
  }
  return first
    ? `This week at Brill Center: ${first.title} at ${first.spaceName} 🎉 ${fmtDay(first.start, 'en')}, ${fmtTime(first.start, 'en')}. Limited spots — book now! #BrillCenter #Community`
    : 'Something new is brewing at Brill Center... stay tuned 👀 #BrillCenter #Community';
}

// ---------------------------------------------------------------------------
// Claude-powered generation (when ANTHROPIC_API_KEY is set)
// ---------------------------------------------------------------------------

const KIND_BRIEF: Record<ContentKind, string> = {
  whatsapp:
    'a WhatsApp broadcast message for the community group. Warm, concise, with tasteful emoji and *bold* highlights (WhatsApp formatting). Plain text only.',
  flyer:
    'a printable A4 flyer as a single self-contained HTML document (inline CSS only, no external resources). Elegant community-center aesthetic. Return ONLY the HTML document.',
  social:
    'a short social media post (Instagram/Facebook) with 2-3 relevant hashtags. Plain text only.',
};

async function generateWithClaude(
  kind: ContentKind,
  items: ScheduleItem[],
  lang: 'he' | 'en',
  extraInstructions: string | undefined,
): Promise<{ body: string; model: string } | null> {
  if (!process.env.ANTHROPIC_API_KEY) return null;

  const client = new Anthropic();
  const scheduleText = items.length
    ? items
        .map((i) => `- ${i.title} | ${i.spaceName} | ${fmtDay(i.start, lang)} ${fmtTime(i.start, lang)}-${fmtTime(i.end, lang)}`)
        .join('\n')
    : '(no scheduled activities yet — write a teaser)';

  const model = 'claude-opus-4-8';
  try {
    const response = await client.messages.create({
      model,
      max_tokens: 4096,
      thinking: { type: 'adaptive' },
      system:
        'You are the marketing copywriter for "Brill Center" (מרכז בריל), a smart & analog community space. ' +
        `Write in ${lang === 'he' ? 'Hebrew' : 'English'} only. Community-driven, warm, never corporate.`,
      messages: [
        {
          role: 'user',
          content: `Create ${KIND_BRIEF[kind]}\n\nUpcoming schedule:\n${scheduleText}\n${
            extraInstructions ? `\nAdditional instructions: ${extraInstructions}` : ''
          }`,
        },
      ],
    });
    if (response.stop_reason === 'refusal') return null;
    const text = response.content
      .filter((b): b is Anthropic.TextBlock => b.type === 'text')
      .map((b) => b.text)
      .join('')
      .trim();
    if (!text) return null;
    // Flyers: strip markdown fences if the model wrapped the HTML.
    const body =
      kind === 'flyer' ? text.replace(/^```(?:html)?\s*/i, '').replace(/```\s*$/, '') : text;
    return { body, model };
  } catch (err) {
    console.error('Claude generation failed, falling back to templates:', err);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

export async function generateContent(input: GenerateInput) {
  const items = await collectSchedule(input.spaceId, input.days, input.language);

  const ai = await generateWithClaude(input.kind, items, input.language, input.extraInstructions);
  const body =
    ai?.body ??
    (input.kind === 'whatsapp'
      ? templateWhatsapp(items, input.language)
      : input.kind === 'flyer'
        ? templateFlyer(items, input.language)
        : templateSocial(items, input.language));

  const titles: Record<ContentKind, Record<'he' | 'en', string>> = {
    whatsapp: { he: 'הודעת וואטסאפ שבועית', en: 'Weekly WhatsApp message' },
    flyer: { he: 'פלאייר לוח פעילויות', en: 'Schedule flyer' },
    social: { he: 'פוסט לרשתות חברתיות', en: 'Social media post' },
  };

  const typeMap: Record<ContentKind, 'WHATSAPP' | 'FLYER' | 'SOCIAL'> = {
    whatsapp: 'WHATSAPP',
    flyer: 'FLYER',
    social: 'SOCIAL',
  };

  const record = await prisma.generatedContent.create({
    data: {
      spaceId: input.spaceId,
      type: typeMap[input.kind],
      language: input.language.toUpperCase() as Language,
      title: titles[input.kind][input.language],
      body,
      meta: {
        generator: ai ? ai.model : 'template',
        scheduleDays: input.days,
        itemCount: items.length,
        ...(input.extraInstructions ? { extraInstructions: input.extraInstructions } : {}),
      } as Prisma.InputJsonValue,
      createdBy: input.userId,
    },
  });

  return record;
}
