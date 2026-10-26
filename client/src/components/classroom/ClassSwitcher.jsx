// src/components/classroom/ClassSwitcher.jsx
// Lets a professor jump straight to another class they teach without going
// back to the home page. Hidden when they teach only one class.
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api/axios";
import { useAuth } from "../../context/AuthContext";

export function classLabel(cls) {
  return cls.section ? `${cls.title} · ${cls.section}` : cls.title;
}

function ClassSwitcher({ classId }) {
  const { user }  = useAuth();
  const navigate  = useNavigate();
  const [classes, setClasses] = useState([]);

  useEffect(() => {
    let ignore = false;
    api.get("/api/classes")
      .then((res) => {
        if (!ignore) setClasses(res.data.filter((c) => c.professor_id === user?.id));
      })
      .catch((err) => console.error("Failed to load your classes:", err));
    return () => { ignore = true; };
  }, [user?.id]);

  if (classes.length < 2) return null;

  return (
    <label className="flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
      Switch class
      <select
        value={String(classId)}
        onChange={(e) => navigate(`/class/${e.target.value}`)}
        className="std-text font-normal bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 px-3 py-2 rounded-md text-sm cursor-pointer outline-blue-600 focus:ring-2 focus:ring-blue-500/20"
      >
        {classes.map((c) => (
          <option key={c.id} value={String(c.id)}>{classLabel(c)}</option>
        ))}
      </select>
    </label>
  );
}

export default ClassSwitcher;
