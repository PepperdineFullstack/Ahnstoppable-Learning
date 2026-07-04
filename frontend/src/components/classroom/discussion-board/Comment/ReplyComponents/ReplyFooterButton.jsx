import React from "react"

function ReplyFooterButton({
    text,
    handleClick,
}
){
    return (
        <button onClick={handleClick} className="border border-slate-400 rounded-full px-4 py-2 opacity-100 transition-colors duration-150 shadow-none normal-case font-normal text-olive-300 bg-transparent hover:bg-slate-600">{text}</button>
    );
}
export default ReplyFooterButton;