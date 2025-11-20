import { Response } from 'express';
import prisma from '../prismaClient';
import { AuthRequest } from '../middleware/auth';
import crypto from 'crypto';

// Helper to check access
const checkAppAccess = async (userId: string, appId: string) => {
  const app = await prisma.application.findUnique({ where: { id: appId } });
  if (!app) return null;
  // In this simple model, only creator or admin accesses.
  // Assuming request user is checked before calling this.
  return app;
};

export const createApplication = async (req: AuthRequest, res: Response) => {
  const { name } = req.body;
  const apiKey = crypto.randomBytes(16).toString('hex');

  const app = await prisma.application.create({
    data: {
      name,
      key: apiKey,
      createdById: req.user!.userId,
    },
  });
  res.status(201).json(app);
};

export const getApplications = async (req: AuthRequest, res: Response) => {
  const apps = await prisma.application.findMany({
    where: { createdById: req.user!.userId },
    include: { _count: { select: { flags: true } } },
    orderBy: { updatedAt: 'desc' }
  });
  res.json(apps);
};

export const getApplication = async (req: AuthRequest, res: Response) => {
  const app = await checkAppAccess(req.user!.userId, req.params.id);
  if (!app || (app.createdById !== req.user!.userId && req.user!.role !== 'ADMIN')) {
    return res.status(404).json({ message: 'Application not found' });
  }
  res.json(app);
};

export const deleteApplication = async (req: AuthRequest, res: Response) => {
  const app = await prisma.application.findUnique({ where: { id: req.params.id } });
  if (!app || (app.createdById !== req.user!.userId && req.user!.role !== 'ADMIN')) return res.status(403).send();

  // Transactional delete
  await prisma.$transaction([
    prisma.flag.deleteMany({ where: { applicationId: app.id } }),
    prisma.application.delete({ where: { id: app.id } })
  ]);
  res.json({ message: 'Deleted' });
};

// Flags
export const getFlags = async (req: AuthRequest, res: Response) => {
  // Ownership check simplified for brevity, in real app use middleware
  const app = await prisma.application.findUnique({ where: { id: req.params.id } });
  if (!app || (app.createdById !== req.user!.userId && req.user!.role !== 'ADMIN')) return res.status(403).send();

  const flags = await prisma.flag.findMany({ where: { applicationId: req.params.id }, orderBy: { createdAt: 'asc' } });
  res.json(flags);
};

export const createFlag = async (req: AuthRequest, res: Response) => {
  const app = await prisma.application.findUnique({ where: { id: req.params.id } });
  if (!app || (app.createdById !== req.user!.userId && req.user!.role !== 'ADMIN')) return res.status(403).send();

  try {
    const flag = await prisma.flag.create({
      data: {
        applicationId: req.params.id,
        key: req.body.key,
        displayName: req.body.displayName,
        description: req.body.description,
        enabled: req.body.enabled,
        value: req.body.value,
        type: req.body.type || 'BOOLEAN'
      }
    });
    res.status(201).json(flag);
  } catch (e) {
    res.status(400).json({ message: 'Key already exists or invalid' });
  }
};

export const updateFlag = async (req: AuthRequest, res: Response) => {
  // Check flag exists and access
  const flag = await prisma.flag.findUnique({ where: { id: req.params.flagId }, include: { application: true } });
  if (!flag || (flag.application.createdById !== req.user!.userId && req.user!.role !== 'ADMIN')) return res.status(403).send();

  const updated = await prisma.flag.update({
    where: { id: req.params.flagId },
    data: {
      displayName: req.body.displayName,
      description: req.body.description,
      enabled: req.body.enabled,
      value: req.body.value,
      type: req.body.type
    }
  });
  res.json(updated);
};

export const deleteFlag = async (req: AuthRequest, res: Response) => {
  const flag = await prisma.flag.findUnique({ where: { id: req.params.flagId }, include: { application: true } });
  if (!flag || (flag.application.createdById !== req.user!.userId && req.user!.role !== 'ADMIN')) return res.status(403).send();

  await prisma.flag.delete({ where: { id: req.params.flagId } });
  res.json({ message: 'Deleted' });
};
