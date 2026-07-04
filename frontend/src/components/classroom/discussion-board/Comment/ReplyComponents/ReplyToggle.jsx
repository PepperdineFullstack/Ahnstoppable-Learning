import React from 'react';
import RepliesList from './RepliesList'; // Adjust path as needed

function ReplyToggle({ replies = [], showReplies, onToggle, showNames}) {
  // IF NO REPLIES, DONT RENDER ANYTHING 
  if (replies.length === 0) return null;

  return (
    <div className="mt-3 pl-5">
      <button 
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
           <RepliesList replies={replies} showNames={showNames} />
        </div>
      )}
    </div>
  );
}

export default ReplyToggle;