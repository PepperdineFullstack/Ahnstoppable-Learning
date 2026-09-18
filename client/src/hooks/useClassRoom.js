// src/hooks/useClassRoom.js
// Owns the shared socket's lifecycle for a class page: connect, join the class
// room, and tear down on unmount. Call it ONCE per class page (ClassDashboard).
// Other components subscribe to events on the same singleton (see useClassSocket
// and UnderstandCheck) and must remove exactly the handlers they added.

import { useEffect, useState } from 'react';
import socket from '../api/socket';

export function useClassRoom(classId) {
  const [connected, setConnected] = useState(socket.connected);

  useEffect(() => {
    if (!classId) return;

    const onConnect      = () => { setConnected(true); socket.emit('joinClass', { classId }); };
    const onDisconnect   = () => setConnected(false);
    const onError        = (msg) => console.warn('[socket] error:', msg);
    const onConnectError = (err) => console.warn('[socket] connect_error:', err.message);

    socket.on('connect',       onConnect);
    socket.on('disconnect',    onDisconnect);
    socket.on('error',         onError);
    socket.on('connect_error', onConnectError);

    if (socket.connected) onConnect();
    else socket.connect();

    return () => {
      socket.emit('leaveClass', { classId });
      socket.off('connect',       onConnect);
      socket.off('disconnect',    onDisconnect);
      socket.off('error',         onError);
      socket.off('connect_error', onConnectError);
      socket.disconnect();
    };
  }, [classId]);

  return { connected };
}
