// src/socket/index.js
// Manages Socket.IO connections.
//
// Flow:
//   1. Client connects and sends { token } in the auth handshake.
//   2. Server verifies the JWT – invalid tokens are disconnected immediately.
//   3. Client joins a class by emitting joinClass({ classId }). After a
//      membership check the socket is placed in two rooms:
//        class:<id>          – everyone (used for delete events, which carry only IDs)
//        class:<id>:<role>   – 'professor' (the class's own professor only) or
//                              'student' (everyone else), used by emitToClass
//                              so only the owner receives unmasked payloads
//   4. REST handlers broadcast via socket/emit.js.

import { classAccess, isId, verifyToken } from '../middleware/auth.js';

// Each joinClass runs a DB query, so cap how often one socket may send it.
const JOIN_WINDOW_MS = 10 * 1000;
const JOINS_PER_WINDOW = 5;

export default function registerSocketHandlers(io) {
  // ── Auth middleware ──────────────────────────────────────────────────────────
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error('Authentication required.'));

    try {
      socket.user = verifyToken(token); // { id, email, name, role }
      socket.data.user = socket.user;   // also visible to fetchSockets()
      next();
    } catch {
      next(new Error('Invalid or expired token.'));
    }
  });

  // ── Connection handler ───────────────────────────────────────────────────────
  io.on('connection', (socket) => {
    console.log(`[socket] user ${socket.user.id} connected (${socket.id})`);
    let recentJoins = [];

    socket.on('joinClass', async ({ classId } = {}) => {
      if (!isId(classId)) return;

      const now = Date.now();
      recentJoins = recentJoins.filter((t) => now - t < JOIN_WINDOW_MS);
      if (recentJoins.length >= JOINS_PER_WINDOW) return;
      recentJoins.push(now);

      let access;
      try {
        access = await classAccess(socket.user.id, Number(classId));
        if (!access) {
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

      const roleRoom = access.isOwner ? 'professor' : 'student';
      socket.join([`class:${classId}`, `class:${classId}:${roleRoom}`]);
      console.log(`[socket] user ${socket.user.id} joined class:${classId}`);
      socket.emit('joinedClass', { classId });
    });

    socket.on('leaveClass', ({ classId } = {}) => {
      socket.leave(`class:${classId}`);
      socket.leave(`class:${classId}:professor`);
      socket.leave(`class:${classId}:student`);
    });

    socket.on('disconnect', () => {
      console.log(`[socket] user ${socket.user.id} disconnected (${socket.id})`);
    });
  });
}
