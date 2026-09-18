// src/components/classroom/UnderstandCheck.jsx
// Students pick 👎 / 👋 / 👍 (and can change their pick). Professors also see
// the live tally – one vote per student, counted server-side.
import React, { useState, useEffect } from "react";
import SectionHeading from "../ui/SectionHeading";
import api from "../../api/axios";
import socket from "../../api/socket";
import { useAuth } from "../../context/AuthContext";

const RESPONSES = [
  { key: "thumbs_down", emoji: "👎", bg: "bg-red-500",    active: "active:bg-red-400"    },
  { key: "hand",        emoji: "👋", bg: "bg-yellow-300", active: "active:bg-yellow-200" },
  { key: "thumbs_up",   emoji: "👍", bg: "bg-green-500",  active: "active:bg-green-400"  },
];

function UnderstandCheck({ classId }) {
  const { user } = useAuth();
  const isProfessor = user?.role === "professor";

  const [selected, setSelected] = useState(null);
  const [tally,    setTally]    = useState([]);

  // Initial tally (professor only – the endpoint is professor-gated)
  useEffect(() => {
    if (!classId || !isProfessor) return;
    let ignore = false;
    api
      .get(`/api/classes/${classId}/understand`)
      .then((res) => { if (!ignore) setTally(res.data); })
      .catch((err) => console.error("Failed to load understanding tally:", err));
    return () => { ignore = true; };
  }, [classId, isProfessor]);

  // Live tally updates (the server only emits these to the professor room)
  useEffect(() => {
    const onUpdate = (rows) => setTally(rows);
    socket.on("understand:update", onUpdate);
    return () => socket.off("understand:update", onUpdate);
  }, []);

  async function handleClick(responseKey) {
    if (selected === responseKey) return;
    const previous = selected;
    setSelected(responseKey);
    try {
      const { data } = await api.post(`/api/classes/${classId}/understand`, {
        response: responseKey,
      });
      if (isProfessor) setTally(data.tally);
    } catch (err) {
      console.error("Failed to submit understanding check:", err);
      setSelected(previous);
    }
  }

  const counts = Object.fromEntries(tally.map((r) => [r.response, r.count]));

  return (
    <div className="w-full rounded-lg shadow-md p-4 sm:p-6 border bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
      <SectionHeading text="Understanding Check 🤔" />
      <div className="flex justify-around w-full pt-4 pb-2">
        {RESPONSES.map(({ key, emoji, bg, active }) => (
          <div key={key} className="flex flex-col items-center gap-2">
            <button
              type="button"
              onClick={() => handleClick(key)}
              className={`emoji-btn ${bg} ${active} ${
                selected === key ? "ring-4 ring-offset-2 ring-blue-400 scale-110" : ""
              } transition-all`}
            >
              <p className="text">{emoji}</p>
            </button>
            {isProfessor && (
              <span className="text-sm font-semibold std-text tabular-nums">
                {counts[key] ?? 0}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default UnderstandCheck;
