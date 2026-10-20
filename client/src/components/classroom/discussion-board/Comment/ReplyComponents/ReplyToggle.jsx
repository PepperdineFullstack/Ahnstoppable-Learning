import React from 'react';
import RepliesList from './RepliesList'; // Adjust path as needed

function ReplyToggle({ replies = [], postDate, showReplies, onToggle, showNames, onReply, replyTarget, replyBox, canModerate, onEditReply, onDeleteReply, onLikeReply }) {
  // IF NO REPLIES, DONT RENDER ANYTHING 
  if (replies.length === 0) return null;

  return (
    <div className="mt-3 pl-5">
      <button 
        type="button"
        onClick={onToggle} 
        className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 flex items-center gap-2 cursor-pointer transition-all"
      >
        <span className="h-px w-4 bg-blue-200 dark:bg-blue-800"></span>
        {showReplies ? (
          "Hide replies"
        ) : (
          `View ${replies.length} ${replies.length === 1 ? 'reply' : 'replies'}`
        )}
      </button>
      
      {showReplies && (
        <div className="mt-4 space-y-4">
           <RepliesList replies={replies} postDate={postDate} showNames={showNames} onReply={onReply} replyTarget={replyTarget} replyBox={replyBox} canModerate={canModerate} onEditReply={onEditReply} onDeleteReply={onDeleteReply} onLikeReply={onLikeReply} />
        </div>
      )}
    </div>
  );
}

export default ReplyToggle;