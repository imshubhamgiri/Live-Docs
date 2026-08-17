import {  Worker } from "bullmq";
import { redisConnection as connection, redisPublisher } from "../config/redis.config.js";
import { processScrapeJob } from "../services/scrape.service.js";
import { streamStatus } from "../types/index.js";




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
        { connection, concurrency: 5 }
      );
    
    
    scrapeWorker.on("completed", (job) => {
      console.log(`Job ${job.id} completed`);
    })  
}
initScrapeWorker();