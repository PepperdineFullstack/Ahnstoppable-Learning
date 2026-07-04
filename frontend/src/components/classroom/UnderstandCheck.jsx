// src/components/classroom/UnderstandCheck.jsx
import React, { useState, useEffect } from "react";
import SectionHeading from "../ui/SectionHeading";
import api from "../../api/axios";
import socket from "../../api/socket";

const RESPONSES = [
  { key: "thumbs_down", emoji: "👎", bg: "bg-red-500",    active: "active:bg-red-400"    },
  { key: "hand",        emoji: "👋", bg: "bg-yellow-300", active: "active:bg-yellow-200" },
  { key: "thumbs_up",  emoji: "👍", bg: "bg-green-500",  active: "active:bg-green-400"  },
];

function UnderstandCheck({ classId }) {
  const [selected, setSelected] = useState(null);
  const [tally,    setTally]    = useState([]);

  // Listen for live tally updates from other students
  useEffect(() => {
    socket.on("understand:update", (rows) => setTally(rows));
    return () => socket.off("understand:update");
  }, []);

  async function handleClick(responseKey) {
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

  return (
    <div className="w-full rounded-lg shadow-md p-4 sm:p-6 border bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
      <SectionHeading text="Understanding Check 🤔" />
      <div className="flex justify-around w-full pt-4 pb-2">
        {RESPONSES.map(({ key, emoji, bg, active }) => (
          <button
            key={key}
            onClick={() => handleClick(key)}
            className={`emoji-btn ${bg} ${active} ${
              selected === key ? "ring-4 ring-offset-2 ring-blue-400 scale-110" : ""
            } transition-all`}
          >
            <p className="text">{emoji}</p>
          </button>
        ))}
      </div>
    </div>
  );
}

export default UnderstandCheck;