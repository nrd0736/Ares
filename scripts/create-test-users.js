// Скрипт для создания администратора

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

// Если переданы аргументы — используем их, иначе дефолтный администратор
const args = process.argv.slice(2);
const testUsers = args.length >= 2
  ? [{
      email:     args[0],
      password:  args[1],
      role:      'ADMIN',
      firstName: args[2] || 'Admin',
      lastName:  args[3] || 'User',
    }]
  : [{
      email:     'admin@ares.ru',
      password:  'admin123',
      role:      'ADMIN',
      firstName: 'Админ',
      lastName:  'Системный',
    }];

async function createTestUsers() {
  process.stdout.write('Creating administrator... ');

  const createdUsers = [];

  for (const userData of testUsers) {
    try {
      const existingUser = await prisma.user.findUnique({
        where: { email: userData.email },
      });

      if (existingUser) {
        const passwordHash = await bcrypt.hash(userData.password, 10);
        await prisma.user.update({
          where: { email: userData.email },
          data: {
            passwordHash,
            isActive: true,
            role: userData.role,
            profile: {
              upsert: {
                create: {
                  firstName: userData.firstName,
                  lastName: userData.lastName,
                },
                update: {
                  firstName: userData.firstName,
                  lastName: userData.lastName,
                },
              },
            },
          },
        });
        createdUsers.push({ ...userData, status: 'updated' });
        continue;
      }

      const passwordHash = await bcrypt.hash(userData.password, 10);
      await prisma.user.create({
        data: {
          email: userData.email,
          passwordHash,
          role: userData.role,
          isActive: true,
          profile: {
            create: {
              firstName: userData.firstName,
              lastName: userData.lastName,
            },
          },
        },
      });

      createdUsers.push({ ...userData, status: 'created' });
    } catch (error) {
      createdUsers.push({ ...userData, status: 'error', error: error.message });
    }
  }

  const success = createdUsers.some(u => u.status === 'created' || u.status === 'updated');
  if (success) {
    console.log('[OK]');
  } else {
    console.log('[WARN] (already exists)');
  }
}

createTestUsers()
  .catch((error) => {
    console.error('Ошибка:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

