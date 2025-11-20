import { Router } from 'express';
import prisma from '../prismaClient';
import { apiLimiter } from '../middleware/rateLimit';

const router = Router();

router.get('/:key/flags', apiLimiter, async (req, res) => {
  const { key } = req.params;

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

  // Transform array to object for easier O(1) lookup in clients
  const flagsMap = app.flags.reduce((acc, flag) => {
    acc[flag.key] = {
      enabled: flag.enabled,
      displayName: flag.displayName,
      description: flag.description,
      value: flag.value,
      type: flag.type
    };
    return acc;
  }, {} as Record<string, any>);

  res.json(flagsMap);
});

export default router;
