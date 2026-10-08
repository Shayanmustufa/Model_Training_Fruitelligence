"use client";

import React, { useEffect, useRef, useState } from "react";
import { useInView } from "framer-motion";

interface AnimatedCounterProps {
  value: number;
  duration?: number; // duration in seconds
  suffix?: string;
  prefix?: string;
  decimals?: number;
}

export default function AnimatedCounter({
  value,
  duration = 2,
  suffix = "",
  prefix = "",
  decimals = 0,
}: AnimatedCounterProps) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });

  useEffect(() => {
    if (!isInView) return;

    const start = 0;
    const end = value;
    const totalFrames = Math.max(Math.floor(duration * 60), 1);
    let frame = 0;

    const counter = setInterval(() => {
      frame++;
      const progress = frame / totalFrames;
      
      // Organic ease-out function
      const easeProgress = 1 - Math.pow(1 - progress, 3);
      const currentVal = start + (end - start) * easeProgress;

      setCount(currentVal);

      if (frame >= totalFrames) {
        clearInterval(counter);
        setCount(end);
      }
    }, 1000 / 60); // 60fps

    return () => clearInterval(counter);
  }, [value, duration, isInView]);

  const formatNumber = (n: number) =>
    n.toLocaleString("en-US", {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });

  return (
    <span ref={ref} className="font-semibold tabular-nums inline-block relative">
      {/* Invisible placeholder of the FINAL value to reserve full width */}
      <span aria-hidden="true" className="invisible whitespace-nowrap">
        {prefix}{formatNumber(value)}{suffix}
      </span>
      {/* Visible animated value positioned on top */}
      <span className="absolute inset-0 whitespace-nowrap">
        {prefix}{formatNumber(count)}{suffix}
      </span>
    </span>
  );
}
