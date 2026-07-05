import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const operator = await prisma.user.upsert({
    where: { email: 'operator@brill.center' },
    update: {},
    create: {
      name: 'מפעיל ראשי',
      email: 'operator@brill.center',
      passwordHash: await bcrypt.hash('operator123!', 12),
      role: 'OPERATOR',
      languagePref: 'HE',
    },
  });

  const client = await prisma.user.upsert({
    where: { email: 'client@brill.center' },
    update: {},
    create: {
      name: 'Community Member',
      email: 'client@brill.center',
      passwordHash: await bcrypt.hash('client123!', 12),
      role: 'CLIENT',
      languagePref: 'EN',
    },
  });

  const spaceConfig = {
    capacity: 40,
    autoConfirm: true,
    openingHours: { open: 8, close: 22 },
    slotMinutes: 60,
    homeAssistant: { lockEntity: 'lock.main_hall_door' },
    analogKit: { items: ['sand_timer', 'physical_notes', 'manual_lock'] },
  };

  const existingSpace = await prisma.space.findFirst({ where: { nameEn: 'Main Hall' } });
  const space = existingSpace
    ? await prisma.space.update({ where: { id: existingSpace.id }, data: { config: spaceConfig } })
    : (await prisma.space.create({
      data: {
        nameHe: 'האולם המרכזי',
        nameEn: 'Main Hall',
        type: 'HYBRID',
        ownerId: operator.id,
        config: spaceConfig,
        treasury: { create: { currency: 'ILS' } },
        inventory: {
          create: [
            {
              itemNameHe: 'כיסאות מתקפלים',
              itemNameEn: 'Folding chairs',
              quantity: 40,
              threshold: 10,
            },
            {
              itemNameHe: 'שעוני חול (ערכה אנלוגית)',
              itemNameEn: 'Sand timers (analog kit)',
              quantity: 6,
              threshold: 2,
              attributes: { kit: 'analog' },
            },
          ],
        },
      },
    }));

  await prisma.translation.createMany({
    data: [
      { key: 'nav.home', valueHe: 'בית', valueEn: 'Home' },
      { key: 'nav.spaces', valueHe: 'מרחבים', valueEn: 'Spaces' },
      { key: 'nav.ideas', valueHe: 'גלריית רעיונות', valueEn: 'Idea Gallery' },
      { key: 'nav.studio', valueHe: 'סטודיו בריל', valueEn: 'Brill Studio' },
      { key: 'action.book', valueHe: 'הזמן מרחב', valueEn: 'Book a space' },
      { key: 'action.propose', valueHe: 'הצע רעיון', valueEn: 'Propose an idea' },
    ],
    skipDuplicates: true,
  });

  // Demo schedule + demand history so the smart-scheduling engine and the
  // content generator have real data to work with.
  const existingBookings = await prisma.booking.count({ where: { spaceId: space.id } });
  if (existingBookings === 0) {
    const day = 24 * 60 * 60 * 1000;
    const at = (daysFromNow: number, hour: number) => {
      const d = new Date(Date.now() + daysFromNow * day);
      return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), hour));
    };

    const demo: Array<{ title: string; from: Date; to: Date; status: 'COMPLETED' | 'CONFIRMED' }> = [
      // History (builds the demand matrix — evenings are busy)
      { title: 'חוג יוגה קהילתי', from: at(-14, 18), to: at(-14, 20), status: 'COMPLETED' },
      { title: 'חוג יוגה קהילתי', from: at(-7, 18), to: at(-7, 20), status: 'COMPLETED' },
      { title: 'Community board games', from: at(-10, 19), to: at(-10, 21), status: 'COMPLETED' },
      { title: 'מפגש הורים', from: at(-5, 17), to: at(-5, 19), status: 'COMPLETED' },
      { title: 'Repair café', from: at(-3, 18), to: at(-3, 21), status: 'COMPLETED' },
      // Upcoming (feeds the public schedule + flyers)
      { title: 'סדנת קרמיקה קהילתית', from: at(2, 17), to: at(2, 19), status: 'CONFIRMED' },
      { title: 'ערב משחקי קופסה', from: at(3, 19), to: at(3, 22), status: 'CONFIRMED' },
      { title: 'English conversation club', from: at(5, 10), to: at(5, 12), status: 'CONFIRMED' },
      { title: 'שוק קח-תן שכונתי', from: at(6, 9), to: at(6, 13), status: 'CONFIRMED' },
    ];

    for (const b of demo) {
      await prisma.booking.create({
        data: {
          spaceId: space.id,
          userId: client.id,
          title: b.title,
          startTime: b.from,
          endTime: b.to,
          status: b.status,
        },
      });
    }

    await prisma.idea.createMany({
      data: [
        {
          spaceId: space.id,
          userId: client.id,
          contentHe: 'גינה קהילתית על הגג — פינות ירק לכל משפחה',
          status: 'APPROVED',
          votesCount: 12,
        },
        {
          spaceId: space.id,
          userId: client.id,
          contentEn: 'Weekly repair café — fix instead of throwing away',
          status: 'APPROVED',
          votesCount: 8,
        },
        {
          spaceId: space.id,
          userId: client.id,
          contentHe: 'ספריית כלים שכונתית (מקדחות, סולמות, כלי גינה)',
          status: 'PROPOSED',
          votesCount: 5,
        },
      ],
    });
  }

  console.log('Seed complete:', { operator: operator.email, client: client.email, space: space.nameEn });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
