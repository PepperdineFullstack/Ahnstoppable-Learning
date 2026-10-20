// src/components/classroom/discussion-board/QuestionsInput.jsx
import React, { useState } from "react";
import AutoGrowTextarea from "../../ui/AutoGrowTextarea";

const MAX_LEN = 1000;   // same limit as the server

function QuestionsInput({ addItem = () => {}, disabled = false }) {
  const [inputText, setInputText] = useState("");

  function handleChange(event) {
    setInputText(event.target.value);
  }

  // Clear only once the comment was saved, so a rejected one keeps its text.
  async function handlePost() {
    if (!inputText.trim() || disabled) return;
    const ok = await addItem(inputText);
    if (ok !== false) setInputText("");
  }

  return (
    <div className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden transition-all duration-300">
      <div className="p-1">
        <AutoGrowTextarea
          name="questions-input"
          aria-label="Write a comment"
          minRows={4}
          className="w-full p-4 std-text bg-transparent outline-none placeholder-slate-400 dark:placeholder-slate-500 font-medium"
          onChange={handleChange}
          placeholder="Post any questions here:"
          value={inputText}
          maxLength={MAX_LEN}
        />
      </div>

      <div className="flex items-center justify-between px-4 py-2 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800">
        <span
          className={`text-xs font-medium ${
            inputText.length >= MAX_LEN - 100
              ? "text-orange-500"
              : "text-slate-500 dark:text-slate-400"
          }`}
        >
          {inputText.length} / {MAX_LEN}
        </span>

        <button
          className="px-5 py-2 rounded-md font-semibold text-sm tracking-wide transition-all duration-200 cursor-pointer
            text-white bg-blue-600 hover:bg-blue-700 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
          onClick={handlePost}
          disabled={!inputText.trim() || disabled}
        >
          {disabled ? "Posting…" : "Post"}
        </button>
      </div>
    </div>
  );
}

export default QuestionsInput;