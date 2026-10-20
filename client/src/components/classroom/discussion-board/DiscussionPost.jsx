// src/components/classroom/discussion-board/DiscussionPost.jsx
import React, { useEffect, useRef, useState } from "react";
import api from "../../../api/axios";
import QuestionsInput from "./QuestionsInput";
import QuestionsList from "./QuestionsList";
import { useClassView, PREVIEW_MESSAGE } from "../../../context/ClassViewContext";

// Fetched rows win on duplicates. A row missing from the fetch is kept only if
// it arrived over the socket while the fetch was in flight (it wasn't in
// `known`, the ids on screen when the fetch started); otherwise it was deleted.
function unionById(fetched, existing, known) {
  const seen = new Set(fetched.map((x) => x.id));
  return [...fetched, ...existing.filter((x) => !seen.has(x.id) && !known.has(x.id))];
}

function DiscussionPost({ post, setPosts, showNames, reloadKey = 0 }) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const { preview, isProfessor } = useClassView();
  // Latest comments, read when a fetch starts (see unionById).
  const commentsRef = useRef(post.comments);
  commentsRef.current = post.comments;
  // Likes waiting on the server ("c:<id>" / "r:<id>"); more clicks are ignored
  // until it answers, so a quick double-click can't race a like and an unlike.
  const pendingLikes = useRef(new Set());

  // Patch one comment in this post's list.
  function patchComments(fn) {
    setPosts((prev) => prev.map((p) => (p.id === post.id ? { ...p, comments: fn(p.comments ?? []) } : p)));
  }
  // Add the comment we just posted (or mark the live-update copy as ours).
  function upsertMine(comment) {
    patchComments((comments) => comments.some((c) => c.id === comment.id)
      ? comments.map((c) => (c.id === comment.id ? { ...c, is_mine: true } : c))
      : [...comments, { replies: [], ...comment, is_mine: true }]);
  }
  function upsertMyReply(commentId, reply) {
    patchComments((comments) => comments.map((c) => {
      if (c.id !== commentId) return c;
      const replies = c.replies ?? [];
      return {
        ...c,
        replies: replies.some((r) => r.id === reply.id)
          ? replies.map((r) => (r.id === reply.id ? { ...r, is_mine: true } : r))
          : [...replies, { ...reply, is_mine: true }],
      };
    }));
  }

  // Load comments on mount, and again after a reconnect (reloadKey).
  useEffect(() => {
    let ignore = false;
    const atStart = commentsRef.current ?? [];
    const knownComments = new Set(atStart.map((c) => c.id));
    const knownReplies = new Set(atStart.flatMap((c) => (c.replies ?? []).map((r) => r.id)));
    api
      .get(`/api/posts/${post.id}/comments`)
      .then((res) => {
        if (ignore) return;
        setPosts((prev) =>
          prev.map((p) => {
            if (p.id !== post.id) return p;
            const existing = p.comments ?? [];
            const comments = unionById(res.data, existing, knownComments).map((c) => {
              const prevC = existing.find((x) => x.id === c.id);
              return prevC
                ? { ...c, replies: unionById(c.replies ?? [], prevC.replies ?? [], knownReplies) }
                : c;
            });
            return { ...p, comments };
          })
        );
      })
      .catch((err) => console.error("Failed to load comments:", err));
    return () => { ignore = true; };
  }, [post.id, setPosts, reloadKey]);

  // Returns true once saved, so the comment box only clears then.
  async function addComment(text) {
    if (!text.trim() || submitting) return false;
    if (preview) { setError(PREVIEW_MESSAGE); return false; }
    setSubmitting(true);
    setError(null);
    try {
      const { data } = await api.post(`/api/posts/${post.id}/comments`, { content: text });
      upsertMine(data);
      return true;
    } catch (err) {
      console.error("Failed to post comment:", err);
      setError(err.response?.data?.error ?? "Couldn't post your comment.");
      return false;
    } finally {
      setSubmitting(false);
    }
  }

  // Returns { ok, error }. The reply box shows the error itself (this post's
  // error line sits under the comment box, far from a reply deep in a thread)
  // and keeps its text when the reply wasn't saved.
  async function addReply(commentId, text) {
    if (!text.trim()) return { ok: false, error: null };
    if (preview) return { ok: false, error: PREVIEW_MESSAGE };
    try {
      const { data } = await api.post(
        `/api/posts/${post.id}/comments/${commentId}/replies`,
        { content: text }
      );
      upsertMyReply(commentId, data);
      return { ok: true, error: null };
    } catch (err) {
      console.error("Failed to post reply:", err);
      return { ok: false, error: err.response?.data?.error ?? "Couldn't post your reply." };
    }
  }

  // ── Likes: flip right away, then confirm with the server (undo on failure) ─
  function patchComment(commentId, fn) {
    patchComments((cs) => cs.map((c) => (c.id === commentId ? fn(c) : c)));
  }
  function patchReply(commentId, replyId, fn) {
    patchComments((cs) => cs.map((c) => (c.id !== commentId ? c : {
      ...c, replies: (c.replies ?? []).map((r) => (r.id === replyId ? fn(r) : r)),
    })));
  }
  // Optimistic flip by `delta`; the undo reverses that delta on whatever the
  // count is by then, so live counts that arrived in between aren't overwritten.
  const flip = (liked, delta) => (x) => ({ ...x, liked_by_me: liked, like_count: Math.max(0, (x.like_count ?? 0) + delta) });
  const confirmed = (data) => (x) => ({ ...x, liked_by_me: data.liked_by_me, like_count: data.like_count });

  async function toggleLike(key, item, url, patch) {
    if (preview) { setError(PREVIEW_MESSAGE); return; }
    if (!item || pendingLikes.current.has(key)) return;
    pendingLikes.current.add(key);
    const was = !!item.liked_by_me, delta = was ? -1 : 1;
    patch(flip(!was, delta));
    try {
      const { data } = was ? await api.delete(url) : await api.put(url);
      patch(confirmed(data));
    } catch (err) {
      patch(flip(was, -delta));
      setError(err.response?.data?.error ?? "Couldn't save your like.");
    } finally {
      pendingLikes.current.delete(key);
    }
  }
  function likeComment(commentId) {
    const c = (post.comments ?? []).find((x) => x.id === commentId);
    return toggleLike(`c:${commentId}`, c, `/api/posts/${post.id}/comments/${commentId}/like`,
      (fn) => patchComment(commentId, fn));
  }
  function likeReply(commentId, replyId) {
    const r = (post.comments ?? []).find((x) => x.id === commentId)?.replies?.find((x) => x.id === replyId);
    return toggleLike(`r:${replyId}`, r, `/api/posts/${post.id}/comments/${commentId}/replies/${replyId}/like`,
      (fn) => patchReply(commentId, replyId, fn));
  }

  // ── Edit / delete (the author; the professor may also delete) ─────────────
  async function editComment(commentId, text) {
    if (preview) { setError(PREVIEW_MESSAGE); return false; }
    setError(null);
    try {
      const { data } = await api.patch(`/api/posts/${post.id}/comments/${commentId}`, { content: text });
      patchComments((cs) => cs.map((c) => (c.id === commentId ? { ...c, content: data.content, edited_at: data.edited_at } : c)));
      return true;
    } catch (err) {
      setError(err.response?.data?.error ?? "Couldn't save your edit.");
      return false;
    }
  }
  async function deleteComment(commentId) {
    if (preview) { setError(PREVIEW_MESSAGE); return; }
    setError(null);
    try {
      await api.delete(`/api/posts/${post.id}/comments/${commentId}`);
      patchComments((cs) => cs.filter((c) => c.id !== commentId));
    } catch (err) {
      setError(err.response?.data?.error ?? "Couldn't delete the comment.");
    }
  }
  async function editReply(commentId, replyId, text) {
    if (preview) { setError(PREVIEW_MESSAGE); return false; }
    setError(null);
    try {
      const { data } = await api.patch(`/api/posts/${post.id}/comments/${commentId}/replies/${replyId}`, { content: text });
      patchComments((cs) => cs.map((c) => (c.id !== commentId ? c : {
        ...c, replies: (c.replies ?? []).map((r) => (r.id === replyId ? { ...r, content: data.content, edited_at: data.edited_at } : r)),
      })));
      return true;
    } catch (err) {
      setError(err.response?.data?.error ?? "Couldn't save your edit.");
      return false;
    }
  }
  async function deleteReply(commentId, replyId) {
    if (preview) { setError(PREVIEW_MESSAGE); return; }
    setError(null);
    try {
      await api.delete(`/api/posts/${post.id}/comments/${commentId}/replies/${replyId}`);
      patchComments((cs) => cs.map((c) => (c.id !== commentId ? c : { ...c, replies: (c.replies ?? []).filter((r) => r.id !== replyId) })));
    } catch (err) {
      setError(err.response?.data?.error ?? "Couldn't delete the reply.");
    }
  }

  return (
    <div className="w-full rounded-lg shadow-md p-4 sm:p-6 border bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
      {/* Post header */}
      <div className="pb-2">
        <h1 className="std-text text-base sm:text-lg font-semibold leading-snug">
          {post.title}
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          {post.content}
        </p>
        {/* Just the professor's name: the time it was written isn't meaningful
            (discussions are often prepared before class). */}
        <p className="text-xs text-slate-400 dark:text-slate-500 mt-2">
          {post.author_name}
        </p>
      </div>

      <hr className="border-slate-200 dark:border-slate-700 my-3 sm:my-4" />

      <QuestionsInput addItem={addComment} disabled={submitting} />
      {error && <p className="mt-2 text-xs text-red-400">{error}</p>}

      <QuestionsList
        items={post.comments ?? []}
        postDate={post.post_date}
        onAddReply={addReply}
        showNames={showNames}
        canModerate={isProfessor}
        onEditComment={editComment}
        onDeleteComment={deleteComment}
        onEditReply={editReply}
        onDeleteReply={deleteReply}
        onLikeComment={likeComment}
        onLikeReply={likeReply}
      />
    </div>
  );
}

export default DiscussionPost;
