// src/socket/index.js
// Manages Socket.IO connections.
//
// Flow:
//   1. Client connects and sends { token } in the auth handshake.
//   2. Server verifies the JWT – invalid tokens are disconnected immediately.
//   3. Client joins a class room by emitting  joinClass({ classId }).
//   4. From that point on, all post / comment / reply events are broadcast to
//      everyone in that room from the REST handlers via io.to(`class:${classId}`).emit(…).

import jwt  from 'jsonwebtoken';
import pool from '../db/pool.js';

export default function registerSocketHandlers(io) {
  // ── Auth middleware ──────────────────────────────────────────────────────────
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error('Authentication required.'));

    try {
      const payload = jwt.verify(token, process.env.JWT_SECRET);
      socket.user = payload; // { id, email, role }
      next();
    } catch {
      next(new Error('Invalid or expired token.'));
    }
  });

  // ── Connection handler ───────────────────────────────────────────────────────
  io.on('connection', (socket) => {
    console.log(`[socket] user ${socket.user.id} connected (${socket.id})`);

    // Client emits this after navigating to a class page
    socket.on('joinClass', async ({ classId }) => {
      if (!classId) return;

      // Verify the user is actually a member before letting them in
      try {
        const { rows } = await pool.query(
          `SELECT 1 FROM class_members WHERE user_id = $1 AND class_id = $2`,
          [socket.user.id, classId]
        );
        if (rows.length === 0) {
          socket.emit('error', 'You are not enrolled in this class.');
          return;
        }
      } catch (err) {
        console.error('[socket] DB error in joinClass:', err);
        socket.emit('error', 'Server error.');
        return;
      }

      // Leave any previously joined class rooms (base and role rooms)
      for (const room of socket.rooms) {
        if (room !== socket.id && room.startsWith('class:')) {
          socket.leave(room);
        }
      }

      // Base room gets role-neutral events; the role room gets the
      // masked/unmasked variants of comment:new / reply:new.
      const roleRoom = socket.user.role === 'professor' ? 'professors' : 'students';
      socket.join(`class:${classId}`);
      socket.join(`class:${classId}:${roleRoom}`);
      console.log(`[socket] user ${socket.user.id} joined class:${classId} (${roleRoom})`);
      socket.emit('joinedClass', { classId });
    });

    socket.on('leaveClass', ({ classId }) => {
      socket.leave(`class:${classId}`);
      socket.leave(`class:${classId}:professors`);
      socket.leave(`class:${classId}:students`);
    });

    socket.on('disconnect', () => {
      console.log(`[socket] user ${socket.user.id} disconnected (${socket.id})`);
    });
  });
};