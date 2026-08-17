import chatRoutes from './chat.routes.js';
import scrapeRoutes from './scrape.routes.js';
import { Router } from 'express';

const router = Router();

router.use('/v1/scrape', scrapeRoutes);
router.use('/v1/chat', chatRoutes);

export default router;