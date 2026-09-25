// src/components/ui/SiteTagline.jsx
// Slim brand strip at the top of the sign-in and register pages. Signed-in
// pages show the same tagline inside Header instead.
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
