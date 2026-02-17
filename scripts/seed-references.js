// Скрипт для заполнения справочников (федеральные округа, регионы, виды спорта, весовые категории)
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Федеральные округа России
const federalDistricts = [
  { code: 'ЦФО', name: 'Центральный федеральный округ' },
  { code: 'СЗФО', name: 'Северо-Западный федеральный округ' },
  { code: 'ЮФО', name: 'Южный федеральный округ' },
  { code: 'СКФО', name: 'Северо-Кавказский федеральный округ' },
  { code: 'ПФО', name: 'Приволжский федеральный округ' },
  { code: 'УФО', name: 'Уральский федеральный округ' },
  { code: 'СФО', name: 'Сибирский федеральный округ' },
  { code: 'ДФО', name: 'Дальневосточный федеральный округ' },
];

// Регионы России (основные) с цифровыми кодами ОКАТО
const regions = [
  // ЦФО
  { code: '77', name: 'Москва', federalDistrictCode: 'ЦФО' },
  { code: '50', name: 'Московская область', federalDistrictCode: 'ЦФО' },
  // СЗФО
  { code: '78', name: 'Санкт-Петербург', federalDistrictCode: 'СЗФО' },
  { code: '47', name: 'Ленинградская область', federalDistrictCode: 'СЗФО' },
  // ЮФО
  { code: '03', name: 'Краснодарский край', federalDistrictCode: 'ЮФО' },
  { code: '61', name: 'Ростовская область', federalDistrictCode: 'ЮФО' },
  // СКФО
  { code: '07', name: 'Ставропольский край', federalDistrictCode: 'СКФО' },
  { code: '05', name: 'Республика Дагестан', federalDistrictCode: 'СКФО' },
  // ПФО
  { code: '92', name: 'Республика Татарстан', federalDistrictCode: 'ПФО' },
  { code: '02', name: 'Республика Башкортостан', federalDistrictCode: 'ПФО' },
  { code: '52', name: 'Нижегородская область', federalDistrictCode: 'ПФО' },
  { code: '63', name: 'Самарская область', federalDistrictCode: 'ПФО' },
  // УФО
  { code: '65', name: 'Свердловская область', federalDistrictCode: 'УФО' },
  { code: '75', name: 'Челябинская область', federalDistrictCode: 'УФО' },
  // СФО
  { code: '54', name: 'Новосибирская область', federalDistrictCode: 'СФО' },
  { code: '04', name: 'Красноярский край', federalDistrictCode: 'СФО' },
  { code: '38', name: 'Иркутская область', federalDistrictCode: 'СФО' },
  // ДФО
  { code: '27', name: 'Хабаровский край', federalDistrictCode: 'ДФО' },
  { code: '25', name: 'Приморский край', federalDistrictCode: 'ДФО' },
];

// Виды спорта (боевые искусства и единоборства, а также командные виды спорта)
const sports = [
  { name: 'Бокс', description: 'Контактный вид спорта, единоборство' },
  { name: 'Карате', description: 'Японское боевое искусство' },
  { name: 'Дзюдо', description: 'Японское боевое искусство и олимпийский вид спорта' },
  { name: 'Тхэквондо', description: 'Корейское боевое искусство' },
  { name: 'Борьба вольная', description: 'Олимпийский вид спорта' },
  { name: 'Борьба греко-римская', description: 'Олимпийский вид спорта' },
  { name: 'Самбо', description: 'Советское боевое искусство' },
  { name: 'ММА', description: 'Смешанные боевые искусства' },
  { name: 'Кикбоксинг', description: 'Гибридный вид спорта' },
  { name: 'Муай-тай', description: 'Тайский бокс' },
  { name: 'Баскетбол', description: 'Командный вид спорта' },
];

// Весовые категории (универсальные для боевых искусств)
const weightCategories = [
  { name: 'До 48 кг', minWeight: 0, maxWeight: 48, gender: 'BOTH' },
  { name: 'До 52 кг', minWeight: 48, maxWeight: 52, gender: 'BOTH' },
  { name: 'До 56 кг', minWeight: 52, maxWeight: 56, gender: 'BOTH' },
  { name: 'До 60 кг', minWeight: 56, maxWeight: 60, gender: 'BOTH' },
  { name: 'До 64 кг', minWeight: 60, maxWeight: 64, gender: 'BOTH' },
  { name: 'До 68 кг', minWeight: 64, maxWeight: 68, gender: 'BOTH' },
  { name: 'До 72 кг', minWeight: 68, maxWeight: 72, gender: 'BOTH' },
  { name: 'До 76 кг', minWeight: 72, maxWeight: 76, gender: 'BOTH' },
  { name: 'До 80 кг', minWeight: 76, maxWeight: 80, gender: 'BOTH' },
  { name: 'До 84 кг', minWeight: 80, maxWeight: 84, gender: 'BOTH' },
  { name: 'До 88 кг', minWeight: 84, maxWeight: 88, gender: 'BOTH' },
  { name: 'До 92 кг', minWeight: 88, maxWeight: 92, gender: 'BOTH' },
  { name: 'До 96 кг', minWeight: 92, maxWeight: 96, gender: 'BOTH' },
  { name: 'До 100 кг', minWeight: 96, maxWeight: 100, gender: 'BOTH' },
  { name: 'Свыше 100 кг', minWeight: 100, maxWeight: 999,   gender: 'BOTH' },
];

// Спортивные разряды (от низшего к высшему)
const sportsRanks = [
  { name: 'III разряд', description: 'Третий спортивный разряд', order: 1 },
  { name: 'II разряд', description: 'Второй спортивный разряд', order: 2 },
  { name: 'I разряд', description: 'Первый спортивный разряд', order: 3 },
  { name: 'КМС', description: 'Кандидат в мастера спорта', order: 4 },
  { name: 'МС', description: 'Мастер спорта', order: 5 },
  { name: 'МСМК', description: 'Мастер спорта международного класса', order: 6 },
];

async function seedReferences() {
  console.log('\n================================================');
  console.log('      Seeding Reference Data');
  console.log('================================================\n');

  try {
    let newCount = 0;
    let existingCount = 0;

    // 1. Federal districts
    process.stdout.write('[1/5] Federal districts... ');
    const createdDistricts = {};
    for (const district of federalDistricts) {
      try {
        const existing = await prisma.federalDistrict.findUnique({
          where: { code: district.code },
        });

        if (existing) {
          createdDistricts[district.code] = existing;
          existingCount++;
        } else {
          const created = await prisma.federalDistrict.create({ data: district });
          createdDistricts[district.code] = created;
          newCount++;
        }
      } catch (error) {
        console.error(`\n  ✗ Ошибка: ${district.name}`);
      }
    }
    console.log(`✓ (${newCount} новых, ${existingCount} существующих)`);

    // 2. Regions
    newCount = 0;
    existingCount = 0;
    process.stdout.write('[2/5] Regions... ');
    for (const region of regions) {
      try {
        const district = createdDistricts[region.federalDistrictCode];
        if (!district) continue;

        const existing = await prisma.region.findFirst({
          where: { code: region.code },
        });

        if (existing) {
          existingCount++;
        } else {
          await prisma.region.create({
            data: {
              code: region.code,
              name: region.name,
              federalDistrictId: district.id,
            },
          });
          newCount++;
        }
      } catch (error) {}
    }
    console.log(`✓ (${newCount} новых, ${existingCount} существующих)`);

    // 3. Sports
    newCount = 0;
    existingCount = 0;
    process.stdout.write('[3/5] Sports... ');
    for (const sport of sports) {
      try {
        const existing = await prisma.sport.findFirst({
          where: { name: sport.name },
        });

        if (existing) {
          existingCount++;
        } else {
          await prisma.sport.create({ data: sport });
          newCount++;
        }
      } catch (error) {}
    }
    console.log(`✓ (${newCount} новых, ${existingCount} существующих)`);

    // 4. Weight categories
    newCount = 0;
    existingCount = 0;
    process.stdout.write('[4/5] Weight categories... ');
    const createdSports = await prisma.sport.findMany();
    
    if (createdSports.length === 0) {
      console.log('⚠ No sports found');
    } else {
      for (const sport of createdSports) {
        for (const category of weightCategories) {
          try {
            const existing = await prisma.weightCategory.findFirst({
              where: { 
                name: category.name,
                sportId: sport.id,
              },
            });

            if (existing) {
              existingCount++;
            } else {
              await prisma.weightCategory.create({
                data: {
                  name: category.name,
                  minWeight: category.minWeight,
                  maxWeight: category.maxWeight,
                  sportId: sport.id,
                },
              });
              newCount++;
            }
          } catch (error) {}
        }
      }
      console.log(`✓ (${newCount} новых, ${existingCount} существующих)`);
    }

    // 5. Sports ranks
    newCount = 0;
    existingCount = 0;
    process.stdout.write('[5/5] Sports ranks... ');
    for (const rank of sportsRanks) {
      try {
        const existing = await prisma.sportsRank.findUnique({
          where: { name: rank.name },
        });

        if (existing) {
          existingCount++;
        } else {
          await prisma.sportsRank.create({ data: rank });
          newCount++;
        }
      } catch (error) {}
    }
    console.log(`✓ (${newCount} новых, ${existingCount} существующих)`);

    console.log('\n[OK] Reference data seeded successfully\n');
  } catch (error) {
    console.error('\n[ERROR] Critical error:', error.message);
    throw error;
  }
}

seedReferences()
  .catch((error) => {
    console.error('Ошибка:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

