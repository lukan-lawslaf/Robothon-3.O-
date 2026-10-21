import React, { useState, useEffect } from 'react';
import { ArrowRight, RotateCcw } from 'lucide-react';

interface MechanicalHelmetSplashProps {
  onEnter: () => void;
}

export const MechanicalHelmetSplash: React.FC<MechanicalHelmetSplashProps> = ({ onEnter }) => {
  const [animationKey, setAnimationKey] = useState(0);

  const handleReplay = () => {
    setAnimationKey((prev) => prev + 1);
  };

  return (
    <div
      key={animationKey}
      className="relative w-screen h-screen overflow-hidden select-none"
      style={{
        background: `
          radial-gradient(circle at 50% 46%, rgba(244,174,82,.32) 0%, rgba(212,98,26,.22) 35%, rgba(42,26,14,.88) 72%, #2A1A0E 100%),
          linear-gradient(128deg, #2A1A0E 0%, #4A2511 48%, #2A1A0E 100%)
        `,
      }}
      aria-label="Robothon 3.0 Mechanical Assembly Stage"
    >
      {/* Background atmospheric glow */}
      <div
        className="absolute inset-[-15%] pointer-events-none -z-10"
        style={{
          background: `
            radial-gradient(ellipse at 51% 45%, rgba(244,174,82,.28), transparent 54%),
            radial-gradient(ellipse at 5% 15%, rgba(212,98,26,.25), transparent 44%),
            radial-gradient(ellipse at 92% 86%, rgba(74,37,17,.5), transparent 45%)
          `,
          filter: 'blur(32px)',
        }}
      />

      {/* 1. Top-Left Brand Headline */}
      <h1
        className="absolute text-white font-normal leading-none tracking-tight"
        style={{
          top: '6.05%',
          left: '3.45%',
          fontSize: 'clamp(2.15rem, 4.92vw, 4.8rem)',
          letterSpacing: '-0.035em',
          textShadow: '0 1px 3px rgba(254,243,226,.2), 0 2px 6px rgba(0,0,0,.6)',
          animation: 'brand-reveal 1s cubic-bezier(.16,1,.3,1) .12s backwards',
        }}
      >
        Robothon 3.0
        <sup className="inline-block ml-1 text-[0.42em] text-[#F4AE52] align-top">TM</sup>
      </h1>

      {/* 2. Top-Right Vertical Edge Accent */}
      <span
        className="absolute w-[2px] rounded-full"
        style={{
          top: '2%',
          right: '1.2%',
          height: '10%',
          background: '#F4AE52',
          boxShadow: '0 0 10px rgba(244,174,82,.45)',
          animation: 'edge-reveal .62s cubic-bezier(.22,1,.36,1) .22s backwards',
        }}
        aria-hidden="true"
      />

      {/* 3. Center Mechanical Helmet SVG */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[85vw] max-w-[560px] h-auto flex items-center justify-center pointer-events-none">
        <svg
          className="w-full h-auto drop-shadow-2xl"
          viewBox="0 0 660 680"
          role="img"
          aria-labelledby="robotTitle robotDescription"
        >
          <title id="robotTitle">Robothon 3.0 Autonomous Helmet</title>
          <desc id="robotDescription">A warm cream robotic helmet with deep espresso visor and burnt rust orange panel seams.</desc>

          <defs>
            <linearGradient id="shell" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#FEF3E2" />
              <stop offset="56%" stopColor="#F9E5C8" />
              <stop offset="100%" stopColor="#F4AE52" />
            </linearGradient>

            <linearGradient id="visor" x1="0.1" y1="0" x2="0.9" y2="1">
              <stop offset="0%" stopColor="#3D2414" />
              <stop offset="100%" stopColor="#2A1A0E" />
            </linearGradient>

            <filter id="softEdge" x="-8%" y="-8%" width="116%" height="116%">
              <feGaussianBlur in="SourceAlpha" stdDeviation="1.15" result="blur" />
              <feOffset dy="1" result="offset" />
              <feColorMatrix in="offset" type="matrix" values="0 0 0 0 0.83 0 0 0 0 0.38 0 0 0 0 0.1 0 0 0 .25 0" />
              <feMerge>
                <feMergeNode />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            <style>
              {`
                .piece { transform-box: fill-box; transform-origin: center; }
                .rear-left    { animation: assemble-left   .9s  cubic-bezier(.16,1,.3,1) .24s backwards; }
                .rear-right   { animation: assemble-right  .9s  cubic-bezier(.16,1,.3,1) .24s backwards; }
                .ear-left     { animation: dock-left       .82s cubic-bezier(.16,1,.3,1) .34s backwards; }
                .ear-right    { animation: dock-right      .82s cubic-bezier(.16,1,.3,1) .34s backwards; }
                .jaw-left     { animation: jaw-left-in     .88s cubic-bezier(.16,1,.3,1) .43s backwards; }
                .jaw-right    { animation: jaw-right-in    .88s cubic-bezier(.16,1,.3,1) .43s backwards; }
                .jaw-center   { animation: jaw-center-in   .92s cubic-bezier(.16,1,.3,1) .50s backwards; }
                .visor        { animation: visor-seat      .92s cubic-bezier(.16,1,.3,1) .56s backwards; }
                .crown-fin    { animation: fin-seat        .96s cubic-bezier(.16,1,.3,1) .62s backwards; }
                .seams        { animation: detail-reveal   .62s cubic-bezier(.22,1,.36,1) .92s backwards; }
                .face-details { animation: detail-reveal   .68s cubic-bezier(.22,1,.36,1) 1.02s backwards; }

                @keyframes assemble-left  { from { opacity: 0; transform: translate(-30px,-15px) rotate(-2deg) scale(.96); } }
                @keyframes assemble-right { from { opacity: 0; transform: translate(30px,-15px) rotate(2deg) scale(.96); } }
                @keyframes dock-left      { from { opacity: 0; transform: translateX(-35px) scale(.96); } }
                @keyframes dock-right     { from { opacity: 0; transform: translateX(35px) scale(.96); } }
                @keyframes jaw-left-in    { from { opacity: 0; transform: translate(-20px,20px) rotate(-1.5deg); } }
                @keyframes jaw-right-in   { from { opacity: 0; transform: translate(20px,20px) rotate(1.5deg); } }
                @keyframes jaw-center-in  { from { opacity: 0; transform: translateY(24px) scale(.96); } }
                @keyframes visor-seat     { from { opacity: 0; transform: translateY(12px) scale(.92,.96); } }
                @keyframes fin-seat       { from { opacity: 0; transform: translateY(-32px) scaleY(.94); } }
                @keyframes detail-reveal  { from { opacity: 0; } }

                @keyframes brand-reveal  { from { opacity: 0; clip-path: inset(0 0 100% 0); transform: translateY(28px); } }
                @keyframes studio-reveal { from { opacity: 0; clip-path: inset(100% 0 0 0); transform: translateY(22px); } }
                @keyframes edge-reveal   { from { opacity: 0; transform: scaleY(0); } }
              `}
            </style>
          </defs>

          <g filter="url(#softEdge)">
            {/* Rear crown panels */}
            <path className="piece rear-left" fill="url(#shell)" d="M72 256c-9-36-5-55 10-76l47-63c15-14 35-20 59-12l49-15 31 152-4 46-177 12z" />
            <path className="piece rear-right" fill="url(#shell)" d="M588 256c9-36 5-55-10-76l-47-63c-15-14-35-20-59-12l-49-15-31 152 4 46 177 12z" />

            {/* Side ear housings */}
            <g className="piece ear-left">
              <path fill="url(#shell)" d="M63 251c-19 6-40 20-51 37C4 300 0 314 0 330v108c0 26 13 47 36 60l25 14 10-50 7-87z" />
              <path fill="#D4621A" d="M14 322c0-8 5-14 10-14s10 6 10 14v101c0 8-5 14-10 14s-10-6-10-14z" />
            </g>
            <g className="piece ear-right">
              <path fill="url(#shell)" d="M597 251c19 6 40 20 51 37 8 12 12 26 12 42v108c0 26-13 47-36 60l-25 14-10-50-7-87z" />
              <path fill="#D4621A" d="M626 322c0-8 5-14 10-14s10 6 10 14v101c0 8-5 14-10 14s-10-6-10-14z" />
            </g>

            {/* Lower cheek and jaw armor */}
            <path className="piece jaw-left" fill="url(#shell)" d="M69 385l82 61 48 178-101-65c-22-14-33-35-35-63z" />
            <path className="piece jaw-right" fill="url(#shell)" d="M591 385l-82 61-48 178 101-65c22-14 33-35 35-63z" />
            <path className="piece jaw-center" fill="url(#shell)" d="M151 437l45 27 24 170 30 28q7 11 20 11h120q13 0 20-11l30-28 24-170 45-27-6-34-88 38H265l-108-38z" />

            {/* Burnt Orange seams */}
            <g className="piece seams">
              <path fill="#D4621A" d="M70 407l91 61 54 166-10-7-53-153-82-55z" />
              <path fill="#D4621A" d="M590 407l-91 61-54 166 10-7 53-153 82-55z" />
            </g>

            {/* Deep Espresso Visor */}
            <path className="piece visor" fill="url(#visor)" d="M91 227c-18-4-30 8-28 28l15 111c2 14 8 24 20 32l73 45c5 4 12 6 19 6h280c7 0 14-2 19-6l73-45c12-8 18-18 20-32l15-111c2-20-10-32-28-28l-145 31c-35 7-60 11-94 11s-59-4-94-11z" />

            {/* Crown fin */}
            <g className="piece crown-fin">
              <g transform="translate(26.4 0) scale(.92 1)">
                <path fill="url(#shell)" stroke="#D4621A" strokeWidth="6" strokeLinejoin="round" d="M309 0h42c14 0 23 7 29 20l34 70c5 10 6 18 4 30l-28 141c-3 15-10 20-24 20h-72c-14 0-21-5-24-20l-28-141c-2-12-1-20 4-30l34-70c6-13 15-20 29-20z" />
                <path fill="#D4621A" d="M309 0h42v201c0 14-9 23-21 23s-21-9-21-23z" />
              </g>
            </g>

            {/* Expression and vents */}
            <g className="piece face-details">
              <path fill="#FEF3E2" d="M151 354h109v20H151z" />
              <path fill="#FEF3E2" d="M399 360l105-28 5 20-105 28z" />
              <rect x="276" y="522" width="108" height="18" rx="9" fill="url(#visor)" />
              <rect x="276" y="549" width="108" height="18" rx="9" fill="url(#visor)" />
            </g>
          </g>
        </svg>
      </div>

      {/* 4. Bottom-Right Studio Copy */}
      <p
        className="studio absolute text-[#F4AE52] font-normal italic tracking-tight"
        style={{
          right: '3.05%',
          bottom: '6.45%',
          fontSize: 'clamp(2rem, 4.9vw, 4.8rem)',
          letterSpacing: '-0.035em',
          textShadow: '0 1px 4px rgba(0,0,0,.6)',
          animation: 'studio-reveal .86s cubic-bezier(.16,1,.3,1) 1.08s backwards',
        }}
      >
        Robotics Club
      </p>

      {/* 5. Floating Interactive Action Bar (Enter Platform & Replay) */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-3 z-30">
        <button
          onClick={onEnter}
          className="group px-7 py-3 rounded-full bg-[#D4621A] hover:bg-[#F4AE52] text-[#FEF3E2] hover:text-[#2A1A0E] font-normal tracking-tight text-sm flex items-center gap-2 shadow-2xl transition-all duration-300"
          style={{ letterSpacing: '-0.025em' }}
        >
          <span>Enter Competition Platform</span>
          <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
        </button>

        <button
          onClick={handleReplay}
          title="Replay Mechanical Assembly"
          className="p-3 rounded-full bg-[rgba(42,26,14,0.7)] hover:bg-[#2A1A0E] text-[#F4AE52] border border-[#F4AE52]/30 transition-all shadow-xl"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
