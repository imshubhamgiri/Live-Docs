import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import http from 'http';
import { initSocket } from './config/socket.config.js';
import indexRoutes from './routes/index.js';
import { connectToDatabase } from './config/mongose.db.js';
import mongoose from 'mongoose';
import { globalLimiter } from './middleware/rate.limitter.js';
import { registerShutdownHandlers } from './utlis/gracefulShutdown.js';
import { scrapeQueue } from './config/queue.config.js';
import { redisConnection } from './config/redis.config.js';
import helmet from 'helmet';
await connectToDatabase();

const app = express();
app.use(helmet());
const server = http.createServer(app);
const io = initSocket(server);

app.use(globalLimiter);
app.use(cors({ origin: 'http://localhost:3000', methods: ['GET', 'POST'] }));
app.use(express.json());

app.use('/api', indexRoutes);

app.get('/health', async (req, res) => {
  const dbStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
  res.status(200).json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    database: dbStatus,
  });
});

// --- Graceful Shutdown ---

registerShutdownHandlers({
    server,
    socketServer: io,
    queues: [scrapeQueue], // Add your BullMQ queues here if you have any
    queueConnection: redisConnection, // Add your BullMQ queue connection here if you have one
    redisClient: undefined // Add your Redis client here if you have one
})

process.on('unhandledRejection', (reason) => {
    console.error('Unhandled promise rejection:', reason);
  });
  process.on('uncaughtException', (error) => {
    console.error('Uncaught exception:', error);
  });

 
server.listen(4000, () => console.log('Server listening on port 4000'));