import React from "react"

function ReplyFooterButton({
    text,
    handleClick,
    disabled = false,
}
){
    return (
        <button type="button" onClick={handleClick} disabled={disabled} className="border border-slate-400 rounded-full px-4 py-2 opacity-100 transition-colors duration-150 shadow-none normal-case font-normal text-slate-600 dark:text-slate-300 bg-transparent hover:bg-slate-200 dark:hover:bg-slate-600 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent">{text}</button>
    );
}
export default ReplyFooterButton;
