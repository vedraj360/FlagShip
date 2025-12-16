import { Router } from 'express';
import * as appController from '../controllers/appController';
import { authenticate } from '../middleware/auth';

const router = Router();

router.use(authenticate);

router.post('/', appController.createApplication);
router.get('/', appController.getApplications);
router.get('/:id', appController.getApplication);
router.delete('/:id', appController.deleteApplication);

router.get('/:id/flags', appController.getFlags);
router.post('/:id/flags', appController.createFlag);
router.put('/:id/flags/:flagId', appController.updateFlag);
router.delete('/:id/flags/:flagId', appController.deleteFlag);

// Tags routes
router.get('/:id/tags', appController.getTags);
router.post('/:id/tags', appController.createTag);
router.put('/:id/tags/:tagId', appController.updateTag);
router.delete('/:id/tags/:tagId', appController.deleteTag);
router.post('/:id/flags/:flagId/tags', appController.updateFlagTags);
router.post('/:id/flags/bulk-tags', appController.bulkUpdateFlagsTags);

export default router;

