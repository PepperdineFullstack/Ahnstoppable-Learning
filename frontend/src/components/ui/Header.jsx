// src/components/ui/Header.jsx
import React from "react";
import DropdownMenu from "./DropdownMenu";
import { useNavigate } from "react-router-dom";
 
function Header({ rightContent }) {
  const navigate = useNavigate();
  return (
    <header className="flex justify-between items-center mb-2 bg-white dark:bg-slate-900 shadow-sm p-4 sm:p-6 lg:p-8">
      <h2
        className="text-blue-600 dark:text-blue-400 font-bold text-xl sm:text-2xl lg:text-4xl tracking-tighter cursor-pointer"
        onClick={() => navigate("/home")}
      >
        AHNSTOPPABLE LEARNING
      </h2>
      <div className="flex items-center gap-2">
        {rightContent && rightContent()}
        <DropdownMenu />
      </div>
    </header>
  );
}
 
export default Header;