import { Router } from 'express';
import { scrapeController } from '../controllers/scrape.controller.js';

const router = Router();

router.post('/', scrapeController.startScrape);
router.get('/job/:id', scrapeController.getJobStatus);

export default router;