// src/socket/emit.js
// Broadcast a class event with role-appropriate payloads. Sockets join
// `class:<id>:<role>` in joinClass, so each socket receives exactly one copy.

import { maskForStudent } from '../utils/anonymity.js';

export function emitToClass(io, classId, event, payload) {
  io.to(`class:${classId}:professor`).emit(event, payload);
  io.to(`class:${classId}:student`).emit(event, maskForStudent(payload));
}

// Pull a user's open sockets out of a class's rooms, e.g. when a student is
// removed from the roster, so they stop receiving its live updates.
export async function removeFromClassRooms(io, classId, userId) {
  const rooms = [`class:${classId}`, `class:${classId}:professor`, `class:${classId}:student`];
  const sockets = await io.in(`class:${classId}`).fetchSockets();
  for (const s of sockets) {
    if (s.data.user?.id === userId) rooms.forEach((room) => s.leave(room));
  }
}
