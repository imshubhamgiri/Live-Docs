// queue.config.ts
import { Queue } from "bullmq";
import { redisConnection as connection } from "./redis.config.js";

export const scrapeQueue = new Queue("scrape-jobs", { connection });

