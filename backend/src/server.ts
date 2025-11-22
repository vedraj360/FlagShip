import dotenv from 'dotenv';
dotenv.config();

import app from './app';
import prisma from './prismaClient';

import { warmupCache, startCacheRefreshJob } from './routes/sdk';

const PORT = process.env.PORT || 4000;

app.listen(PORT, async () => {
  console.log(`Server running on port ${PORT}`);

  try {
    await prisma.$connect();
    console.log('Database connection established successfully');
    await warmupCache();
    startCacheRefreshJob();
  } catch (error) {
    console.error('Failed to connect to the database:', error);
  }
});