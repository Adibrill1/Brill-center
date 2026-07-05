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

  const existingSpace = await prisma.space.findFirst({ where: { nameEn: 'Main Hall' } });
  const space =
    existingSpace ??
    (await prisma.space.create({
      data: {
        nameHe: 'האולם המרכזי',
        nameEn: 'Main Hall',
        type: 'HYBRID',
        ownerId: operator.id,
        config: {
          capacity: 40,
          homeAssistant: { lockEntity: 'lock.main_hall_door' },
          analogKit: { items: ['sand_timer', 'physical_notes', 'manual_lock'] },
        },
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

  console.log('Seed complete:', { operator: operator.email, client: client.email, space: space.nameEn });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
