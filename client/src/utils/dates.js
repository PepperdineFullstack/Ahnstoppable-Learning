// src/utils/dates.js
// Calendar days as 'YYYY-MM-DD' in the browser's local time.
//
// Built from the date's own year/month/day numbers on purpose. The shortcut
// toLocaleDateString("en-CA") is allowed to vary between browsers, and some
// return "10/8/2026" instead, which the server rejects ("asked_date must be
// YYYY-MM-DD") and which broke the date navigator ("Invalid Date").

export function dateKey(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function todayKey() {
  return dateKey(new Date());
}

// When a comment or reply was written: just the time if it was on `day` (the
// post's 'YYYY-MM-DD'), otherwise the date too, e.g. "Oct 23, 2:05 PM", so a
// reply written days later doesn't look like it came the same day.
export function formatWhen(ts, day) {
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return "";
  const time = d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  if (!day || dateKey(d) === day) return time;
  const sameYear = d.getFullYear() === new Date().getFullYear();
  const date = d.toLocaleDateString([], { month: "short", day: "numeric", ...(sameYear ? {} : { year: "numeric" }) });
  return `${date}, ${time}`;
}
