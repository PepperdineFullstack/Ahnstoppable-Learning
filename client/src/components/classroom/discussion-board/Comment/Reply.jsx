import React from "react";

function Reply({
    name="Anonymous",
    date="0:00 AM",
    text= "Sample Text",
}){
    return (
    <div className="group">
      <div className="flex items-center gap-3 mb-1">
        <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center text-blue-600 dark:text-blue-300 font-bold text-xs">
          {name.charAt(0)}
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center sm:gap-2">
          <h4 className="text-sm font-bold std-text dark:text-slate-100">{name}</h4>
          <span className="text-xs text-slate-500 dark:text-slate-500">• {date}</span>
        </div>
      </div>
      <p className="text-[15px] leading-relaxed text-slate-700 dark:text-slate-300 pl-5">
        {text}
      </p>
    </div>
  );
}
export default Reply;