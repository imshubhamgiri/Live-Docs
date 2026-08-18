import { Server as HTTPServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import {redisSubscriber} from '../config/redis.config.js'
import { streamStatus } from '../types/index.js';



let io: SocketIOServer | null = null;

export const initSocket = (server: HTTPServer): SocketIOServer => {
    io = new SocketIOServer(server, {
        cors: {
          // Mirror your global CORS allowance
          origin: "*", 
          methods: ["GET", "POST"],
          credentials: true
        }
      });

      io.on('connection', (socket) => {
          console.log(`Socket connected: ${socket.id}`);
  
          socket.on('join_room', (roomId: string) => {
              socket.join(roomId);
              console.log(`Socket ${socket.id} joined room: ${roomId}`);
          });
  
          socket.on('disconnect', () => {
              console.log(`Socket disconnected: ${socket.id}`);
          })
  
          socket.on('scrape_status', (data) => {
              console.log(`Received scrape status from ${socket.id}:`, data);
          })
          socket.on('connect', (id) => {
             console.log(`Socket connected: ${socket.id}`, id);
          })
      });

      redisSubscriber.subscribe('scrape_status_channel', (err, count) => {
        if(err){
            console.error('Failed to subscribe: ', err.message);
        }
      })

      redisSubscriber.on('message', (channel, message) => {
        if (channel === 'scrape_status_channel') {
            try {
              const data: streamStatus = JSON.parse(message);
              if (data.roomId) {
                io!.to(data.roomId).emit('scrape_status', data);
              }
            } catch (err) {
              console.error('Error parsing Redis pub/sub message:', err);
            }
          }
      })


    return io;
};


export const getIO = (): SocketIOServer => {
    if (!io) {
        throw new Error("Socket.io not initialized. Call initSocket first.");
    }
    return io;
}