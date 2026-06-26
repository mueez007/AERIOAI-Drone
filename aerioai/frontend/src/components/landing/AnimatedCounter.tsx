"use client";

import { useRef, useEffect, useState } from "react";

interface AnimatedCounterProps {
  value: string;
  suffix?: string;
  prefix?: string;
  label: string;
}

export default function AnimatedCounter({ value, suffix = "", prefix = "", label }: AnimatedCounterProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [display, setDisplay] = useState(prefix + "0" + suffix);
  const [hasAnimated, setHasAnimated] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasAnimated) {
          setHasAnimated(true);
          animateValue();
          observer.unobserve(el);
        }
      },
      { threshold: 0.5 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [hasAnimated]);

  function animateValue() {
    // Extract numeric part
    const numericMatch = value.match(/[\d.]+/);
    if (!numericMatch) {
      setDisplay(prefix + value + suffix);
      return;
    }

    const target = parseFloat(numericMatch[0]);
    const isFloat = value.includes(".");
    const duration = 2000;
    const startTime = performance.now();

    function update(currentTime: number) {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = target * eased;

      if (isFloat) {
        setDisplay(prefix + current.toFixed(1) + suffix);
      } else {
        setDisplay(prefix + Math.floor(current).toString() + suffix);
      }

      if (progress < 1) {
        requestAnimationFrame(update);
      } else {
        setDisplay(prefix + value + suffix);
      }
    }

    requestAnimationFrame(update);
  }

  return (
    <div ref={ref} className="text-center glass-card p-6">
      <p className="text-4xl md:text-5xl font-black font-[family-name:var(--font-heading)] gradient-text mb-2 tracking-tight">
        {display}
      </p>
      <p className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-[0.15em]">
        {label}
      </p>
    </div>
  );
}
