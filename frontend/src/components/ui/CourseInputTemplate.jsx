import React from "react";

function CourseInputTemplate({
    label,
    name,
    type,
    id,
    value,
    onChange,
    placeholder=""
}){
    return (
        <div>
                <label className="std-text text-sm mb-2 block" htmlFor={id}>
                    {label}
                </label>
                <div className="relative flex items-center">
                    <input 
                        name={name}
                        type={type}
                        id={id}
                        required
                        value={value}
                        onChange={onChange} 
                        className="w-full std-text  bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 px-4 py-3 pr-10 rounded-md outline-blue-600 focus:ring-2 focus:ring-blue-500/20" 
                        placeholder={placeholder}
                    />
                </div>
        </div>
    );
}

export default CourseInputTemplate