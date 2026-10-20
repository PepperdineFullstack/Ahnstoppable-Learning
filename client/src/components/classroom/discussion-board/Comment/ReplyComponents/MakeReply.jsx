// src/components/classroom/discussion-board/Comment/ReplyComponents/MakeReply.jsx
// The reply box. It opens right under whatever was clicked (the comment, or
// one of its replies); posting adds the reply to the same thread. Comment owns
// the text, busy flag and error, so the box only closes once the reply was
// saved and a failed post keeps the text, with its error shown right here.
import React from "react";
import ReplyFooter from "./ReplyFooter";
import ReplyHeader from "./ReplyHeader";

function MakeReply({ value, onChange, busy = false, error = null, onSubmit, onCancel }) {
  return (
    <div className="mt-2 pl-5 p-1">
      <ReplyHeader replyText={value} handleReply={(e) => onChange(e.target.value)} />
      {error && <p role="alert" className="text-xs text-red-400">{error}</p>}
      <div className="flex justify-end gap-2 mt-2">
        <ReplyFooter
          handleCancel={onCancel}
          handleSubmit={onSubmit}
          busy={busy}
          canSubmit={!!value.trim()}
        />
      </div>
    </div>
  );
}

// The "Reply" link that opens the box.
export function ReplyButton({ onClick, label = "Reply", ariaLabel }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors cursor-pointer"
    >
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
      </svg>
      {label}
    </button>
  );
}

export default MakeReply;
