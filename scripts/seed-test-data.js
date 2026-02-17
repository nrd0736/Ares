// Скрипт для тестового наполнения базы данных
// Создает два незавершенных соревнования
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

// Генерируем данные для первого соревнования
const generateJudges1 = () => {
  return [
    {
      email: 'judge1_1@ares.ru',
      password: 'judge123',
      firstName: 'Александр',
      lastName: 'Судьин',
      middleName: 'Сергеевич',
      phone: '+7 (999) 111-11-11',
    },
    {
      email: 'judge1_2@ares.ru',
      password: 'judge123',
      firstName: 'Сергей',
      lastName: 'Судьев',
      middleName: 'Александрович',
      phone: '+7 (999) 111-11-12',
    },
    {
      email: 'judge1_3@ares.ru',
      password: 'judge123',
      firstName: 'Дмитрий',
      lastName: 'Судьев',
      middleName: 'Петрович',
      phone: '+7 (999) 111-11-13',
    },
  ];
};

// Генерируем данные для второго соревнования
const generateJudges2 = () => {
  return [
    {
      email: 'judge2_1@ares.ru',
      password: 'judge123',
      firstName: 'Петр',
      lastName: 'Судьин',
      middleName: 'Иванович',
      phone: '+7 (999) 222-22-21',
    },
    {
      email: 'judge2_2@ares.ru',
      password: 'judge123',
      firstName: 'Иван',
      lastName: 'Судьев',
      middleName: 'Сергеевич',
      phone: '+7 (999) 222-22-22',
    },
    {
      email: 'judge2_3@ares.ru',
      password: 'judge123',
      firstName: 'Владимир',
      lastName: 'Судьев',
      middleName: 'Александрович',
      phone: '+7 (999) 222-22-23',
    },
  ];
};

// Генерируем спортсменов (40 спортсменов = 5 команд × 8 спортсменов)
const generateAthletes = (prefix) => {
  const athletes = [];
  const firstNames = ['Дмитрий', 'Анна', 'Сергей', 'Елена', 'Алексей', 'Ольга', 'Иван', 'Мария', 'Петр', 'Татьяна', 'Владимир', 'Наталья', 'Андрей', 'Екатерина', 'Максим', 'Юлия', 'Игорь', 'Светлана', 'Николай', 'Анастасия', 'Роман', 'Дарья', 'Артем', 'Марина', 'Павел', 'Виктория', 'Александр', 'Евгения', 'Константин', 'Алина', 'Михаил', 'Полина', 'Тимур', 'Ирина', 'Руслан', 'Валерия', 'Григорий', 'Антон', 'Станислав', 'Денис'];
  const lastNames = ['Боец', 'Победитель', 'Чемпион', 'Сильная', 'Быстрый', 'Ловкая', 'Смелый', 'Упорная', 'Сильный', 'Быстрая', 'Ловкий', 'Упорная', 'Смелая', 'Победитель', 'Чемпион', 'Сильная', 'Боец', 'Быстрая', 'Ловкий', 'Смелая', 'Упорный', 'Победитель', 'Чемпион', 'Сильная', 'Боец', 'Быстрая', 'Ловкий', 'Смелая', 'Упорный', 'Победитель', 'Чемпион', 'Сильная', 'Боец', 'Быстрая', 'Ловкий', 'Смелая', 'Упорный', 'Победитель', 'Чемпион', 'Сильная'];
  const middleNames = ['Александрович', 'Дмитриевна', 'Владимирович', 'Сергеевна', 'Игоревич', 'Александровна', 'Петрович', 'Ивановна', 'Иванович', 'Игоревна', 'Сергеевич', 'Владимировна', 'Александрович', 'Петровна', 'Дмитриевич', 'Андреевна', 'Владимирович', 'Сергеевна', 'Игоревич', 'Александровна', 'Петрович', 'Ивановна', 'Иванович', 'Игоревна', 'Сергеевич', 'Владимировна', 'Александрович', 'Петровна', 'Дмитриевич', 'Андреевна', 'Владимирович', 'Сергеевна', 'Игоревич', 'Александровна', 'Петрович', 'Ивановна', 'Иванович', 'Игоревна', 'Сергеевич', 'Владимировна'];
  const genders = ['MALE', 'FEMALE', 'MALE', 'FEMALE', 'MALE', 'FEMALE', 'MALE', 'FEMALE', 'MALE', 'FEMALE', 'MALE', 'FEMALE', 'MALE', 'FEMALE', 'MALE', 'FEMALE', 'MALE', 'FEMALE', 'MALE', 'FEMALE', 'MALE', 'FEMALE', 'MALE', 'FEMALE', 'MALE', 'FEMALE', 'MALE', 'FEMALE', 'MALE', 'FEMALE', 'MALE', 'FEMALE', 'MALE', 'FEMALE', 'MALE', 'FEMALE', 'MALE', 'FEMALE', 'MALE', 'FEMALE'];
  const sportsRanks = ['III разряд', 'II разряд', 'I разряд', 'КМС', 'МС', 'МСМК', 'III разряд', 'II разряд', 'I разряд', 'КМС', 'МС', 'III разряд', 'II разряд', 'I разряд', 'КМС', 'МС', 'III разряд', 'II разряд', 'I разряд', 'КМС', 'МС', 'III разряд', 'II разряд', 'I разряд', 'КМС', 'МС', 'III разряд', 'II разряд', 'I разряд', 'КМС', 'МС', 'III разряд', 'II разряд', 'I разряд', 'КМС', 'МС', 'III разряд', 'II разряд', 'I разряд', 'КМС'];
  
  for (let i = 0; i < 40; i++) {
    const year = 2000 + (i % 5);
    const month = (i % 12) + 1;
    const day = (i % 28) + 1;
    athletes.push({
      email: `${prefix}_athlete${i + 1}@ares.ru`,
      password: 'athlete123',
      firstName: firstNames[i],
      lastName: lastNames[i],
      middleName: middleNames[i],
      birthDate: new Date(year, month - 1, day),
      gender: genders[i],
      phone: `+7 (999) ${String(100 + i).padStart(3, '0')}-${String(10 + i).padStart(2, '0')}-${String(20 + i).padStart(2, '0')}`,
      sportsRank: sportsRanks[i],
    });
  }
  return athletes;
};

async function seedTestData() {
  console.log('\n================================================');
  console.log('      Creating Test Data');
  console.log('================================================\n');
  console.log('Plan:');
  console.log('  • Competition 1: In progress (5 teams, 3 judges, 40 athletes)');
  console.log('  • Competition 2: In progress (5 teams, 3 judges, 40 athletes)\n');

  try {
    // 1. Check reference data
    process.stdout.write('[1/5] Checking reference data... ');
    const regions = await prisma.region.findMany();
    const sports = await prisma.sport.findMany();
    const weightCategories = await prisma.weightCategory.findMany();
    const sportsRanks = await prisma.sportsRank.findMany({ orderBy: { order: 'asc' } });

    if (regions.length === 0 || sports.length === 0 || weightCategories.length === 0) {
      console.log('⚠');
      console.log('  ⚠ Запустите: node scripts/seed-references.js');
      return;
    }
    console.log(`✓ (${regions.length} регионов, ${sports.length} видов спорта)`);

    // Создаем маппинг названий разрядов на их ID
    const sportsRankMap = {};
    for (const rank of sportsRanks) {
      sportsRankMap[rank.name] = rank.id;
    }

    // 2. Создание команд для первого соревнования
    process.stdout.write('[2/5] Создание команд для соревнования 1... ');
    const createdTeams1 = [];
    const teamNames1 = ['Спартак', 'Динамо', 'ЦСКА', 'Локомотив', 'Зенит'];
    
    for (let i = 0; i < 5; i++) {
      try {
        let teamName = teamNames1[i];
        let existingTeam = await prisma.team.findFirst({ where: { name: teamName } });

        if (existingTeam) {
          teamName = `${teamNames1[i]} ${Math.floor(Math.random() * 1000)}`;
        }

        const region = regions[i % regions.length];
        const team = await prisma.team.create({
          data: {
            name: teamName,
            regionId: region.id,
            address: `г. ${region.name}, ул. Спортивная, д. ${i + 1}`,
            contactInfo: `Тестовая команда ${teamName}`,
            description: `Тестовая команда ${teamName}`,
            status: 'APPROVED',
          },
          include: { region: true },
        });

        createdTeams1.push(team);
      } catch (error) {}
    }

    // Создание команд для второго соревнования
    const createdTeams2 = [];
    const teamNames2 = ['Торпедо', 'Факел', 'Сочи', 'Химки', 'Нижний Новгород'];
    
    for (let i = 0; i < 5; i++) {
      try {
        let teamName = teamNames2[i];
        let existingTeam = await prisma.team.findFirst({ where: { name: teamName } });

        if (existingTeam) {
          teamName = `${teamNames2[i]} ${Math.floor(Math.random() * 1000)}`;
        }

        const region = regions[(i + 3) % regions.length];
        const team = await prisma.team.create({
          data: {
            name: teamName,
            regionId: region.id,
            address: `г. ${region.name}, ул. Спортивная, д. ${i + 4}`,
            contactInfo: `Тестовая команда ${teamName}`,
            description: `Тестовая команда ${teamName}`,
            status: 'APPROVED',
          },
          include: { region: true },
        });

        createdTeams2.push(team);
      } catch (error) {}
    }
    console.log(`✓ (${createdTeams1.length + createdTeams2.length} команд)`);

    // 3. Создание тренеров
    process.stdout.write('[3/5] Создание тренеров... ');
    const createdCoaches1 = [];
    const firstNames = ['Иван', 'Мария', 'Петр', 'Елена', 'Сергей'];
    const lastNames = ['Тренеров', 'Спортивная', 'Тренерский', 'Тренерова', 'Тренер'];
    const middleNames = ['Петрович', 'Ивановна', 'Иванович', 'Сергеевна', 'Александрович'];
    
    for (let i = 0; i < createdTeams1.length; i++) {
      const team = createdTeams1[i];
      const coachEmail = `coach1_team${i + 1}@ares.ru`;
      
      try {
        const existing = await prisma.user.findUnique({
          where: { email: coachEmail },
        });

        if (existing) {
          const coach = await prisma.coach.findFirst({
            where: { userId: existing.id },
            include: { user: true, team: true },
          });
          if (coach) {
            createdCoaches1.push(coach);
          }
          continue;
        }

        const passwordHash = await bcrypt.hash('coach123', 10);
        const phone = `+7 (999) ${String(100 + i).padStart(3, '0')}-${String(10 + i).padStart(2, '0')}-${String(20 + i).padStart(2, '0')}`;

        const user = await prisma.user.create({
          data: {
            email: coachEmail,
            passwordHash,
            role: 'COACH',
            profile: {
              create: {
                firstName: firstNames[i],
                lastName: lastNames[i],
                middleName: middleNames[i],
                phone: phone,
              },
            },
          },
          include: { profile: true },
        });

        const coach = await prisma.coach.create({
          data: {
            userId: user.id,
            teamId: team.id,
          },
          include: {
            user: { include: { profile: true } },
            team: true,
          },
        });

        createdCoaches1.push(coach);
      } catch (error) {}
    }

    const createdCoaches2 = [];
    const firstNames2 = ['Петр', 'Елена', 'Сергей', 'Анна', 'Алексей'];
    const lastNames2 = ['Тренерский', 'Тренерова', 'Тренер', 'Тренерская', 'Тренеровский'];
    const middleNames2 = ['Иванович', 'Сергеевна', 'Александрович', 'Дмитриевна', 'Владимирович'];
    
    for (let i = 0; i < createdTeams2.length; i++) {
      const team = createdTeams2[i];
      const coachEmail = `coach2_team${i + 1}@ares.ru`;
      
      try {
        const existing = await prisma.user.findUnique({
          where: { email: coachEmail },
        });

        if (existing) {
          const coach = await prisma.coach.findFirst({
            where: { userId: existing.id },
            include: { user: true, team: true },
          });
          if (coach) {
            createdCoaches2.push(coach);
          }
          continue;
        }

        const passwordHash = await bcrypt.hash('coach123', 10);
        const phone = `+7 (999) ${String(200 + i).padStart(3, '0')}-${String(30 + i).padStart(2, '0')}-${String(40 + i).padStart(2, '0')}`;

        const user = await prisma.user.create({
          data: {
            email: coachEmail,
            passwordHash,
            role: 'COACH',
            profile: {
              create: {
                firstName: firstNames2[i],
                lastName: lastNames2[i],
                middleName: middleNames2[i],
                phone: phone,
              },
            },
          },
          include: { profile: true },
        });

        const coach = await prisma.coach.create({
          data: {
            userId: user.id,
            teamId: team.id,
          },
          include: {
            user: { include: { profile: true } },
            team: true,
          },
        });

        createdCoaches2.push(coach);
      } catch (error) {}
    }
    console.log(`✓ (${createdCoaches1.length + createdCoaches2.length} тренеров)`);

    // 4. Создание судей
    process.stdout.write('[4/5] Создание судей... ');
    const createdJudges1 = [];
    const testJudges1 = generateJudges1();
    
    for (const judgeData of testJudges1) {
      try {
        const existing = await prisma.user.findUnique({
          where: { email: judgeData.email },
        });

        if (existing) {
          if (existing.role === 'JUDGE') {
            createdJudges1.push(existing);
          }
          continue;
        }

        const passwordHash = await bcrypt.hash(judgeData.password, 10);
        const user = await prisma.user.create({
          data: {
            email: judgeData.email,
            passwordHash,
            role: 'JUDGE',
            profile: {
              create: {
                firstName: judgeData.firstName,
                lastName: judgeData.lastName,
                middleName: judgeData.middleName,
                phone: judgeData.phone,
              },
            },
          },
          include: { profile: true },
        });

        createdJudges1.push(user);
      } catch (error) {}
    }

    const createdJudges2 = [];
    const testJudges2 = generateJudges2();
    
    for (const judgeData of testJudges2) {
      try {
        const existing = await prisma.user.findUnique({
          where: { email: judgeData.email },
        });

        if (existing) {
          if (existing.role === 'JUDGE') {
            createdJudges2.push(existing);
          }
          continue;
        }

        const passwordHash = await bcrypt.hash(judgeData.password, 10);
        const user = await prisma.user.create({
          data: {
            email: judgeData.email,
            passwordHash,
            role: 'JUDGE',
            profile: {
              create: {
                firstName: judgeData.firstName,
                lastName: judgeData.lastName,
                middleName: judgeData.middleName,
                phone: judgeData.phone,
              },
            },
          },
          include: { profile: true },
        });

        createdJudges2.push(user);
      } catch (error) {}
    }
    console.log(`✓ (${createdJudges1.length + createdJudges2.length} судей)`);

    // 5. Создание спортсменов
    process.stdout.write('[5/5] Создание спортсменов... ');
    const testAthletes1 = generateAthletes('athlete1');
    const testAthletes2 = generateAthletes('athlete2');
    
    const createdAthletes1 = [];
    // 40 спортсменов распределяем: 8 спортсменов на команду, равномерно по весовым категориям
    // 5 весовых категорий × 8 спортсменов = 40 спортсменов
    for (let i = 0; i < testAthletes1.length; i++) {
      try {
        const athleteData = testAthletes1[i];
        const existing = await prisma.user.findUnique({
          where: { email: athleteData.email },
        });

        if (existing) {
          const athlete = await prisma.athlete.findFirst({
            where: { userId: existing.id },
            include: {
              user: { include: { profile: true } },
              weightCategory: true,
              team: true,
            },
          });
          if (athlete) createdAthletes1.push(athlete);
          continue;
        }

        const passwordHash = await bcrypt.hash(athleteData.password, 10);
        // Распределяем по командам: каждые 8 спортсменов в одну команду
        const teamIndex = Math.floor(i / 8);
        const team = createdTeams1[teamIndex];
        const coach = createdCoaches1[teamIndex];
        
        // Равномерно распределяем по весовым категориям: 8 спортсменов в каждой категории
        // i % 5 дает индекс категории (0-4)
        const categoryIndex = i % 5;
        const weightCategory = weightCategories[categoryIndex % weightCategories.length];

        const user = await prisma.user.create({
          data: {
            email: athleteData.email,
            passwordHash,
            role: 'ATHLETE',
            profile: {
              create: {
                firstName: athleteData.firstName,
                lastName: athleteData.lastName,
                middleName: athleteData.middleName,
                phone: athleteData.phone,
              },
            },
          },
          include: { profile: true },
        });

        const weight = weightCategory.minWeight && weightCategory.maxWeight
          ? ((weightCategory.minWeight + weightCategory.maxWeight) / 2).toFixed(1)
          : null;

        let sportsRankId = null;
        if (athleteData.sportsRank && sportsRankMap[athleteData.sportsRank]) {
          sportsRankId = sportsRankMap[athleteData.sportsRank];
        } else if (sportsRanks.length > 0) {
          sportsRankId = sportsRanks[0].id;
        } else {
          throw new Error('В базе данных нет спортивных разрядов. Запустите сначала: node scripts/seed-references.js');
        }

        const athlete = await prisma.athlete.create({
          data: {
            userId: user.id,
            teamId: team.id,
            coachId: coach.id,
            weightCategoryId: weightCategory.id,
            birthDate: athleteData.birthDate,
            gender: athleteData.gender,
            weight: weight ? parseFloat(weight) : null,
            sportsRankId: sportsRankId,
          },
          include: {
            user: { include: { profile: true } },
            team: true,
            coach: { include: { user: { include: { profile: true } } } },
          },
        });

        createdAthletes1.push(athlete);
      } catch (error) {}
    }

    const createdAthletes2 = [];
    for (let i = 0; i < testAthletes2.length; i++) {
      try {
        const athleteData = testAthletes2[i];
        const existing = await prisma.user.findUnique({
          where: { email: athleteData.email },
        });

        if (existing) {
          const athlete = await prisma.athlete.findFirst({
            where: { userId: existing.id },
            include: {
              user: { include: { profile: true } },
              weightCategory: true,
              team: true,
            },
          });
          if (athlete) createdAthletes2.push(athlete);
          continue;
        }

        const passwordHash = await bcrypt.hash(athleteData.password, 10);
        const teamIndex = Math.floor(i / 8);
        const team = createdTeams2[teamIndex];
        const coach = createdCoaches2[teamIndex];
        
        const categoryIndex = i % 5;
        const weightCategory = weightCategories[categoryIndex % weightCategories.length];

        const user = await prisma.user.create({
          data: {
            email: athleteData.email,
            passwordHash,
            role: 'ATHLETE',
            profile: {
              create: {
                firstName: athleteData.firstName,
                lastName: athleteData.lastName,
                middleName: athleteData.middleName,
                phone: athleteData.phone,
              },
            },
          },
          include: { profile: true },
        });

        const weight = weightCategory.minWeight && weightCategory.maxWeight
          ? ((weightCategory.minWeight + weightCategory.maxWeight) / 2).toFixed(1)
          : null;

        let sportsRankId = null;
        if (athleteData.sportsRank && sportsRankMap[athleteData.sportsRank]) {
          sportsRankId = sportsRankMap[athleteData.sportsRank];
        } else if (sportsRanks.length > 0) {
          sportsRankId = sportsRanks[0].id;
        } else {
          throw new Error('В базе данных нет спортивных разрядов. Запустите сначала: node scripts/seed-references.js');
        }

        const athlete = await prisma.athlete.create({
          data: {
            userId: user.id,
            teamId: team.id,
            coachId: coach.id,
            weightCategoryId: weightCategory.id,
            birthDate: athleteData.birthDate,
            gender: athleteData.gender,
            weight: weight ? parseFloat(weight) : null,
            sportsRankId: sportsRankId,
          },
          include: {
            user: { include: { profile: true } },
            team: true,
            coach: { include: { user: { include: { profile: true } } } },
          },
        });

        createdAthletes2.push(athlete);
      } catch (error) {}
    }
    console.log(`✓ (${createdAthletes1.length + createdAthletes2.length} спортсменов)`);

    if (sports.length === 0) {
      console.log('\n[WARN] Недостаточно данных для создания соревнований');
      return;
    }

    const sport = sports[0];
    const now = new Date();

    // 6. Создание соревнований
    process.stdout.write('[6/6] Создание соревнований... ');
    
    // Соревнование 1
    const startDate1 = new Date(now);
    startDate1.setHours(9, 0, 0, 0);
    const endDate1 = new Date(startDate1);
    endDate1.setDate(endDate1.getDate() + 3);

    const competition1 = await prisma.competition.create({
      data: {
        name: 'Чемпионат России по боксу 2024',
        sportId: sport.id,
        competitionType: 'INDIVIDUAL',
        startDate: startDate1,
        endDate: endDate1,
        location: 'г. Москва, Спортивный комплекс "Арена"',
        description: 'Соревнование в процессе. Участники зарегистрированы.',
        organizerInfo: 'Федерация единоборств России',
        status: 'IN_PROGRESS',
      },
      include: { sport: true },
    });

    // Регистрируем участников
    for (let i = 0; i < createdAthletes1.length; i++) {
      try {
        await prisma.competitionParticipant.create({
          data: {
            competitionId: competition1.id,
            athleteId: createdAthletes1[i].id,
            status: 'CONFIRMED',
          },
        });
      } catch (error) {}
    }

    // Создаем заявки команд
    for (let i = 0; i < createdTeams1.length; i++) {
      try {
        await prisma.application.create({
          data: {
            teamId: createdTeams1[i].id,
            competitionId: competition1.id,
            status: 'APPROVED',
          },
        });
      } catch (error) {}
    }

    // Добавляем судей
    for (const judge of createdJudges1) {
      try {
        await prisma.competitionJudge.create({
          data: {
            competitionId: competition1.id,
            userId: judge.id,
          },
        });
      } catch (error) {}
    }

    // Добавляем тренеров
    for (const coach of createdCoaches1) {
      try {
        await prisma.competitionCoach.create({
          data: {
            competitionId: competition1.id,
            coachId: coach.id,
          },
        });
      } catch (error) {}
    }

    // Соревнование 2
    const startDate2 = new Date(now);
    startDate2.setDate(startDate2.getDate() + 7);
    startDate2.setHours(9, 0, 0, 0);
    const endDate2 = new Date(startDate2);
    endDate2.setDate(endDate2.getDate() + 3);

    const competition2 = await prisma.competition.create({
      data: {
        name: 'Кубок Федерации единоборств 2024',
        sportId: sport.id,
        competitionType: 'INDIVIDUAL',
        startDate: startDate2,
        endDate: endDate2,
        location: 'г. Санкт-Петербург, Дворец спорта',
        description: 'Соревнование в процессе. Участники зарегистрированы.',
        organizerInfo: 'Федерация единоборств России',
        status: 'IN_PROGRESS',
      },
      include: { sport: true },
    });

    // Регистрируем участников
    for (let i = 0; i < createdAthletes2.length; i++) {
      try {
        await prisma.competitionParticipant.create({
          data: {
            competitionId: competition2.id,
            athleteId: createdAthletes2[i].id,
            status: 'CONFIRMED',
          },
        });
      } catch (error) {}
    }

    // Создаем заявки команд
    for (let i = 0; i < createdTeams2.length; i++) {
      try {
        await prisma.application.create({
          data: {
            teamId: createdTeams2[i].id,
            competitionId: competition2.id,
            status: 'APPROVED',
          },
        });
      } catch (error) {}
    }

    // Добавляем судей
    for (const judge of createdJudges2) {
      try {
        await prisma.competitionJudge.create({
          data: {
            competitionId: competition2.id,
            userId: judge.id,
          },
        });
      } catch (error) {}
    }

    // Добавляем тренеров
    for (const coach of createdCoaches2) {
      try {
        await prisma.competitionCoach.create({
          data: {
            competitionId: competition2.id,
            coachId: coach.id,
          },
        });
      } catch (error) {}
    }

    console.log('[OK]');

    console.log('\n================================================');
    console.log('      Test Data Created Successfully!');
    console.log('================================================\n');
    console.log('Competitions:');
    console.log(`  • Чемпионат России по боксу 2024 (IN_PROGRESS)`);
    console.log(`  • Кубок Федерации единоборств 2024 (IN_PROGRESS)\n`);
    console.log('Created users:');
    console.log(`  • Teams: ${createdTeams1.length + createdTeams2.length} (по 5 на соревнование)`);
    console.log(`  • Coaches: ${createdCoaches1.length + createdCoaches2.length} (password: coach123)`);
    console.log(`  • Judges: ${createdJudges1.length + createdJudges2.length} (password: judge123)`);
    console.log(`  • Athletes: ${createdAthletes1.length + createdAthletes2.length} (password: athlete123)`);
    console.log(`    - По 40 спортсменов в каждом соревновании`);
    console.log(`    - По 8 спортсменов в каждой команде`);
    console.log(`    - Равномерно распределены по 5 весовым категориям\n`);
  } catch (error) {
    console.error('\n[ERROR] Критическая ошибка при создании тестовых данных:', error);
    throw error;
  }
}

seedTestData()
  .catch((error) => {
    console.error('Ошибка:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
