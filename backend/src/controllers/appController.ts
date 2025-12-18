import { Response } from 'express';
import prisma from '../prismaClient';
import { AuthRequest } from '../middleware/auth';
import crypto from 'crypto';
import { invalidateCache } from '../routes/sdk';

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

  const flags = await prisma.flag.findMany({
    where: { applicationId: req.params.id },
    include: { tags: true },
    orderBy: { createdAt: 'asc' }
  });
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.json(flags);
};

export const createFlag = async (req: AuthRequest, res: Response) => {
  const app = await prisma.application.findUnique({ where: { id: req.params.id } });
  if (!app || (app.createdById !== req.user!.userId && req.user!.role !== 'ADMIN')) return res.status(403).send();

  // Validate required fields
  if (!req.body.key || !req.body.key.trim()) {
    return res.status(400).json({ message: 'Key is required' });
  }

  // Value is mandatory
  if (req.body.value === null || req.body.value === undefined || String(req.body.value).trim() === '') {
    return res.status(400).json({ message: 'Value is required' });
  }

  // Validate flag value length and JSON
  if (req.body.value.length > 10000) {
    return res.status(400).json({ message: 'Flag value exceeds maximum length of 10000 characters' });
  }

  if (req.body.type === 'JSON') {
    try {
      JSON.parse(req.body.value);
    } catch (e) {
      return res.status(400).json({ message: 'Invalid JSON value' });
    }
  }

  try {
    const validTagIds: string[] = Array.isArray(req.body.tagIds) ? req.body.tagIds : [];

    const flag = await prisma.flag.create({
      data: {
        applicationId: req.params.id,
        key: req.body.key,
        displayName: req.body.displayName,
        description: req.body.description,
        enabled: req.body.enabled,
        value: req.body.value,
        type: req.body.type || 'BOOLEAN',
        tags: {
          connect: validTagIds.map(id => ({ id }))
        }
      },
      include: { tags: true }
    });
    res.json(flag);
    invalidateCache(app.key);
  } catch (e) {
    res.status(400).json({ message: 'Key already exists or invalid' });
  }
};

export const updateFlag = async (req: AuthRequest, res: Response) => {
  // Check flag exists and access
  const flag = await prisma.flag.findUnique({ where: { id: req.params.flagId }, include: { application: true } });
  if (!flag || (flag.application.createdById !== req.user!.userId && req.user!.role !== 'ADMIN')) return res.status(403).send();

  // Value is mandatory
  if (req.body.value === null || req.body.value === undefined || String(req.body.value).trim() === '') {
    return res.status(400).json({ message: 'Value is required' });
  }

  // Validate flag value length and JSON
  if (req.body.value.length > 10000) {
    return res.status(400).json({ message: 'Flag value exceeds maximum length of 10000 characters' });
  }

  if (req.body.type === 'JSON') {
    try {
      JSON.parse(req.body.value);
    } catch (e) {
      return res.status(400).json({ message: 'Invalid JSON value' });
    }
  }

  const validTagIds: string[] = Array.isArray(req.body.tagIds) ? req.body.tagIds : [];

  const updated = await prisma.flag.update({
    where: { id: req.params.flagId },
    data: {
      displayName: req.body.displayName,
      description: req.body.description,
      enabled: req.body.enabled,
      value: req.body.value,
      type: req.body.type,
      tags: {
        set: validTagIds.map(id => ({ id }))
      }
    },
    include: { tags: true }
  });
  res.json(updated);
  invalidateCache(flag.application.key);
};

export const deleteFlag = async (req: AuthRequest, res: Response) => {
  const flag = await prisma.flag.findUnique({ where: { id: req.params.flagId }, include: { application: true } });
  if (!flag || (flag.application.createdById !== req.user!.userId && req.user!.role !== 'ADMIN')) return res.status(403).send();

  await prisma.flag.delete({ where: { id: req.params.flagId } });
  res.json({ message: 'Deleted' });
  invalidateCache(flag.application.key);
};

// Tags
export const getTags = async (req: AuthRequest, res: Response) => {
  const app = await prisma.application.findUnique({ where: { id: req.params.id } });
  if (!app || (app.createdById !== req.user!.userId && req.user!.role !== 'ADMIN')) return res.status(403).send();

  const tags = await prisma.tag.findMany({
    where: { applicationId: req.params.id },
    orderBy: { createdAt: 'asc' }
  });
  res.json(tags);
};

export const createTag = async (req: AuthRequest, res: Response) => {
  const app = await prisma.application.findUnique({ where: { id: req.params.id } });
  if (!app || (app.createdById !== req.user!.userId && req.user!.role !== 'ADMIN')) return res.status(403).send();

  if (!req.body.name || !req.body.name.trim()) {
    return res.status(400).json({ message: 'Tag name is required' });
  }

  try {
    const tag = await prisma.tag.create({
      data: {
        applicationId: req.params.id,
        name: req.body.name.trim(),
        color: req.body.color || '#6366f1'
      }
    });
    res.status(201).json(tag);
  } catch (e) {
    res.status(400).json({ message: 'Tag name already exists' });
  }
};

export const deleteTag = async (req: AuthRequest, res: Response) => {
  const tag = await prisma.tag.findUnique({
    where: { id: req.params.tagId },
    include: { application: true }
  });
  if (!tag || (tag.application.createdById !== req.user!.userId && req.user!.role !== 'ADMIN')) return res.status(403).send();

  await prisma.tag.delete({ where: { id: req.params.tagId } });
  res.json({ message: 'Deleted' });
};

export const updateTag = async (req: AuthRequest, res: Response) => {
  const tag = await prisma.tag.findUnique({
    where: { id: req.params.tagId },
    include: { application: true }
  });
  if (!tag || (tag.application.createdById !== req.user!.userId && req.user!.role !== 'ADMIN')) return res.status(403).send();

  if (!req.body.name || !req.body.name.trim()) {
    return res.status(400).json({ message: 'Tag name is required' });
  }

  try {
    const updated = await prisma.tag.update({
      where: { id: req.params.tagId },
      data: {
        name: req.body.name.trim(),
        color: req.body.color || tag.color
      }
    });
    res.json(updated);
  } catch (e) {
    res.status(400).json({ message: 'Tag name already exists' });
  }
};

export const updateFlagTags = async (req: AuthRequest, res: Response) => {
  const flag = await prisma.flag.findUnique({
    where: { id: req.params.flagId },
    include: { application: true }
  });
  if (!flag || (flag.application.createdById !== req.user!.userId && req.user!.role !== 'ADMIN')) return res.status(403).send();

  const tagIds: string[] = req.body.tagIds || [];

  // Verify all tags belong to this application
  const validTags = await prisma.tag.findMany({
    where: {
      id: { in: tagIds },
      applicationId: flag.applicationId
    }
  });

  const updated = await prisma.flag.update({
    where: { id: req.params.flagId },
    data: {
      tags: {
        set: validTags.map(t => ({ id: t.id }))
      }
    },
    include: { tags: true }
  });

  res.json(updated);
  invalidateCache(flag.application.key);
};

export const bulkUpdateFlagsTags = async (req: AuthRequest, res: Response) => {
  const app = await prisma.application.findUnique({ where: { id: req.params.id } });
  if (!app || (app.createdById !== req.user!.userId && req.user!.role !== 'ADMIN')) return res.status(403).send();

  const flagIds: string[] = req.body.flagIds || [];
  const tagIds: string[] = req.body.tagIds || [];
  const action: 'add' | 'remove' | 'set' = req.body.action || 'add';

  if (flagIds.length === 0) {
    return res.status(400).json({ message: 'No flags selected' });
  }

  // Verify all tags belong to this application
  const validTags = await prisma.tag.findMany({
    where: {
      id: { in: tagIds },
      applicationId: app.id
    }
  });

  // Update each flag
  const updates = await Promise.all(flagIds.map(async (flagId) => {
    const flag = await prisma.flag.findUnique({
      where: { id: flagId },
      include: { tags: true }
    });

    if (!flag || flag.applicationId !== app.id) return null;

    let newTagIds: string[];
    if (action === 'set') {
      newTagIds = validTags.map(t => t.id);
    } else if (action === 'remove') {
      newTagIds = flag.tags.filter(t => !tagIds.includes(t.id)).map(t => t.id);
    } else {
      // add
      const existingIds = new Set(flag.tags.map(t => t.id));
      validTags.forEach(t => existingIds.add(t.id));
      newTagIds = Array.from(existingIds);
    }

    return prisma.flag.update({
      where: { id: flagId },
      data: {
        tags: {
          set: newTagIds.map(id => ({ id }))
        }
      },
      include: { tags: true }
    });
  }));

  const updatedFlags = updates.filter(Boolean);
  res.json({ updated: updatedFlags.length, flags: updatedFlags });
  invalidateCache(app.key);
};

