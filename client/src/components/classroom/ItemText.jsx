// src/components/classroom/ItemText.jsx
// The text of a question, answer or reply in the Questions card, with its
// actions: thumbs up (everyone), Edit (the author), Delete (the author; the
// professor may also delete). Editing happens in place. Extra actions such as
// "Reply" or "Answer" can be passed as children and appear in the same row.
import React, { useState } from "react";
import { ThumbsUp } from "lucide-react";
import AutoGrowTextarea from "../ui/AutoGrowTextarea";

const linkClass =
  "text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 cursor-pointer";

function ItemText({
  text,
  label,                     // "question" | "answer" | "reply" (button names)
  maxLength = 1000,
  textClassName = "",
  likeCount = 0,
  liked = false,
  onToggleLike,
  canEdit = false,
  canDelete = false,
  onEdit,                    // async (text) => boolean
  onDelete,                  // async () => void
  deleteMessage,
  children,
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft]     = useState(text);
  const [busy, setBusy]       = useState(false);

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
    if (!window.confirm(deleteMessage ?? `Delete this ${label}?`)) return;
    setBusy(true);
    try { await onDelete(); } finally { setBusy(false); }
  }

  if (editing) {
    return (
      <div className="mt-1 flex flex-col gap-2">
        <AutoGrowTextarea
          aria-label={`Edit ${label}`}
          minRows={2}
          maxLength={maxLength}
          value={draft}
          autoFocus
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) save(); }}
          className="w-full std-text text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 px-3 py-2 rounded-md outline-blue-600 focus:ring-2 focus:ring-blue-500/20"
        />
        <div className="flex justify-end gap-2">
          <button type="button" className="white-btn text-xs py-1.5" onClick={() => setEditing(false)} disabled={busy}>Cancel</button>
          <button type="button" className="blue-btn text-xs py-1.5" onClick={save} disabled={!draft.trim() || busy}>
            {busy ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <p className={`whitespace-pre-wrap ${textClassName}`}>{text}</p>
      <div className="mt-1 flex flex-wrap items-center gap-3">
        {onToggleLike && (
          <button
            type="button"
            onClick={onToggleLike}
            aria-pressed={liked}
            aria-label={`${liked ? "Unlike" : "Like"} ${label}${likeCount ? ` (${likeCount} like${likeCount === 1 ? "" : "s"})` : ""}`}
            className={`flex items-center gap-1 text-xs font-semibold cursor-pointer transition-colors ${
              liked ? "text-blue-600 dark:text-blue-400" : "text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400"
            }`}
          >
            <ThumbsUp aria-hidden="true" size={14} strokeWidth={2} fill={liked ? "currentColor" : "none"} />
            {likeCount > 0 && <span className="tabular-nums">{likeCount}</span>}
          </button>
        )}
        {children}
        {canEdit && (
          <button type="button" className={linkClass} onClick={() => { setDraft(text); setEditing(true); }} aria-label={`Edit ${label}`} disabled={busy}>
            Edit
          </button>
        )}
        {canDelete && (
          <button
            type="button"
            onClick={remove}
            aria-label={`Delete ${label}`}
            className="text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-red-500 cursor-pointer"
            disabled={busy}
          >
            Delete
          </button>
        )}
      </div>
    </>
  );
}

export default ItemText;
