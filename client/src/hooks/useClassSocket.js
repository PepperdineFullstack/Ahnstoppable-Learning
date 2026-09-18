// src/hooks/useClassSocket.js
// Subscribes to real-time post / comment / reply events on the shared socket
// and patches the `posts` state in place. Connection and room membership are
// handled by useClassRoom (called in ClassDashboard); this hook only listens.
//
// Usage:
//   useClassSocket({ classId, setPosts, date });

import { useEffect } from 'react';
import socket from '../api/socket';

export function useClassSocket({ classId, setPosts, date }) {
  useEffect(() => {
    if (!classId) return;

    // ── Posts ────────────────────────────────────────────────────────────────
    const onPostNew = (post) => {
      // The feed shows one day at a time; ignore posts for other days.
      if (post.post_date !== date) return;
      setPosts((prev) => [...prev, { ...post, comments: [] }]);
    };

    const onPostDeleted = ({ postId }) => {
      setPosts((prev) => prev.filter((p) => p.id !== postId));
    };

    // ── Comments ─────────────────────────────────────────────────────────────
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
          return { ...post, comments: (post.comments ?? []).filter((c) => c.id !== commentId) };
        })
      );
    };

    // ── Replies ──────────────────────────────────────────────────────────────
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
            return { ...comment, replies: (comment.replies ?? []).filter((r) => r.id !== replyId) };
          }),
        }))
      );
    };

    const handlers = [
      ['post:new',        onPostNew],
      ['post:deleted',    onPostDeleted],
      ['comment:new',     onCommentNew],
      ['comment:deleted', onCommentDeleted],
      ['reply:new',       onReplyNew],
      ['reply:deleted',   onReplyDeleted],
    ];
    for (const [event, fn] of handlers) socket.on(event, fn);

    return () => {
      // Remove only our handlers; other components share this socket.
      for (const [event, fn] of handlers) socket.off(event, fn);
    };
  }, [classId, setPosts, date]);
}
