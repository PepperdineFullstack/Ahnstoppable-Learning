// src/components/classroom/discussion-board/QuestionsList.jsx
import React from "react";
import Comment from "./Comment/Comment";
import { formatWhen } from "../../../utils/dates";

function QuestionsList({ items = [], postDate, onAddReply, showNames, canModerate = false, onEditComment, onDeleteComment, onEditReply, onDeleteReply, onLikeComment, onLikeReply }) {
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
          // The server omits author_name for student rows sent to students;
          // professors can preview the student view with showNames=false.
          name={
            comment.is_mine
              ? 'You'
              : (showNames || comment.author_role === 'professor') && comment.author_name
                ? comment.author_name
                : 'Anonymous'
          }
          date={formatWhen(comment.created_at, postDate)}
          postDate={postDate}
          text={comment.content}
          replies={comment.replies ?? []}
          onAddReply={onAddReply}
          showNames={showNames}
          isMine={!!comment.is_mine}
          edited={!!comment.edited_at}
          canModerate={canModerate}
          onEdit={(text) => onEditComment(comment.id, text)}
          onDelete={() => onDeleteComment(comment.id)}
          onEditReply={(replyId, text) => onEditReply(comment.id, replyId, text)}
          onDeleteReply={(replyId) => onDeleteReply(comment.id, replyId)}
          likeCount={comment.like_count ?? 0}
          liked={!!comment.liked_by_me}
          onToggleLike={() => onLikeComment(comment.id)}
          onLikeReply={(replyId) => onLikeReply(comment.id, replyId)}
        />
      ))}
    </div>
  );
}

export default QuestionsList;