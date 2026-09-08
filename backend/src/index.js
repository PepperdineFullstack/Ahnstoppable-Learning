// src/index.js
// Entry point – wires together Express, Socket.IO, and all route handlers.

// MUST stay the first import – db/pool.js reads DATABASE_URL at module scope,
// and ESM evaluates imported modules in source order.
import 'dotenv/config';
 
import express from 'express';
import http from 'node:http';
import { Server } from 'socket.io';
import cors from 'cors';
 
import authRoutes from './routes/auth.js';
import classRoutes from './routes/classes.js';
import postRoutes from './routes/posts.js';
import commentRoutes from './routes/comments.js';
import classroomRoutes from './routes/classroom.js';
import registerSockets from './socket/index.js';
 
const app = express();
const server = http.createServer(app);
 
// ── Socket.IO ────────────────────────────────────────────────────────────────
const io = new Server(server, {
  cors: {
    origin: process.env.CORS_ORIGIN?.split(',') ?? '*',
    methods: ['GET', 'POST'],
  }
});


app.set('io', io); // make io accessible inside route handlers via req.app.get('io')
registerSockets(io);
 
// ── Express middleware ────────────────────────────────────────────────────────
app.use(cors({ origin: process.env.CORS_ORIGIN?.split(',') ?? '*' }));
app.use(express.json());
 
// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/api/auth',                              authRoutes);
app.use('/api/classes',                           classRoutes);
app.use('/api/classes/:classId/posts',            postRoutes);
app.use('/api/posts/:postId/comments',            commentRoutes);
app.use('/api/classes/:classId',                  classroomRoutes);

app.get('/', (req, res) => {
  res.json({message: "Hello"})
});

// ── Health check ──────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => res.json({ status: 'ok' }));
 
// ── 404 handler ───────────────────────────────────────────────────────────────
app.use((_req, res) => res.status(404).json({ error: 'Not found.' }));
 
// ── Start ─────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 4000;

server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

