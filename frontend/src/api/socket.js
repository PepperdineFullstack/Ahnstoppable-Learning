// src/api/socket.js
// Single Socket.IO client instance shared across the app.
// The token is read at connect-time so it's always fresh.
 
import { io } from 'socket.io-client';
 
const socket = io(import.meta.env.VITE_API_URL ?? 'http://localhost:4000', {
  autoConnect: false,          // connect manually when entering a class
  transports: ['websocket'],
  auth: (cb) => cb({ token: localStorage.getItem('token') }),
});
 
export default socket;