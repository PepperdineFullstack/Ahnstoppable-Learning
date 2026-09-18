// src/components/ui/SiteTagline.jsx
// Slim brand strip rendered once in App.jsx, so it sits at the very top of
// every page (sign-in and register included).
import React from "react";

function SiteTagline() {
  return (
    <div
      role="banner"
      className="w-full bg-blue-600 dark:bg-blue-700 text-white text-center px-4 py-2
                 text-sm sm:text-base font-semibold tracking-wide"
    >
      Ahnstoppable learning: freely ask, freely learn
    </div>
  );
}

export default SiteTagline;
