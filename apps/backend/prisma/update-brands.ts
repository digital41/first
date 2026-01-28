import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Données des marques avec descriptions et sites web
const brandsData = [
  {
    slug: 'airwell',
    description: 'Marque française experte en climatisation et pompes à chaleur depuis 1947. Équipements assemblés en France.',
    websiteUrl: 'https://www.airwell.com',
    logoUrl: 'https://www.airwell.com/wp-content/uploads/2023/03/airwell-logo.svg',
  },
  {
    slug: 'ariston',
    description: 'Solutions de chauffage, eau chaude sanitaire et climatisation. Plus de 90 ans d\'expérience mondiale.',
    websiteUrl: 'https://www.ariston.com/fr-fr/',
    logoUrl: 'https://www.ariston.com/etc.clientlibs/ariston/clientlibs/clientlib-site/resources/images/logo.svg',
  },
  {
    slug: 'atlantic',
    description: 'Fabricant français de chauffage, eau chaude, climatisation et VMC depuis plus de 50 ans. 13 usines en France.',
    websiteUrl: 'https://www.atlantic.fr',
    logoUrl: 'https://www.atlantic.fr/themes/custom/atlantic/images/logo-atlantic.svg',
  },
  {
    slug: 'daikin',
    description: 'Leader mondial de la climatisation et pompes à chaleur. La plus large gamme du marché.',
    websiteUrl: 'https://www.daikin.fr',
    logoUrl: 'https://www.daikin.fr/-/media/Project/Daikin/Daikin_com/images/logos/daikin-logo.svg',
  },
  {
    slug: 'de-dietrich',
    description: 'Fabricant de solutions thermiques depuis 1778. Chaudières, pompes à chaleur, chauffage solaire.',
    websiteUrl: 'https://www.dedietrich-thermique.fr',
    logoUrl: 'https://www.dedietrich-thermique.fr/themes/custom/ddt/logo.svg',
  },
  {
    slug: 'hisense',
    description: 'Solutions de climatisation et pompes à chaleur. Présent dans plus de 130 pays depuis 1969.',
    websiteUrl: 'https://hisensehvac.fr',
    logoUrl: 'https://hisense.fr/wp-content/themes/starter_theme/inc/hisense-logo.svg',
  },
  {
    slug: 'hitachi',
    description: 'Climatisation et pompes à chaleur avec plus de 80 ans d\'expérience. Technologie FrostWash™.',
    websiteUrl: 'https://www.hitachiclimat.fr',
    logoUrl: 'https://www.hitachiclimat.fr/application/files/6016/3584/8419/hitachi-logo.svg',
  },
  {
    slug: 'intuis',
    description: 'Spécialiste français du chauffage électrique intelligent. Fusion de Noirot, Applimo, Muller et Airelec. Fabrication France.',
    websiteUrl: 'https://intuis.fr',
    logoUrl: 'https://intuis.fr/themes/custom/intuis/logo.svg',
  },
  {
    slug: 'lg',
    description: 'Climatiseurs et pompes à chaleur innovants. Technologie DUAL Inverter. Garantie 10 ans compresseur.',
    websiteUrl: 'https://www.lg.com/fr/climatiseurs/',
    logoUrl: 'https://www.lg.com/lg5-common-gp/images/common/header/logo-b2c.svg',
  },
  {
    slug: 'midea',
    description: 'Premier fabricant mondial de climatiseurs depuis 1968. Plus de 20% des climatiseurs mondiaux. Top 500 Forbes.',
    websiteUrl: 'https://www.mideahvac.fr',
    logoUrl: 'https://www.midea.com/content/dam/midea-aem/global/logo.svg',
  },
  {
    slug: 'mitsubishi',
    description: 'Leader de la climatisation et du chauffage par détente directe. Fondé en 1921. Implanté en France depuis 1991.',
    websiteUrl: 'https://confort.mitsubishielectric.fr',
    logoUrl: 'https://confort.mitsubishielectric.fr/themes/custom/mefr/logo.svg',
  },
  {
    slug: 'panasonic',
    description: 'Solutions de chauffage et climatisation. Plus de 50 ans d\'expérience dans 120 pays. 3 sites de production en Europe.',
    websiteUrl: 'https://www.aircon.panasonic.eu/FR_fr/',
    logoUrl: 'https://www.panasonic.com/global/consumer/heating-cooling/assets/img/common/logo.svg',
  },
  {
    slug: 'tech',
    description: 'Régulation et contrôle intelligent du chauffage. Thermostats et régulateurs connectés.',
    websiteUrl: 'https://tech-controllers.com',
    logoUrl: 'https://tech-controllers.com/sites/default/files/logo.svg',
  },
  {
    slug: 'thermor',
    description: 'Fabricant français de radiateurs, sèche-serviettes et chauffe-eau depuis 1931. 5 sites de production en France.',
    websiteUrl: 'https://www.thermor.fr',
    logoUrl: 'https://www.thermor.fr/themes/custom/thermor/logo.svg',
  },
  {
    slug: 'toshiba',
    description: 'Solutions de chauffage et climatisation. Inventeur de la technologie Inverter en 1981. Premier climatiseur en 1953.',
    websiteUrl: 'https://toshiba-confort.fr',
    logoUrl: 'https://toshiba-confort.fr/wp-content/uploads/2023/01/toshiba-logo.svg',
  },
];

async function main() {
  console.log('🔄 Mise à jour des marques avec les données internet...\n');

  for (const data of brandsData) {
    try {
      const updated = await prisma.brand.update({
        where: { slug: data.slug },
        data: {
          description: data.description,
          websiteUrl: data.websiteUrl,
          logoUrl: data.logoUrl,
        },
      });
      console.log(`✅ ${updated.name} - ${data.websiteUrl}`);
    } catch (error) {
      console.error(`❌ Erreur pour ${data.slug}:`, error);
    }
  }

  console.log('\n✨ Mise à jour terminée!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
