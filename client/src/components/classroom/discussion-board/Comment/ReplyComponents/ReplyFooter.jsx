import React from "react";
import ReplyFooterButton from "./ReplyFooterButton";

function ReplyFooter({
    handleCancel,
    handleSubmit,
    busy = false,
    canSubmit = true,
}){
    // While a reply is posting, Cancel would close the box and lose the text
    // if the post then failed, so both buttons wait.
    return (
        <div className="flex flex-row justify-end items-start flex-nowrap gap-2"> 
            <ReplyFooterButton handleClick={handleCancel} text="Cancel" disabled={busy}/>
            <ReplyFooterButton handleClick={handleSubmit} text={busy ? "Posting…" : "Post reply"} disabled={!canSubmit || busy}/>
        </div>
    );
}
export default ReplyFooter;
