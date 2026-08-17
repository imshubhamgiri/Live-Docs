import { Server as HTTPServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';




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
    return io;
};