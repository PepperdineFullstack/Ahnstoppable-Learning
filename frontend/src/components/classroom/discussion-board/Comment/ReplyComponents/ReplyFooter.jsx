import React from "react";
import ReplyFooterButton from "./ReplyFooterButton";

function ReplyFooter({
    handleCancel,
    handleSubmit
}){
    return (
        <div className="flex flex-row justify-end items-start flex-nowrap gap-2"> 
            <ReplyFooterButton handleClick={handleCancel} text="Cancel"/>
            <ReplyFooterButton handleClick={handleSubmit} text="Reply"/>
        </div>
    );
}
export default ReplyFooter;