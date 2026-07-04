// src/components/classroom/TalentBoard.jsx
import React, { useEffect, useMemo, useState } from "react";
import api from "../../api/axios";
import SectionHeading from "../ui/SectionHeading";

function TalentBoard({ classId }) {
  const [students, setStudents] = useState([]);

  useEffect(() => {
    if (!classId) return;
    api
      .get(`/api/classes/${classId}/talents`)
      .then((res) => setStudents(res.data))
      .catch((err) => console.error("Failed to load talents:", err));
  }, [classId]);

  const sorted   = useMemo(() => [...students].sort((a, b) => b.talents - a.talents), [students]);
  const maxTalents = sorted[0]?.talents ?? 0;

  if (sorted.length === 0) return null;

  return (
    <div className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm overflow-hidden transition-all duration-300">
      <div className="px-4 sm:px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50">
        <h2 className="text-base sm:text-lg font-bold std-text flex items-center gap-2">
          <span>Top Contributors</span>
          <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-300">
            {sorted.length} Students
          </span>
        </h2>
      </div>

      <div className="p-3 sm:p-4 space-y-4 sm:space-y-6">
        {sorted.map((student, index) => {
          const barWidth = maxTalents > 0 ? (student.talents / maxTalents) * 100 : 0;
          const isLeader = index === 0;

          return (
            <div key={student.id} className="relative">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-8 h-8 sm:w-10 sm:h-10 shrink-0 rounded-full flex items-center justify-center font-bold text-sm bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                  {student.name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-end mb-1 gap-2">
                    <span className="text-sm font-bold std-text truncate">
                      {student.name}
                    </span>
                    <span className="text-xs sm:text-sm font-mono font-semibold text-blue-600 dark:text-blue-400 shrink-0">
                      {student.talents.toLocaleString()} pts
                    </span>
                  </div>
                  <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-1000 ease-out ${
                        isLeader ? "bg-blue-600" : "bg-blue-400/60 dark:bg-blue-500/40"
                      }`}
                      style={{ width: `${barWidth}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default TalentBoard;