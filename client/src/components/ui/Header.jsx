// src/components/ui/Header.jsx
// Top bar on signed-in pages: the centered brand and tagline, with the menu on
// the right. The empty first column mirrors the right one so the brand stays
// truly centered whatever the menu's width.
import React from "react";
import DropdownMenu from "./DropdownMenu";
import { useNavigate } from "react-router-dom";

function Header({ rightContent }) {
  const navigate = useNavigate();
  return (
    <header className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 mb-2 bg-white dark:bg-slate-900 shadow-sm p-4 sm:p-6 lg:p-8">
      <div aria-hidden="true" />

      <button
        type="button"
        onClick={() => navigate("/home")}
        className="flex flex-col items-center text-center cursor-pointer"
      >
        <h2 className="text-blue-600 dark:text-blue-400 font-bold text-xl sm:text-2xl lg:text-4xl tracking-tighter">
          AHNSTOPPABLE LEARNING
        </h2>
        <span className="text-orange-500 dark:text-orange-400 font-semibold text-sm sm:text-base lg:text-xl tracking-wide">
          freely ask, freely learn
        </span>
      </button>

      <div className="flex items-center justify-self-end gap-2">
        {rightContent && rightContent()}
        <DropdownMenu />
      </div>
    </header>
  );
}

export default Header;
