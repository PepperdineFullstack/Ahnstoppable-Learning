// src/hooks/useClassSocket.js
// Connects to Socket.IO, joins the class room, and wires up real-time events.
//
// Usage:
//   const { connected } = useClassSocket({ classId, setPosts });
//
// The hook patches setPosts directly so that posts, comments, and replies
// all update live without any page refresh.

import { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:4000';

export function useClassSocket({ classId, setPosts }) {
  const socketRef = useRef(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!classId) return;

    const token = localStorage.getItem('token');
    const socket = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket'],
    });
    socketRef.current = socket;

    // ── Connection lifecycle ─────────────────────────────────────────────────
    socket.on('connect',    () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));
    socket.on('connect_error', (err) => {
      console.error('[socket] connection error:', err.message);
    });

    // Join the class room once connected
    socket.on('connect', () => {
      socket.emit('joinClass', { classId });
    });

    // ── Real-time post events ────────────────────────────────────────────────
    socket.on('post:new', (post) => {
      setPosts((prev) => [...prev, { ...post, comments: [] }]);
    });

    socket.on('post:deleted', ({ postId }) => {
      setPosts((prev) => prev.filter((p) => p.id !== postId));
    });

    // ── Real-time comment events ─────────────────────────────────────────────
    socket.on('comment:new', (comment) => {
      setPosts((prev) =>
        prev.map((post) => {
          if (post.id !== comment.post_id) return post;
          return { ...post, comments: [...(post.comments ?? []), comment] };
        })
      );
    });

    socket.on('comment:deleted', ({ commentId, postId }) => {
      setPosts((prev) =>
        prev.map((post) => {
          if (post.id !== postId) return post;
          return {
            ...post,
            comments: (post.comments ?? []).filter((c) => c.id !== commentId),
          };
        })
      );
    });

    // ── Real-time reply events ───────────────────────────────────────────────
    socket.on('reply:new', (reply) => {
      setPosts((prev) =>
        prev.map((post) => ({
          ...post,
          comments: (post.comments ?? []).map((comment) => {
            if (comment.id !== reply.comment_id) return comment;
            return { ...comment, replies: [...(comment.replies ?? []), reply] };
          }),
        }))
      );
    });

    socket.on('reply:deleted', ({ replyId, commentId }) => {
      setPosts((prev) =>
        prev.map((post) => ({
          ...post,
          comments: (post.comments ?? []).map((comment) => {
            if (comment.id !== commentId) return comment;
            return {
              ...comment,
              replies: (comment.replies ?? []).filter((r) => r.id !== replyId),
            };
          }),
        }))
      );
    });

    return () => {
      socket.emit('leaveClass', { classId });
      socket.disconnect();
    };
  }, [classId, setPosts]);

  return { connected, socket: socketRef.current };
}