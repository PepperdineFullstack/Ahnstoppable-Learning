import React from "react";

function ReplyHeader({
    replyText,
    handleReply,
}){
    return (
        <div className="group flex flex-col text-slate-600 focus:text-slate-800 mb-2">
            <input type="text" value={replyText} onChange={handleReply} className="w-full text-olive-100 bg-transparent border-none py-2 outline-none placeholder-gray-400"/>
            <hr className="border-t-2 border-slate-600 transition-colors duration-300 group-focus-within:border-slate-300" 
            />
        </div>  
    );
}
export default ReplyHeader;