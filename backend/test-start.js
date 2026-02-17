require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

console.log('Testing database connection...');
console.log('DATABASE_URL:', process.env.DATABASE_URL ? 'Set' : 'NOT SET');

const prisma = new PrismaClient();

async function test() {
  try {
    await prisma.$connect();
    console.log('✅ Database connection successful');
    
    // Try to import and start the server
    console.log('\nTrying to start server...');
    require('./dist/server.js');
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

test();

