// src/components/ui/AutoGrowTextarea.jsx
// A textarea that grows with its text, from minRows up to maxHeight (then it
// scrolls). Pass the usual textarea props; `value` must be controlled.
import React, { useLayoutEffect, useRef } from "react";

function AutoGrowTextarea({ value, minRows = 3, maxHeight = 360, className = "", ...props }) {
  const ref = useRef(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";                       // shrink first, so deleting text shrinks the box
    const next = Math.min(el.scrollHeight, maxHeight);
    el.style.height = `${next}px`;
    el.style.overflowY = el.scrollHeight > maxHeight ? "auto" : "hidden";
  }, [value, maxHeight]);

  return <textarea ref={ref} rows={minRows} value={value} className={`resize-none ${className}`} {...props} />;
}

export default AutoGrowTextarea;
