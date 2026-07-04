// src/components/classroom/AnonymousToggle.jsx
import React from "react";

function AnonymousToggle({ showNames, setShowNames }) {
  return (
    <div className="flex items-center gap-3 px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg shadow-sm">
      <span className="text-sm font-medium std-text">Student names</span>
      <button
        onClick={() => setShowNames(v => !v)}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200
          ${showNames ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-600'}`}
      >
        <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-200
          ${showNames ? 'translate-x-6' : 'translate-x-1'}`}
        />
      </button>
      <span className="text-xs text-slate-500 dark:text-slate-400 w-20">
        {showNames ? 'Showing names' : 'Viewing as student'}
      </span>
    </div>
  );
}

export default AnonymousToggle;