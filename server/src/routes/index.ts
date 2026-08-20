import { chatLimiter,scrapeLimiter } from '../middleware/rate.limiter.js';
import chatRoutes from './chat.routes.js';
import scrapeRoutes from './scrape.routes.js';
import { Router } from 'express';

const router = Router();

router.use('/v1/scrape',scrapeLimiter ,scrapeRoutes);
router.use('/v1/chat',chatLimiter ,chatRoutes);

export default router;