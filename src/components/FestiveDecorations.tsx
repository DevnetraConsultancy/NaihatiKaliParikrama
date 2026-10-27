"use client";

import React from "react";

/**
 * Animated fireworks burst with expanding golden rays, sparkling embers,
 * and festive colored particles (sindoor red, gold, emerald).
 */
export function AnimatedFirework({
  className = "",
  delay = "0s",
  color = "#f5c76a",
}: {
  className?: string;
  delay?: string;
  color?: string;
}) {
  return (
    <div
      className={`pointer-events-none relative size-24 animate-firework select-none ${className}`}
      style={{ animationDelay: delay }}
    >
      <svg viewBox="0 0 100 100" className="size-full overflow-visible">
        {/* 12 radial burst rays */}
        {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((deg, i) => (
          <g key={deg} transform={`rotate(${deg} 50 50)`}>
            {/* Sparkling star burst line */}
            <line
              x1="50"
              y1="34"
              x2="50"
              y2="16"
              stroke={i % 3 === 0 ? "#f5c76a" : i % 3 === 1 ? "#ff5f7e" : "#3dd6c0"}
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeDasharray="2 3"
              className="animate-sparkle"
            />
            {/* Outer burst ember */}
            <circle
              cx="50"
              cy="10"
              r={i % 2 === 0 ? "2" : "1.2"}
              fill={i % 2 === 0 ? color : "#ffffff"}
              className="animate-pulse"
            />
          </g>
        ))}
        {/* Center Flash */}
        <circle cx="50" cy="50" r="4" fill="#fffdf0" className="animate-ping" />
      </svg>
    </div>
  );
}
