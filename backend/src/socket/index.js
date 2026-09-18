// src/socket/index.js
// Manages Socket.IO connections.
//
// Flow:
//   1. Client connects and sends { token } in the auth handshake.
//   2. Server verifies the JWT – invalid tokens are disconnected immediately.
//   3. Client joins a class by emitting joinClass({ classId }). After a
//      membership check the socket is placed in two rooms:
//        class:<id>          – everyone (used for delete events, which carry only IDs)
//        class:<id>:<role>   – 'professor' or 'student' (used by emitToClass so
//                              students receive masked payloads)
//   4. REST handlers broadcast via socket/emit.js.

import jwt from 'jsonwebtoken';
import { isClassMember } from '../middleware/auth.js';

export default function registerSocketHandlers(io) {
  // ── Auth middleware ──────────────────────────────────────────────────────────
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error('Authentication required.'));

    try {
      const payload = jwt.verify(token, process.env.JWT_SECRET);
      socket.user = payload; // { id, email, name, role }
      next();
    } catch {
      next(new Error('Invalid or expired token.'));
    }
  });

  // ── Connection handler ───────────────────────────────────────────────────────
  io.on('connection', (socket) => {
    console.log(`[socket] user ${socket.user.id} connected (${socket.id})`);

    socket.on('joinClass', async ({ classId } = {}) => {
      if (!/^\d+$/.test(String(classId))) return;

      try {
        if (!(await isClassMember(socket.user.id, classId))) {
          socket.emit('error', 'You are not enrolled in this class.');
          return;
        }
      } catch (err) {
        console.error('[socket] DB error in joinClass:', err);
        socket.emit('error', 'Server error.');
        return;
      }

      // Leave any previously joined class rooms (both the shared and role rooms)
      for (const room of socket.rooms) {
        if (room !== socket.id && room.startsWith('class:')) {
          socket.leave(room);
        }
      }

      socket.join([`class:${classId}`, `class:${classId}:${socket.user.role}`]);
      console.log(`[socket] user ${socket.user.id} joined class:${classId}`);
      socket.emit('joinedClass', { classId });
    });

    socket.on('leaveClass', ({ classId } = {}) => {
      socket.leave(`class:${classId}`);
      socket.leave(`class:${classId}:${socket.user.role}`);
    });

    socket.on('disconnect', () => {
      console.log(`[socket] user ${socket.user.id} disconnected (${socket.id})`);
    });
  });
}
