// src/hooks/useClassSocket.js
// Joins the class room on the SHARED socket (api/socket.js) and wires up
// real-time discussion events. Other components (e.g. UnderstandCheck)
// listen on the same connection, so cleanup only removes THIS hook's
// handlers – never blanket socket.off(event).
//
// Usage:
//   const { connected } = useClassSocket({ classId, setPosts });

import { useEffect, useState } from 'react';
import socket from '../api/socket';

export function useClassSocket({ classId, setPosts }) {
  const [connected, setConnected] = useState(socket.connected);

  useEffect(() => {
    if (!classId) return;

    // ── Named handlers so cleanup can remove exactly these ───────────────────
    const onConnect = () => {
      setConnected(true);
      socket.emit('joinClass', { classId });
    };
    const onDisconnect = () => setConnected(false);
    const onConnectError = (err) => {
      console.error('[socket] connection error:', err.message);
    };

    const onPostNew = (post) => {
      setPosts((prev) => [...prev, { ...post, comments: [] }]);
    };

    const onPostDeleted = ({ postId }) => {
      setPosts((prev) => prev.filter((p) => p.id !== postId));
    };

    const onCommentNew = (comment) => {
      setPosts((prev) =>
        prev.map((post) => {
          if (post.id !== comment.post_id) return post;
          return { ...post, comments: [...(post.comments ?? []), comment] };
        })
      );
    };

    const onCommentDeleted = ({ commentId, postId }) => {
      setPosts((prev) =>
        prev.map((post) => {
          if (post.id !== postId) return post;
          return {
            ...post,
            comments: (post.comments ?? []).filter((c) => c.id !== commentId),
          };
        })
      );
    };

    const onReplyNew = (reply) => {
      setPosts((prev) =>
        prev.map((post) => ({
          ...post,
          comments: (post.comments ?? []).map((comment) => {
            if (comment.id !== reply.comment_id) return comment;
            return { ...comment, replies: [...(comment.replies ?? []), reply] };
          }),
        }))
      );
    };

    const onReplyDeleted = ({ replyId, commentId }) => {
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
    };

    socket.on('connect',         onConnect);
    socket.on('disconnect',      onDisconnect);
    socket.on('connect_error',   onConnectError);
    socket.on('post:new',        onPostNew);
    socket.on('post:deleted',    onPostDeleted);
    socket.on('comment:new',     onCommentNew);
    socket.on('comment:deleted', onCommentDeleted);
    socket.on('reply:new',       onReplyNew);
    socket.on('reply:deleted',   onReplyDeleted);

    // Already connected (e.g. switching classes): join immediately.
    // Otherwise open the shared connection – onConnect joins the room.
    if (socket.connected) {
      socket.emit('joinClass', { classId });
    } else {
      socket.connect();
    }

    return () => {
      socket.emit('leaveClass', { classId });
      socket.off('connect',         onConnect);
      socket.off('disconnect',      onDisconnect);
      socket.off('connect_error',   onConnectError);
      socket.off('post:new',        onPostNew);
      socket.off('post:deleted',    onPostDeleted);
      socket.off('comment:new',     onCommentNew);
      socket.off('comment:deleted', onCommentDeleted);
      socket.off('reply:new',       onReplyNew);
      socket.off('reply:deleted',   onReplyDeleted);
      socket.disconnect();
    };
  }, [classId, setPosts]);

  return { connected, socket };
}
