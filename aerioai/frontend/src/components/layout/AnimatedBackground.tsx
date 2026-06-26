"use client";

import { useEffect, useState } from "react";

export default function AnimatedBackground() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <div className="animated-bg-container">
      <div className="animated-light light-1" />
      <div className="animated-light light-2" />
      <div className="animated-light light-3" />
    </div>
  );
}
