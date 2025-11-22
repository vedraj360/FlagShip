import { Router } from 'express';
import prisma from '../prismaClient';
import { apiLimiter } from '../middleware/rateLimit';

const router = Router();

// Cache structure: Map<appKey, Flag[]>
// Cache structure: Map<appKey, Flag[]>
export const sdkCache = new Map<string, any[]>();

export const invalidateCache = (appKey: string) => {
  sdkCache.delete(appKey);
  console.log(`Invalidated cache for app: ${appKey}`);
};

export const warmupCache = async () => {
  console.log('Warming up SDK cache...');
  try {
    const apps = await prisma.application.findMany({
      include: {
        flags: {
          where: { enabled: true },
          select: {
            key: true,
            enabled: true,
            displayName: true,
            description: true,
            value: true,
            type: true
          }
        }
      }
    });

    apps.forEach(app => {
      const flagsArray = app.flags.map(flag => ({
        key: flag.key,
        enabled: flag.enabled,
        displayName: flag.displayName,
        description: flag.description,
        value: flag.value,
        type: flag.type
      }));
      sdkCache.set(app.key, flagsArray);
    });
    console.log(`SDK cache warmed up with ${apps.length} applications.`);
  } catch (error) {
    console.error('Failed to warm up SDK cache:', error);
  }
};

router.get('/:key/flags', async (req, res) => {
  const { key } = req.params;

  // Check cache first
  if (sdkCache.has(key)) {
    res.setHeader('Cache-Control', 'no-cache'); // Browser should check with server (which serves from memory)
    return res.json(sdkCache.get(key));
  }

  // Simple check for server-side SDK secret if needed, 
  // OR just public client-side access based on App Key.
  // Per requirements: "GET /sdk/:applicationKey/flags"

  const app = await prisma.application.findUnique({
    where: { key },
    include: {
      flags: {
        where: { enabled: true },
        select: {
          key: true,
          enabled: true,
          displayName: true,
          description: true,
          value: true,
          type: true
        }
      }
    }
  });

  if (!app) {
    return res.status(404).json({ message: 'Application not found or invalid key' });
  }

  // Return flags as an array
  const flagsArray = app.flags.map(flag => ({
    key: flag.key,
    enabled: flag.enabled,
    displayName: flag.displayName,
    description: flag.description,
    value: flag.value,
    type: flag.type
  }));

  // Update cache
  sdkCache.set(key, flagsArray);

  res.setHeader('Cache-Control', 'no-cache');
  res.json(flagsArray);
});

export default router;
