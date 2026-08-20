import { Queue } from 'bullmq';
import { Redis } from 'ioredis';
import { Server } from 'http';
import mongoose from 'mongoose';

interface ShutdownDependencies {
    server: Server;
    socketServer?: any; // Replace 'any' with your specific Socket type (e.g., Server from 'socket.io')
    queues?: Queue[];
    queueConnection?: Redis;
    redisClient?: Redis; // Your main application Redis client (if separate)
  }

const TIMEOUT_MS = 10000;
let isShuttingDown = false;

// Export a setup function that accepts your server resources
export function registerShutdownHandlers({
    server,
    socketServer,
    queues,
    queueConnection,
    redisClient
}: ShutdownDependencies) {

    async function gracefulShutdown(term: string) {
        // If already shutting down, ignore or force immediate kill
        if (isShuttingDown) {
            console.log(`[SHUTDOWN] Received ${term} again, forcing immediate exit.`);
            process.exit(1);
        }

        isShuttingDown = true;
        console.log(`[SHUTDOWN] Received ${term}, starting graceful shutdown...`);

        const forceExitTimeout = setTimeout(() => {
            console.error('[SHUTDOWN] Forced shutdown executed due to timeout.');
            process.exit(1);
        }, TIMEOUT_MS);

        try {
            // 1. Close WebSockets (Note: This internally begins closing the HTTP server)
            if (socketServer) {
                console.log('[SHUTDOWN] Closing socket connections...');
                socketServer.close();
            }

            // 2. Pause and Close all BullMQ Queues
            if (queues && queues.length > 0) {
                console.log('[SHUTDOWN] Closing background queues...');
                await Promise.all(queues.map(queue => queue.close())); // ✅ Only close the local connection
              }

            // 3. Safely handle the HTTP Server closure
            if (server) {
                console.log('[SHUTDOWN] Closing HTTP server...');
                await new Promise<void>((resolve, reject) => {
                    server.close((err: any) => {
                        if (err) {
                            // If Socket.io already closed it, ignore the error and proceed cleanly
                            if (err.code === 'ERR_SERVER_NOT_RUNNING') {
                                console.log('[SHUTDOWN] HTTP server was already closed by Socket.io.');
                                return resolve();
                            }
                            return reject(err);
                        }
                        console.log('[SHUTDOWN] HTTP server closed.');
                        resolve();
                    });
                });
            }

            // 4. Close MongoDB connection
            if (mongoose?.connection?.readyState !== 0) {
                console.log('[SHUTDOWN] Closing MongoDB connection...');
                await mongoose.connection.close();
            }

            // 5. Close Queue Redis Connection cleanly
            if (queueConnection && queueConnection.status !== 'end') {
                console.log('[SHUTDOWN] Closing Queue Redis connection...');
                await queueConnection.quit();
            }
            
            // 6. Close Main App Redis Connection
            if (redisClient && redisClient !== queueConnection && redisClient.status !== 'end') {
                console.log('[SHUTDOWN] Closing App Redis connection...');
                await redisClient.quit();
            }

            console.log('[SHUTDOWN] Graceful shutdown completed successfully.');
            clearTimeout(forceExitTimeout);
            process.exit(0);

        } catch (error) {
            console.error('[SHUTDOWN] Error during shutdown:', error);
            clearTimeout(forceExitTimeout);
            process.exit(1);
        }
    }

    // Register listeners inside the initialization function
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
}