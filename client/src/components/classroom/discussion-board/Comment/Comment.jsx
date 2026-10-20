// src/components/classroom/discussion-board/Comment/Comment.jsx
// A comment and its thread of replies. "Reply" under the comment, or under any
// reply, opens the reply box right there; the new reply joins this thread.
import React, { useState } from "react";
import Reply from "./Reply";
import MakeReply, { ReplyButton } from "./ReplyComponents/MakeReply";
import ReplyToggle from "./ReplyComponents/ReplyToggle";

function Comment({
  id,
  name = "Anonymous",
  date = "0:00 AM",
  text = "Sample Text",
  replies = [],
  postDate,
  onAddReply,
  showNames,
  isMine = false,
  edited = false,
  canModerate = false,
  onEdit,
  onDelete,
  onEditReply,
  onDeleteReply,
  likeCount = 0,
  liked = false,
  onToggleLike,
  onLikeReply,
}) {
  const [showReplies, setShowReplies] = useState(false);
  // Where the reply box is open: null, "comment", or a reply's id.
  const [replyTarget, setReplyTarget] = useState(null);
  // The box's state lives here, not in MakeReply, so it survives the box
  // moving (see effectiveTarget) and a post that's still in flight.
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [replyError, setReplyError] = useState(null);

  // If the reply the box is under is hidden ("Hide replies") or was deleted,
  // the box moves under the comment instead of vanishing with the draft.
  const targetShown = replyTarget === "comment"
    || (showReplies && replies.some((r) => r.id === replyTarget));
  const effectiveTarget = replyTarget === null ? null : targetShown ? replyTarget : "comment";

  function openBox(target) {
    setReplyTarget(target);
    setReplyError(null);
  }
  function closeBox() {
    setReplyTarget(null);
    setDraft("");
    setReplyError(null);
  }

  async function submitReply() {
    if (!draft.trim() || busy) return;
    setBusy(true);
    setReplyError(null);
    try {
      const { ok, error } = await onAddReply(id, draft);
      if (ok) {
        setShowReplies(true);   // show the thread, so the new reply is visible
        closeBox();
      } else {
        setReplyError(error);
      }
    } finally {
      setBusy(false);
    }
  }

  const replyBox = (
    <MakeReply
      value={draft}
      onChange={setDraft}
      busy={busy}
      error={replyError}
      onSubmit={submitReply}
      onCancel={closeBox}
    />
  );

  return (
    <div data-testid="comment" className="py-6 border-b pl-2 border-slate-200 dark:border-slate-800 last:border-0 bg-white dark:bg-slate-900 transition-colors">
      <div className="flex flex-col gap-1">
        {/* Comment body, with its Reply link and the box right under it */}
        <Reply
          name={name}
          date={date}
          text={text}
          kind="comment"
          edited={edited}
          canEdit={isMine}
          canDelete={isMine || canModerate}
          onEdit={onEdit}
          onDelete={onDelete}
          likeCount={likeCount}
          liked={liked}
          onToggleLike={onToggleLike}
        />
        <div className="ml-2 mt-2 pl-5">
          {effectiveTarget === "comment" ? replyBox : <ReplyButton onClick={() => openBox("comment")} />}
        </div>

        {/* Replies; each has its own Reply link that opens the box under it */}
        <div className="border-slate-100 dark:border-slate-800 ml-2">
          <ReplyToggle
            replies={replies}
            postDate={postDate}
            showReplies={showReplies}
            onToggle={() => setShowReplies((v) => !v)}
            showNames={showNames}
            replyTarget={effectiveTarget}
            onReply={(replyId) => openBox(replyId)}
            replyBox={replyBox}
            canModerate={canModerate}
            onEditReply={onEditReply}
            onDeleteReply={onDeleteReply}
            onLikeReply={onLikeReply}
          />
        </div>
      </div>
    </div>
  );
}

export default Comment;
