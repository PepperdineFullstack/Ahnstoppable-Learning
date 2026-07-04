// src/components/classroom/discussion-board/Comment/ReplyComponents/RepliesList.jsx
import React from "react";
import Reply from "../Reply";
import { useAuth } from "../../../../../context/AuthContext";

function RepliesList({ replies = [], onDeleteReply, showNames}) {
  const { user } = useAuth();
  const canDelete = (authorId) =>
    user && (user.role === "professor" || authorId === user.id);

  if (replies.length === 0) return null;

  return (
    <div className="ml-6 space-y-4">
      {replies.map((reply) => (
        <Reply
          key={reply.id}
          name={showNames ? (reply.author_name ?? "Anonymous") : "Anonymous"}
          date={new Date(reply.created_at).toLocaleTimeString([], {
            hour: "numeric",
            minute: "2-digit",
          })}
          text={reply.content}
          onDelete={canDelete(reply.author_id) ? () => onDeleteReply(reply.id) : undefined}
        />
      ))}
    </div>
  );
}

export default RepliesList;