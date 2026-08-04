"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

/**
 * Home-page artwork. Each illustration prefers a real image dropped into
 * `public/illustrations/…`; if that file is missing it falls back to the
 * hand-coded SVG below, so the page always renders. Pencil sketches are
 * inverted in dark mode so they read as white-on-dark.
 *
 * To use the real artwork, save these files (transparent PNG):
 *   public/illustrations/bridge.png    — hero (outdated system → real world)
 *   public/illustrations/pledge.png    — crowd + "OUR VOICES. OUR FUTURE." banner
 *   public/illustrations/sunrise.png   — people watching the sunrise
 *   public/illustrations/mascot.png    — the mascot (kept in colour, not inverted)
 */

const sketch = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

/** Image that flips to a fallback node if the file 404s. `invertDark` inverts pencil sketches in dark mode. */
function ArtImage({
  src,
  alt,
  className,
  fallback,
  invertDark = true,
}: {
  src: string;
  alt: string;
  className?: string;
  fallback: React.ReactNode;
  invertDark?: boolean;
}) {
  const [failed, setFailed] = useState(false);
  if (failed) return <>{fallback}</>;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      onError={() => setFailed(true)}
      className={cn(
        "h-auto w-full object-contain",
        invertDark && "dark:invert dark:hue-rotate-180",
        className
      )}
    />
  );
}

/* ----------------------------- Bridge (hero) ----------------------------- */

export function BridgeIllustration({ className }: { className?: string }) {
  return (
    <ArtImage
      src="/illustrations/bridge.png"
      alt="A person crossing a plank bridge from an outdated system to real-world possibilities"
      className={className}
      fallback={<BridgeSvg className={cn("text-[hsl(var(--ink))]", className)} />}
    />
  );
}

function BridgeSvg({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 760 320" className={className} role="img" aria-label="Bridge illustration">
      <g {...sketch}>
        <path d="M120 46c-14 0-20 12-8 16 2 10 20 8 22 0 12 2 16-12 4-16-2-8-16-8-18 0z" opacity="0.5" />
        <path d="M600 40c-12 0-17 10-7 14 2 9 17 7 19 0 10 2 14-10 3-14-2-7-13-7-15 0z" opacity="0.5" />
        <path d="M20 200c40-6 120-4 150 0l6 96H26z" />
        <path d="M40 220c18 3 60 3 96 0M44 244c20 3 52 3 82 1M52 268c16 2 44 2 66 1" opacity="0.5" />
        <path d="M584 196c40-6 130-6 156 0v100H590z" />
        <path d="M604 218c20 3 66 3 104 0M610 244c22 3 60 3 92 1M618 270c18 2 48 2 72 1" opacity="0.5" />
        <path d="M176 214l408-14" />
        <path d="M176 226l408-14" />
        <g transform="translate(300 150)">
          <circle cx="8" cy="0" r="11" />
          <path d="M8 11v34" />
          <path d="M8 20l-16 8M8 20l15 5" />
          <path d="M8 45l-12 22M8 45l13 20" />
          <path d="M-6 6c-9 3-11 20-3 30l9-3z" opacity="0.8" />
        </g>
        <g transform="translate(600 120)">
          <path d="M0 70c14-8 30-20 44-34" />
          <path d="M44 36c8-6 18-4 22 4l14 26c4 8 0 14-8 16l-40 12c-10 3-18-2-14-12z" />
          <path d="M64 40l16-24c4-6 12-6 14 2" />
        </g>
      </g>
      <text x="70" y="250" fontSize="20" fontWeight="700" fill="currentColor" opacity="0.85">OUTDATED</text>
      <text x="70" y="274" fontSize="20" fontWeight="700" fill="currentColor" opacity="0.85">SYSTEM</text>
      <text x="600" y="250" fontSize="20" fontWeight="700" fill="currentColor" opacity="0.85">REAL WORLD</text>
      <text x="600" y="274" fontSize="20" fontWeight="700" fill="currentColor" opacity="0.85">POSSIBILITIES</text>
    </svg>
  );
}

/* ---------------------------- Crowd (pledge) ---------------------------- */

export function CrowdBanner({ className }: { className?: string }) {
  return (
    <ArtImage
      src="/illustrations/pledge.png"
      alt="A crowd holding a banner reading our voices our future, one pledge can change everything"
      className={className}
      fallback={<CrowdSvg className={cn("text-[hsl(var(--ink))]", className)} />}
    />
  );
}

function CrowdSvg({ className }: { className?: string }) {
  const people = Array.from({ length: 11 });
  return (
    <svg viewBox="0 0 760 300" className={className} role="img" aria-label="Crowd with banner">
      <g {...sketch}>
        {people.map((_, i) => {
          const x = 40 + i * 66;
          const y = 210 + (i % 2 === 0 ? 0 : 10);
          return (
            <g key={i} transform={`translate(${x} ${y})`}>
              <circle cx="0" cy="0" r="13" />
              <path d="M-20 46c2-18 10-26 20-26s18 8 20 26" />
            </g>
          );
        })}
        <path d="M120 214l24-70M300 214l18-70M470 214l-16-70M640 214l-26-70" opacity="0.7" />
        <path d="M110 66c180-16 360-16 540 0l6 78c-184-14-368-14-552 0z" />
      </g>
      <text x="380" y="112" textAnchor="middle" fontSize="34" fontWeight="800" fill="currentColor" style={{ letterSpacing: "1px" }}>
        OUR VOICES. OUR FUTURE.
      </text>
      <text x="380" y="140" textAnchor="middle" fontSize="17" fill="currentColor" opacity="0.8">
        One pledge can change everything.
      </text>
    </svg>
  );
}

/* --------------------------- Sunrise (join) --------------------------- */

export function SunriseCrowd({ className }: { className?: string }) {
  return (
    <ArtImage
      src="/illustrations/sunrise.jpg"
      alt="A group of people watching the sunrise over mountains"
      className={className}
      invertDark={false}
      fallback={<SunriseSvg className={cn("text-[hsl(var(--ink))]", className)} />}
    />
  );
}

function SunriseSvg({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 760 300" className={className} role="img" aria-label="People watching a sunrise">
      <circle cx="380" cy="150" r="52" fill="currentColor" opacity="0.12" />
      <g {...sketch}>
        <g opacity="0.55">
          <path d="M380 78v-22M380 244v18M308 150h-24M476 150h22M330 100l-14-14M430 100l14-14M330 200l-14 14M430 200l14 14" />
        </g>
        <circle cx="380" cy="150" r="46" opacity="0.7" />
        <path d="M20 250l150-150 90 120 80-90 130 140" opacity="0.7" />
        <path d="M330 250l120-110 100 110 110-90 20 30" opacity="0.7" />
        <path d="M0 252h760" />
        <g transform="translate(250 150)">
          {[0, 55, 110, 165, 220].map((dx, i) => (
            <g key={i} transform={`translate(${dx} ${i % 2 ? 6 : 0})`}>
              <circle cx="0" cy="0" r="14" />
              <path d="M-22 100c0-52 8-72 22-72s22 20 22 72z" />
            </g>
          ))}
          <path d="M-14 40c30-10 60-10 84 0M40 40c30-10 60-10 84 0M96 40c26-8 52-8 78 0" opacity="0.6" />
        </g>
      </g>
    </svg>
  );
}

/* ------------------------------- Mascot ------------------------------- */

export function DinoMark({ className }: { className?: string }) {
  return (
    <ArtImage
      src="/illustrations/mascot.png"
      alt="Beyond Syllabus mascot"
      className={className}
      invertDark={false}
      fallback={<DinoSvg className={cn("text-primary", className)} />}
    />
  );
}

function DinoSvg({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" className={className} role="img" aria-label="Mascot">
      <g fill="currentColor">
        <path d="M18 70c-6-2-9-9-6-16 2-6 8-8 8-16 0-16 14-28 32-28 14 0 22 8 24 8 4 0 6-4 10-4 3 0 4 3 2 6-2 2-5 3-5 6 2 12-2 22-10 29 3 3 5 7 5 12 0 2-2 3-4 3s-4-1-4-3c0-4-2-7-5-9-4 2-9 3-14 3l2 8c1 3-1 5-4 5s-4-2-5-5l-2-7c-5-1-9-3-12-6-2 3-2 7 0 11 1 3-1 5-4 5s-4-2-5-5c-2-5-2-9 0-13z" />
        <circle cx="58" cy="40" r="4" fill="hsl(var(--background))" />
        <circle cx="58" cy="40" r="2" fill="currentColor" />
      </g>
    </svg>
  );
}
