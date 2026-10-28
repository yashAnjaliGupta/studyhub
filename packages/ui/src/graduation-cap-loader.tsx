'use client';

import React from 'react';

export interface GraduationCapLoaderProps {
  size?: number; // width in pixels, defaults to 64
  text?: string;
  className?: string;
  showShadow?: boolean;
}

export function GraduationCapLoader({
  size = 64,
  text,
  className = '',
  showShadow = true,
}: GraduationCapLoaderProps) {
  return (
    <div className={`flex flex-col items-center justify-center gap-3 ${className}`}>
      <div
        className="relative flex items-center justify-center"
        style={{ width: size, height: size * 1.05 }}
      >
        <svg
          viewBox="0 0 120 120"
          className="w-full h-full overflow-visible"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <style>{`
              @keyframes studyhub-cap-float {
                0%, 100% {
                  transform: translateY(0px) rotate(0deg);
                }
                50% {
                  transform: translateY(-9px) rotate(-3deg);
                }
              }
              @keyframes studyhub-cap-shadow {
                0%, 100% {
                  transform: scale(1);
                  opacity: 0.22;
                }
                50% {
                  transform: scale(0.65);
                  opacity: 0.08;
                }
              }
              @keyframes studyhub-tassel-sway {
                0%, 100% {
                  transform: rotate(0deg);
                }
                50% {
                  transform: rotate(9deg);
                }
              }
              .studyhub-cap-group {
                animation: studyhub-cap-float 2s ease-in-out infinite;
                transform-origin: 60px 48px;
              }
              .studyhub-cap-shadow-el {
                animation: studyhub-cap-shadow 2s ease-in-out infinite;
                transform-origin: 60px 104px;
              }
              .studyhub-tassel-el {
                animation: studyhub-tassel-sway 2s ease-in-out infinite;
                transform-origin: 60px 36.5px;
              }
            `}</style>

            {/* Top face gradient matching user upload */}
            <linearGradient id="shCapTop" x1="15%" y1="10%" x2="85%" y2="90%">
              <stop offset="0%" stopColor="#356cb1" />
              <stop offset="50%" stopColor="#25518b" />
              <stop offset="100%" stopColor="#1a3d6d" />
            </linearGradient>

            {/* Left rim thickness */}
            <linearGradient id="shCapLeftRim" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#1c3e6c" />
              <stop offset="100%" stopColor="#142c4d" />
            </linearGradient>

            {/* Right rim thickness */}
            <linearGradient id="shCapRightRim" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#152f53" />
              <stop offset="100%" stopColor="#0f213b" />
            </linearGradient>

            {/* Skullcap underneath */}
            <linearGradient id="shCapBase" x1="20%" y1="0%" x2="80%" y2="100%">
              <stop offset="0%" stopColor="#224778" />
              <stop offset="60%" stopColor="#183459" />
              <stop offset="100%" stopColor="#10223b" />
            </linearGradient>
          </defs>

          {/* Animated ground shadow */}
          {showShadow && (
            <ellipse
              cx="60"
              cy="104"
              rx="28"
              ry="6.5"
              fill="#1e293b"
              className="studyhub-cap-shadow-el"
            />
          )}

          {/* Moving Floating Graduation Cap */}
          <g className="studyhub-cap-group">
            {/* Base skullcap (curved dome underneath) */}
            <path
              d="M 38 48 C 36 68, 44 76, 60 76 C 76 76, 84 68, 82 48 C 76 53, 44 53, 38 48 Z"
              fill="url(#shCapBase)"
            />

            {/* Skullcap inner fold contour */}
            <path
              d="M 40 50 C 44 68, 76 68, 80 50 C 74 54, 46 54, 40 50 Z"
              fill="#0d1b30"
              opacity="0.3"
            />

            {/* Board Left Rim / Thickness */}
            <path
              d="M 14 36 L 60 56 L 60 60.5 L 14 40.5 Z"
              fill="url(#shCapLeftRim)"
            />

            {/* Board Right Rim / Thickness */}
            <path
              d="M 60 56 L 106 36 L 106 40.5 L 60 60.5 Z"
              fill="url(#shCapRightRim)"
            />

            {/* Mortarboard Diamond Top Surface */}
            <polygon
              points="60,18 106,36 60,56 14,36"
              fill="url(#shCapTop)"
              stroke="#437ec7"
              strokeWidth="0.8"
            />

            {/* Diamond surface light reflection */}
            <polygon
              points="60,20 102,36 60,53 18,36"
              fill="none"
              stroke="#689de0"
              strokeWidth="0.5"
              opacity="0.45"
            />

            {/* Center button */}
            <ellipse
              cx="60"
              cy="36.5"
              rx="3.5"
              ry="2"
              fill="#1b3d6b"
              stroke="#5089d4"
              strokeWidth="0.6"
            />

            {/* Animated Tassel cord dangling to the right */}
            <path
              d="M 60 36.5 Q 82 39 88 52"
              fill="none"
              stroke="#ffb940"
              strokeWidth="1.8"
              strokeLinecap="round"
              className="studyhub-tassel-el"
            />
            {/* Tassel fringe */}
            <circle
              cx="88"
              cy="53"
              r="2.4"
              fill="#ffb940"
              className="studyhub-tassel-el"
            />
          </g>
        </svg>
      </div>

      {text && (
        <p className="text-xs font-semibold tracking-wide text-slate-500 animate-pulse text-center">
          {text}
        </p>
      )}
    </div>
  );
}

export default GraduationCapLoader;
