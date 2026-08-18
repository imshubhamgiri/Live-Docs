import {Redis} from 'ioredis';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

// Standard connection for BullMQ
export const redisConnection = new Redis(REDIS_URL, {
  maxRetriesPerRequest: null,
});

// Dedicated publisher and subscriber connections (Redis requires separate clients for pub/sub)
export const redisPublisher = new Redis(REDIS_URL);
export const redisSubscriber = new Redis(REDIS_URL);