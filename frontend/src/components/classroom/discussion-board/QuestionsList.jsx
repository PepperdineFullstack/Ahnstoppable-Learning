// src/components/classroom/discussion-board/QuestionsList.jsx
import React from "react";
import Comment from "./Comment/Comment";
import { useAuth } from "../../../context/AuthContext";

function QuestionsList({ items = [], onAddReply, onDeleteComment, onDeleteReply, showNames }) {
  const { user } = useAuth();
  // Own comments are always deletable; professors can moderate any
  const canDelete = (authorId) =>
    user && (user.role === "professor" || authorId === user.id);

  if (items.length === 0) {
    return (
      <p className="text-xs text-slate-400 dark:text-slate-500 text-center pt-4">
        No comments yet — be the first!
      </p>
    );
  }

  return (
    <div className="mt-2">
      {items.map((comment) => (
        <Comment
          key={comment.id}
          id={comment.id}
          // API returns author_name / created_at / content
          name={showNames ? (comment.author_name ?? 'Anonymous') : 'Anonymous'}
          date={new Date(comment.created_at).toLocaleTimeString([], {
            hour: "numeric",
            minute: "2-digit",
          })}
          text={comment.content}
          replies={comment.replies ?? []}
          onAddReply={onAddReply}
          onDelete={canDelete(comment.author_id) ? () => onDeleteComment(comment.id) : undefined}
          onDeleteReply={onDeleteReply}
          showNames={showNames}
        />
      ))}
    </div>
  );
}

export default QuestionsList;