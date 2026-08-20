import 'dotenv/config';
import {  Worker } from "bullmq";
import { redisConnection as connection, redisPublisher } from "../config/redis.config.js";
import { processScrapeJob } from "../services/scrape.service.js";
import { streamStatus } from "../types/index.js";
import { connectToDatabase } from '../config/mongose.db.js';
import { scrapeQueue as queue } from '../config/queue.config.js';
// mongoose.set('bufferCommands', false);

await connectToDatabase();

await queue.clean(0, 1000, 'failed');   // remove failed jobs
await queue.clean(0, 1000, 'paused');
// await queue.clean(0, 1000, 'stalled');
export const initScrapeWorker = () => {
    console.log("Initializing scrape worker..."); 
 const scrapeWorker = new Worker(
        "scrape-jobs",
        async (job) => {
          const { jobId, url, domain, roomId } = job.data;
          
          // Call processScrapeJob, then RAG pipeline, then emit status via Redis Pub/Sub
          const emitStatus = (status: string, message: string) => {
            const payload: streamStatus = { roomId, status, message };
            redisPublisher.publish('scrape_status_channel', JSON.stringify(payload));
          };
    
          // Run scraping and vectorizing pipeline
          await processScrapeJob(jobId, url, domain, emitStatus);
        },
        {
            connection, 
            concurrency: 5,
            lockDuration: 60000,   // increase lock time if jobs are long
            stalledInterval: 30000, // how often to check for stalled jobs
            maxStalledCount: 3,    // how many times a job can be stalled before failing
         }
      );
    
    

    scrapeWorker.on("failed", (job, err) => {
      const payload: streamStatus = { roomId: job?.data.roomId, status: 'failed', message: err.message };
      redisPublisher.publish('scrape_status_channel', JSON.stringify(payload));
      console.error(`Job ${job?.id} failed with error: ${err.message}`);
    }) 
    scrapeWorker.on("ready", () => {
      console.log("Scrape worker is ready to process jobs.");
    })
    scrapeWorker.on("completed", (job) => {
      console.log(`Job ${job.id} completed`);
    })  
}
initScrapeWorker();