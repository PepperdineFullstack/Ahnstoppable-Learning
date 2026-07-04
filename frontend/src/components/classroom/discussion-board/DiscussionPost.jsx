// src/components/classroom/discussion-board/DiscussionPost.jsx
import React, { useEffect, useState } from "react";
import api from "../../../api/axios";
import QuestionsInput from "./QuestionsInput";
import QuestionsList from "./QuestionsList";

function DiscussionPost({ post, setPosts, showNames }) {
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    api
      .get(`/api/posts/${post.id}/comments`)
      .then((res) => {
        setPosts((prev) =>
          prev.map((p) =>
            p.id === post.id ? { ...p, comments: res.data } : p
          )
        );
      })
      .catch((err) => console.error("Failed to load comments:", err));
  }, [post.id]); // eslint-disable-line react-hooks/exhaustive-deps

  async function addComment(text) {
    if (!text.trim() || submitting) return;
    setSubmitting(true);
    try {
      await api.post(`/api/posts/${post.id}/comments`, { content: text });
    } catch (err) {
      console.error("Failed to post comment:", err);
    } finally {
      setSubmitting(false);
    }
  }

  async function addReply(commentId, text) {
    if (!text.trim()) return;
    try {
      // Same pattern: socket event 'reply:new' handles the state update.
      await api.post(
        `/api/posts/${post.id}/comments/${commentId}/replies`,
        { content: text }
      );
    } catch (err) {
      console.error("Failed to post reply:", err);
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
        <p className="text-xs text-slate-400 dark:text-slate-500 mt-2">
          {post.author_name} ·{" "}
          {new Date(post.created_at).toLocaleTimeString([], {
            hour: "numeric",
            minute: "2-digit",
          })}
        </p>
      </div>

      <hr className="border-slate-200 dark:border-slate-700 my-3 sm:my-4" />

      <QuestionsInput addItem={addComment} disabled={submitting} />

      <QuestionsList
        items={post.comments ?? []}
        onAddReply={addReply}
        showNames={showNames}
      />
    </div>
  );
}

export default DiscussionPost;