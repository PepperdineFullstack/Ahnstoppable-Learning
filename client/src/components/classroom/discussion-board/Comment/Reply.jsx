// src/components/classroom/discussion-board/Comment/Reply.jsx
// One comment or reply: author, time, text, and its actions. The author can
// edit or delete it; the class's professor can delete anything (moderation).
import React, { useState } from "react";
import { ThumbsUp } from "lucide-react";
import AutoGrowTextarea from "../../../ui/AutoGrowTextarea";

const linkClass =
  "text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 cursor-pointer";

function Reply({
  name = "Anonymous",
  date = "0:00 AM",
  text = "Sample Text",
  kind = "reply",          // "comment" | "reply" (for button labels)
  edited = false,
  onReply,                 // shows "Reply" when given
  canEdit = false,
  canDelete = false,
  onEdit,                  // async (newText) => boolean
  onDelete,                // async () => void
  likeCount = 0,
  liked = false,
  onToggleLike,            // shows the thumbs-up when given
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft]     = useState(text);
  const [busy, setBusy]       = useState(false);

  function startEdit() {
    setDraft(text);
    setEditing(true);
  }

  async function save() {
    const next = draft.trim();
    if (!next || busy) return;
    if (next === text) { setEditing(false); return; }
    setBusy(true);
    try {
      const ok = await onEdit(next);
      if (ok !== false) setEditing(false);
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    const message = kind === "comment"
      ? "Delete this comment? Its replies will be deleted too."
      : "Delete this reply?";
    if (!window.confirm(message)) return;
    setBusy(true);
    try { await onDelete(); } finally { setBusy(false); }
  }

  const hasActions = onToggleLike || onReply || canEdit || canDelete;

  return (
    <div className="group">
      <div className="flex items-center gap-3 mb-1">
        <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center text-blue-600 dark:text-blue-300 font-bold text-xs">
          {name.charAt(0)}
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center sm:gap-2">
          <h4 className="text-sm font-bold std-text dark:text-slate-100">{name}</h4>
          <span className="text-xs text-slate-500 dark:text-slate-500">
            • {date}{edited && <span className="ml-1 italic">(edited)</span>}
          </span>
        </div>
      </div>

      {editing ? (
        <div className="pl-5 flex flex-col gap-2">
          <AutoGrowTextarea
            aria-label={`Edit ${kind}`}
            minRows={2}
            maxLength={1000}
            value={draft}
            autoFocus
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) save(); }}
            className="w-full std-text text-[15px] bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 px-3 py-2 rounded-md outline-blue-600 focus:ring-2 focus:ring-blue-500/20"
          />
          <div className="flex justify-end gap-2">
            <button type="button" className="white-btn text-xs py-1.5" onClick={() => setEditing(false)} disabled={busy}>Cancel</button>
            <button type="button" className="blue-btn text-xs py-1.5" onClick={save} disabled={!draft.trim() || busy}>
              {busy ? "Saving…" : "Save"}
            </button>
          </div>
        </div>
      ) : (
        <p className="text-[15px] leading-relaxed text-slate-700 dark:text-slate-300 pl-5 whitespace-pre-wrap">
          {text}
        </p>
      )}

      {hasActions && !editing && (
        <div className="mt-1 pl-5 flex items-center gap-3">
          {onToggleLike && (
            <button
              type="button"
              onClick={onToggleLike}
              aria-pressed={liked}
              aria-label={`${liked ? "Unlike" : "Like"} ${kind}${likeCount ? ` (${likeCount} like${likeCount === 1 ? "" : "s"})` : ""}`}
              className={`flex items-center gap-1 text-xs font-semibold cursor-pointer transition-colors ${
                liked ? "text-blue-600 dark:text-blue-400" : "text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400"
              }`}
            >
              <ThumbsUp aria-hidden="true" size={14} strokeWidth={2} fill={liked ? "currentColor" : "none"} />
              {likeCount > 0 && <span className="tabular-nums">{likeCount}</span>}
            </button>
          )}
          {onReply && (
            <button type="button" onClick={onReply} aria-label={`Reply to ${name}`} className={linkClass}>Reply</button>
          )}
          {canEdit && (
            <button type="button" onClick={startEdit} aria-label={`Edit ${kind}`} className={linkClass} disabled={busy}>Edit</button>
          )}
          {canDelete && (
            <button
              type="button"
              onClick={remove}
              aria-label={`Delete ${kind}`}
              className="text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-red-500 cursor-pointer"
              disabled={busy}
            >
              Delete
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default Reply;
