import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Marques triées par ordre alphabétique
const brands = [
  { name: 'Airwell', slug: 'airwell' },
  { name: 'Ariston', slug: 'ariston' },
  { name: 'Atlantic', slug: 'atlantic' },
  { name: 'Daikin', slug: 'daikin' },
  { name: 'De Dietrich', slug: 'de-dietrich' },
  { name: 'Hisense', slug: 'hisense' },
  { name: 'Hitachi', slug: 'hitachi' },
  { name: 'Intuis', slug: 'intuis' },
  { name: 'LG', slug: 'lg' },
  { name: 'Midea', slug: 'midea' },
  { name: 'Mitsubishi', slug: 'mitsubishi' },
  { name: 'Panasonic', slug: 'panasonic' },
  { name: 'Tech', slug: 'tech' },
  { name: 'Thermor', slug: 'thermor' },
  { name: 'Toshiba', slug: 'toshiba' },
];

async function main() {
  console.log('🏭 Ajout des marques...\n');

  for (let i = 0; i < brands.length; i++) {
    const brand = brands[i];

    try {
      const created = await prisma.brand.upsert({
        where: { slug: brand.slug },
        update: { order: i },
        create: {
          name: brand.name,
          slug: brand.slug,
          order: i,
          isActive: true,
        },
      });
      console.log(`✅ ${created.name} (ordre: ${i})`);
    } catch (error) {
      console.error(`❌ Erreur pour ${brand.name}:`, error);
    }
  }

  console.log('\n✨ Terminé! 15 marques ajoutées.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
