import { Request, Response } from 'express';
import { dbRepository } from '../repositories/json.db.js';
import { scrapeQueue } from '../config/queue.config.js';
import { redisPublisher } from '../config/redis.config.js';


export const scrapeController = {
    startScrape: async (req: Request, res: Response) => {
        const { url, roomId } = req.body;
        if (!url || !roomId) return res.status(400).json({ error: 'URL and roomId required' });
    
        const domain = new URL(url).hostname;
        const jobId = `job_${Date.now()}`;
    
       await dbRepository.createJob({ id: jobId, url, domain, status: 'queued', roomId });
    
        // Initial status event
        redisPublisher.publish(
          'scrape_status_channel',
          JSON.stringify({ roomId, status: 'queued', message: 'Job queued' })
        );
    
        // Push into BullMQ
        await scrapeQueue.add('scrape-task', { jobId, url, domain, roomId });
    
        return res.status(202).json({ message: 'Job queued', jobId });
      },

  getJobStatus: async (req: Request, res: Response) => {
    const job = await dbRepository.findJobById(req.params.id as string);
    return job ? res.json(job) : res.status(404).json({ error: 'Not found' });
  }
};