import React, {useState} from "react";
import ReplyFooter from "./ReplyFooter";
import ReplyHeader from "./ReplyHeader";


function MakeReply({
    handleReply,
    onSubmit,
}
){
    const [showReplyBox, setReplyBox] = useState(false);
    const [reply, setReply] = useState("");

    function handleReplyBox(){
        setReplyBox(!showReplyBox);
        setReply("");
    }
    function handleReply(event){
        const newReply = event.target.value;
        setReply(newReply);
    }

    function handleClick() {
        if (reply.trim() !== "") {
            onSubmit(reply);
            handleReplyBox();
        }
    }
    return (
    <div className="mt-2 pl-5">
      {showReplyBox ? (
        <div className="p-1">
          <ReplyHeader replyText={reply} handleReply={handleReply} />
          <div className="flex justify-end gap-2 mt-2">
            <ReplyFooter 
              handleCancel={handleReplyBox} 
              handleSubmit={handleClick} 
            />
          </div>
        </div>
      ) : (
        <button 
          onClick={handleReplyBox} 
          className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors cursor-pointer"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
          </svg>
          Reply
        </button>
      )}
    </div>
  );
}

export default MakeReply