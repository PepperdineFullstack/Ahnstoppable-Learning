// src/socket/emit.js
// Broadcast a class event with role-appropriate payloads. Sockets join
// `class:<id>:<role>` in joinClass, so each socket receives exactly one copy.

import { maskForStudent } from '../utils/anonymity.js';

export function emitToClass(io, classId, event, payload) {
  io.to(`class:${classId}:professor`).emit(event, payload);
  io.to(`class:${classId}:student`).emit(event, maskForStudent(payload));
}
