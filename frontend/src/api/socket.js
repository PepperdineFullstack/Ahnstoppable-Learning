// src/api/socket.js
// Single Socket.IO client instance shared across the app.
// The token is read at connect-time so it's always fresh.
 
import { io } from 'socket.io-client';
import { API_URL } from './axios';

const socket = io(API_URL, {
  autoConnect: false,          // connect manually when entering a class
  transports: ['websocket'],
  auth: (cb) => cb({ token: localStorage.getItem('token') }),
});

export default socket;