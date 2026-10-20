// src/components/classroom/discussion-board/Comment/ReplyComponents/RepliesList.jsx
import React from "react";
import Reply from "../Reply";
import { formatWhen } from "../../../../../utils/dates";

function RepliesList({ replies = [], postDate, showNames, onReply, replyTarget, replyBox, canModerate = false, onEditReply, onDeleteReply, onLikeReply }) {
  if (replies.length === 0) return null;

  return (
    <div className="ml-6 space-y-4">
      {replies.map((reply) => (
        <div key={reply.id}>
        <Reply
          name={
            reply.is_mine
              ? "You"
              : (showNames || reply.author_role === "professor") && reply.author_name
                ? reply.author_name
                : "Anonymous"
          }
          date={formatWhen(reply.created_at, postDate)}
          text={reply.content}
          onReply={() => onReply(reply.id)}
          edited={!!reply.edited_at}
          canEdit={!!reply.is_mine}
          canDelete={!!reply.is_mine || canModerate}
          onEdit={(text) => onEditReply(reply.id, text)}
          onDelete={() => onDeleteReply(reply.id)}
          likeCount={reply.like_count ?? 0}
          liked={!!reply.liked_by_me}
          onToggleLike={() => onLikeReply(reply.id)}
        />
        {replyTarget === reply.id && replyBox}
        </div>
      ))}
    </div>
  );
}

export default RepliesList;