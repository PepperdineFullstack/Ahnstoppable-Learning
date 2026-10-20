import React from "react";
import AutoGrowTextarea from "../../../../ui/AutoGrowTextarea";

function ReplyHeader({
    replyText,
    handleReply,
}){
    return (
        <div className="group flex flex-col text-slate-600 focus:text-slate-800 mb-2">
            <AutoGrowTextarea aria-label="Write a reply" placeholder="Write a reply…" autoFocus minRows={2} maxLength={1000} value={replyText} onChange={handleReply} className="w-full std-text bg-transparent border-none py-2 outline-none placeholder-gray-400"/>
            <hr className="border-t-2 border-slate-600 transition-colors duration-300 group-focus-within:border-slate-300" 
            />
        </div>  
    );
}
export default ReplyHeader;