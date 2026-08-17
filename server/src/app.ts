import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import http from 'http';
import { initSocket } from './config/socket.config.js';
import indexRoutes from './routes/index.js';

const app = express();
const server = http.createServer(app);
initSocket(server);

app.use(cors({ origin: 'http://localhost:3000', methods: ['GET', 'POST'] }));
app.use(express.json());

// Mount routers cleanly
app.use('/api',indexRoutes);

server.listen(4000, () => console.log('🚀 Server listening on port 4000'));