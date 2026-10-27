"use client";

import React from "react";
import { usePathname } from "next/navigation";

export function AnimatedDiya({
  size = 40,
  className = "",
  glow = true,
}: {
  size?: number;
  className?: string;
  glow?: boolean;
}) {
  const width = size;
  const height = Math.round(size * 0.9);

  return (
    <div className={`relative inline-block select-none pointer-events-none ${className}`}>
      {/* Ambient Pulsing Glow */}
      {glow ? (
        <div
          className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full opacity-60 blur-md pointer-events-none animate-diya-glow"
          style={{
            width: size * 1.1,
            height: size * 1.1,
            background: "radial-gradient(circle, #f5c76a 0%, #f59e0b 45%, transparent 75%)",
          }}
        />
      ) : null}

      <svg
        width={width}
        height={height}
        viewBox="0 0 48 42"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="relative z-10 overflow-visible"
      >
        <defs>
          {/* Flame gradients */}
          <linearGradient id="flameOuter" x1="24" y1="2" x2="24" y2="24" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#fffbeb" />
            <stop offset="25%" stopColor="#fef08a" />
            <stop offset="60%" stopColor="#f59e0b" />
            <stop offset="100%" stopColor="#dc2626" />
          </linearGradient>
          <linearGradient id="flameInner" x1="24" y1="6" x2="24" y2="22" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="50%" stopColor="#fef08a" />
            <stop offset="100%" stopColor="#f59e0b" />
          </linearGradient>

          {/* Clay diya body gradient */}
          <linearGradient id="diyaBody" x1="8" y1="22" x2="40" y2="38" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#f59e0b" />
            <stop offset="35%" stopColor="#b45309" />
            <stop offset="70%" stopColor="#78350f" />
            <stop offset="100%" stopColor="#451a03" />
          </linearGradient>

          {/* Diya Rim Highlight */}
          <linearGradient id="diyaRim" x1="6" y1="23" x2="42" y2="23" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#fcd34d" />
            <stop offset="50%" stopColor="#fbbf24" />
            <stop offset="100%" stopColor="#d97706" />
          </linearGradient>
        </defs>

        {/* Animated Flame */}
        <g className="animate-flame origin-bottom">
          {/* Outer teardrop flame */}
          <path
            d="M24 3C22 9 18 14 18 19C18 22.3 20.7 25 24 25C27.3 25 30 22.3 30 19C30 14 26 9 24 3Z"
            fill="url(#flameOuter)"
            className="filter drop-shadow-[0_0_8px_rgba(245,199,106,0.9)]"
          />
          {/* Inner bright core */}
          <path
            d="M24 8C23 12 21 15 21 18.5C21 20.4 22.3 22 24 22C25.7 22 27 20.4 27 18.5C27 15 25 12 24 8Z"
            fill="url(#flameInner)"
          />
          {/* Flame tip spark */}
          <circle cx="24" cy="11" r="1.5" fill="#ffffff" />
        </g>

        {/* Wick */}
        <path d="M23.5 24L24.5 21" stroke="#451a03" strokeWidth="1.5" strokeLinecap="round" />

        {/* Diya Clay Base */}
        <path
          d="M6 24C6 24 10 37 24 37C38 37 42 24 42 24C42 24 34 29 24 29C14 29 6 24 6 24Z"
          fill="url(#diyaBody)"
          stroke="#d97706"
          strokeWidth="0.8"
        />

        {/* Diya Rim Lip */}
        <ellipse cx="24" cy="24" rx="18" ry="3.5" fill="url(#diyaRim)" />
        <ellipse cx="24" cy="24" rx="15" ry="2.2" fill="#78350f" opacity="0.6" />
        {/* Oil reservoir shimmer */}
        <ellipse cx="24" cy="24.2" rx="12" ry="1.5" fill="#f59e0b" opacity="0.75" />

        {/* Traditional Brass / Terracotta Pedestal */}
        <path d="M19 36H29L31 39H17L19 36Z" fill="#78350f" />
        <line x1="16" y1="39" x2="32" y2="39" stroke="#f59e0b" strokeWidth="1.2" strokeLinecap="round" />
      </svg>
    </div>
  );
}

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

/**
 * Ambient Festive Overlay:
 * Places animated diyas in the corners and subtle periodic fireworks in the
 * empty spaces, safely non-interactive (`pointer-events-none`) so clicks
 * and scrolling are never blocked.
 */
export function FestiveAtmosphere() {
  const pathname = usePathname();
  const isMap = pathname?.startsWith("/map");

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-[400] overflow-hidden select-none"
    >
      {/* Top Left Corner: Hanging festive diya */}
      <div className={`absolute ${isMap ? "top-14 left-1 scale-75 opacity-70" : "top-16 left-2 sm:left-6 opacity-85"} transition-opacity`}>
        <AnimatedDiya size={isMap ? 32 : 42} glow />
      </div>

      {/* Top Right Corner: Hanging festive diya */}
      <div className={`absolute ${isMap ? "top-14 right-1 scale-75 opacity-70" : "top-16 right-2 sm:right-6 opacity-85"} transition-opacity`}>
        <AnimatedDiya size={isMap ? 32 : 42} glow />
      </div>

      {/* Corner Fireworks - Top Left background space */}
      <div className="absolute -top-4 -left-4 sm:top-2 sm:left-12 opacity-65 scale-75 sm:scale-100">
        <AnimatedFirework delay="0.2s" color="#f5c76a" />
      </div>

      {/* Corner Fireworks - Top Right background space */}
      <div className="absolute -top-4 -right-4 sm:top-2 sm:right-12 opacity-65 scale-75 sm:scale-100">
        <AnimatedFirework delay="1.8s" color="#ff5f7e" />
      </div>

      {!isMap ? (
        <>
          {/* Mid Right background space (visible in widescreen/tablets) */}
          <div className="hidden sm:block absolute top-1/3 -right-6 opacity-60">
            <AnimatedFirework delay="3.4s" color="#3dd6c0" />
          </div>

          {/* Mid Left background space (visible in widescreen/tablets) */}
          <div className="hidden sm:block absolute top-2/3 -left-6 opacity-60">
            <AnimatedFirework delay="2.6s" color="#f5c76a" />
          </div>

          {/* Bottom Left Corner: Floating auspicious lamp above the nav bar */}
          <div className="absolute bottom-[calc(var(--nkp-bottom-ui)+10px)] left-2 sm:left-8 opacity-90">
            <AnimatedDiya size={36} glow />
          </div>

          {/* Bottom Right Corner: Floating auspicious lamp above the nav bar */}
          <div className="absolute bottom-[calc(var(--nkp-bottom-ui)+10px)] right-2 sm:right-8 opacity-90">
            <AnimatedDiya size={36} glow />
          </div>

          {/* Subtle bottom fireworks */}
          <div className="absolute bottom-[calc(var(--nkp-bottom-ui)+24px)] left-1/4 opacity-40 scale-75 sm:scale-90">
            <AnimatedFirework delay="4.2s" color="#f5c76a" />
          </div>
          <div className="absolute bottom-[calc(var(--nkp-bottom-ui)+24px)] right-1/4 opacity-40 scale-75 sm:scale-90">
            <AnimatedFirework delay="5.1s" color="#fcd34d" />
          </div>
        </>
      ) : null}
    </div>
  );
}
