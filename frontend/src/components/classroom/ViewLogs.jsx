import React, { useState } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react";

function ViewLogs({ date, today, handleDate }) {
  function shiftDay(delta) {
    const d = new Date(date + 'T00:00:00');
    d.setDate(d.getDate() + delta);
    const next = d.toISOString().split('T')[0];
    if (next >= '2026-01-01' && next <= today) {
      handleDate({ target: { value: next } });
    }
  }

  function goToday() {
    handleDate({ target: { value: today } });
  }

  return (
    <div className="w-full p-2 sm:p-3 flex flex-wrap items-center gap-2">
      <span className="text-sm text-gray-500 whitespace-nowrap">Viewing logs for</span>

      <div className="flex items-center gap-1.5">
        <button
          onClick={() => shiftDay(-1)}
          disabled={date <= "2026-01-01"}
          className="flex items-center justify-center w-8 h-8 border border-gray-200 rounded-lg
                     text-gray-500 hover:bg-gray-100 disabled:opacity-35 disabled:cursor-default
                     dark:border-gray-700 dark:hover:bg-gray-800 transition-colors"
        >
          <ChevronLeft size={16} />
        </button>

        <input
          type="date"
          value={date}
          min="2026-01-01"
          max={today}
          onChange={handleDate}
          className="h-8 px-2 text-sm border border-gray-200 rounded-lg bg-white
                     dark:bg-gray-900 dark:border-gray-700 dark:text-white
                     focus:outline-none focus:ring-2 focus:ring-gray-300 cursor-pointer
                     max-w-[140px]"
        />

        <button
          onClick={() => shiftDay(1)}
          disabled={date >= today}
          className="flex items-center justify-center w-8 h-8 border border-gray-200 rounded-lg
                     text-gray-500 hover:bg-gray-100 disabled:opacity-35 disabled:cursor-default
                     dark:border-gray-700 dark:hover:bg-gray-800 transition-colors"
        >
          <ChevronRight size={16} />
        </button>

        <button
          onClick={goToday}
          className={`h-8 px-3 text-xs border rounded-lg transition-colors whitespace-nowrap
                      dark:border-gray-700
                      ${date === today
                        ? "bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-800 dark:text-gray-100"
                        : "border-gray-200 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"}`}
        >
          Today
        </button>
      </div>
    </div>
  );
}

export default ViewLogs;