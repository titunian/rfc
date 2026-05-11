"use client";

import { useEffect, useState, type ReactNode } from "react";

/**
 * Shared glass-morphic top bar.
 *
 * One component used by /, /dashboard, /p/[slug], /self-host so the
 * chrome is consistent — same height, same blur, same logo position.
 * Page-specific content (breadcrumb, actions) goes in children.
 *
 * Layout:
 *   [Logo]  ...children...
 *
 * Children are responsible for their own layout (typically a flex
 * row with a left context slot and a right action cluster).
 *
 * Variants:
 *   - "floating" (default): always elevated chrome (border + shadow +
 *     glass). Used by /dashboard and /p/[slug] where the bar always
 *     sits over scrolling content.
 *   - "scroll-elevate": starts flat (no border, no shadow, no glass)
 *     and gains chrome on scroll past ~16px. Used by the landing
 *     page so the bar reads as part of the page until you scroll.
 */
export function TopBar({
  children,
  variant = "floating",
}: {
  children?: ReactNode;
  variant?: "floating" | "scroll-elevate";
}) {
  // Floating variant is always elevated. Scroll-elevate starts unelevated.
  const [elevated, setElevated] = useState(variant !== "scroll-elevate");

  useEffect(() => {
    if (variant !== "scroll-elevate") return;
    const onScroll = () => {
      setElevated(window.scrollY > 16);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [variant]);

  return (
    <header
      data-chrome
      data-elevated={elevated ? "true" : "false"}
      data-variant={variant}
      className="orfc-top-bar sticky top-3 z-40 mx-3 sm:mx-4 rounded-2xl"
    >
      <div className="relative max-w-[1400px] mx-auto px-3 sm:px-4 h-[44px] flex items-center gap-3">
        <Logo />
        <div className="flex-1 flex items-center justify-between min-w-0 gap-3">
          {children}
        </div>
      </div>
    </header>
  );
}

/**
 * Logo mark + wordmark. The mark is a tiny rounded square with the
 * "o" silhouette as a stroked circle and a smaller filled dot — a
 * doc with a comment beside it. Hand-tuned so it sits visually
 * balanced next to the SF Pro Text wordmark.
 */
export function Logo({ size = 18 }: { size?: number }) {
  return (
    <a
      href="/"
      className="group flex items-center gap-2 shrink-0"
      aria-label="orfc home"
    >
      <span
        className="inline-flex items-center justify-center text-[var(--fg)]"
        style={{ width: size, height: size }}
        aria-hidden="true"
      >
        <svg
          width={size}
          height={size}
          viewBox="0 0 20 20"
          xmlns="http://www.w3.org/2000/svg"
        >
          <rect
            x="0.5"
            y="0.5"
            width="19"
            height="19"
            rx="5"
            fill="currentColor"
          />
          <circle
            cx="8.2"
            cy="9.5"
            r="3.4"
            fill="none"
            stroke="var(--bg)"
            strokeWidth="1.6"
          />
          <circle cx="13.7" cy="13.2" r="1.6" fill="var(--bg)" />
        </svg>
      </span>
      <span
        className="text-[14px] font-semibold text-[var(--fg)] group-hover:text-[var(--fg-secondary)] transition-colors"
        style={{ letterSpacing: "-0.018em" }}
      >
        orfc
      </span>
    </a>
  );
}
