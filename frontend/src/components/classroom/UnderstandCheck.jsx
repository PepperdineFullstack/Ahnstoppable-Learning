// src/components/classroom/UnderstandCheck.jsx
// Students vote 👎 👋 👍 (re-clicking a different emoji moves their vote).
// The professor sees a live tally of the last hour instead of voting buttons.
import React, { useState, useEffect } from "react";
import SectionHeading from "../ui/SectionHeading";
import api from "../../api/axios";
import socket from "../../api/socket";
import { useAuth } from "../../context/AuthContext";

const RESPONSES = [
  { key: "thumbs_down", emoji: "👎", bg: "bg-red-500",    active: "active:bg-red-400"    },
  { key: "hand",        emoji: "👋", bg: "bg-yellow-300", active: "active:bg-yellow-200" },
  { key: "thumbs_up",  emoji: "👍", bg: "bg-green-500",  active: "active:bg-green-400"  },
];

function UnderstandCheck({ classId }) {
  const { user } = useAuth();
  const isProfessor = user?.role === "professor";
  const [selected, setSelected] = useState(null);
  const [tally,    setTally]    = useState([]);

  // Initial tally + live updates (shared socket – connected by useClassSocket)
  useEffect(() => {
    let cancelled = false;
    api.get(`/api/classes/${classId}/understand`)
      .then(({ data }) => { if (!cancelled) setTally(data); })
      .catch((err) => console.error("Failed to load understanding tally:", err));

    const handleUpdate = (rows) => setTally(rows);
    socket.on("understand:update", handleUpdate);
    return () => {
      cancelled = true;
      socket.off("understand:update", handleUpdate);
    };
  }, [classId]);

  async function handleClick(responseKey) {
    if (isProfessor) return;          // professors watch the tally, they don't vote
    if (selected === responseKey) return; // already submitted this
    setSelected(responseKey);
    try {
      const { data } = await api.post(`/api/classes/${classId}/understand`, {
        response: responseKey,
      });
      setTally(data.tally);
    } catch (err) {
      console.error("Failed to submit understanding check:", err);
      setSelected(null);
    }
  }

  const countFor = (key) => tally.find((t) => t.response === key)?.count ?? 0;

  return (
    <div className="w-full rounded-lg shadow-md p-4 sm:p-6 border bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
      <SectionHeading text="Understanding Check 🤔" />
      <div className="flex justify-around w-full pt-4 pb-2">
        {RESPONSES.map(({ key, emoji, bg, active }) => (
          <div key={key} className="flex flex-col items-center gap-2">
            <button
              onClick={() => handleClick(key)}
              disabled={isProfessor}
              className={`emoji-btn ${bg} ${isProfessor ? "cursor-default" : active} ${
                selected === key ? "ring-4 ring-offset-2 ring-blue-400 scale-110" : ""
              } transition-all`}
            >
              <p className="text">{emoji}</p>
            </button>
            {isProfessor && (
              <span className="std-text text-lg font-bold">{countFor(key)}</span>
            )}
          </div>
        ))}
      </div>
      {isProfessor && (
        <p className="text-xs text-center text-slate-400 dark:text-slate-500">
          Live responses from the last hour
        </p>
      )}
    </div>
  );
}

export default UnderstandCheck;
