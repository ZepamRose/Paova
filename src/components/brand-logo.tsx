"use client";

import Link from "next/link";

type BrandLogoProps = {
  href?: string;
  className?: string;
  /** `sm` = quiet product chrome (dashboard). `lg` = entry surfaces. */
  size?: "sm" | "default" | "lg";
};

/** Official mark: 100 x 128.3 viewBox, so width = height x 0.7794. */
const MARK_RATIO = 100 / 128.3;

/**
 * Product chrome: the official symbol next to the product name set in the UI
 * font. Deliberately NOT the full logotype — that one carries the Newsreader
 * wordmark, which needs 96 px of width minimum (see branding/README.md), and
 * this component renders at 22-30 px tall.
 *
 * The mark is portrait, not square: width is derived from height rather than
 * assumed equal, and `w-auto` keeps the ratio intact whatever the height class.
 */
export function BrandLogo({
  href = "/",
  className = "",
  size = "default",
}: BrandLogoProps) {
  const iconPx = size === "lg" ? 30 : size === "sm" ? 22 : 28;
  const iconClass =
    size === "lg"
      ? "h-[1.875rem] w-auto shrink-0"
      : size === "sm"
        ? "h-[1.375rem] w-auto shrink-0 opacity-90"
        : "h-7 w-auto shrink-0";
  const wordClass =
    size === "lg"
      ? "text-[1.1875rem] font-semibold tracking-tight"
      : size === "sm"
        ? "text-[0.9375rem] font-medium tracking-[-0.02em] text-[var(--color-foreground)]/72"
        : "text-lg font-semibold tracking-tight";
  const gap = size === "lg" ? "gap-2" : "gap-1.5";

  const content = (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/brand/paova-mark.svg"
        alt=""
        width={Math.round(iconPx * MARK_RATIO)}
        height={iconPx}
        className={iconClass}
      />
      <span className={wordClass}>paova</span>
    </>
  );

  if (!href) {
    return (
      <span className={`inline-flex items-center ${gap} ${className}`}>
        {content}
      </span>
    );
  }

  return (
    <Link
      href={href}
      className={`inline-flex items-center ${gap} rounded-md transition-opacity duration-150 hover:opacity-80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-brand)] ${className}`}
    >
      {content}
    </Link>
  );
}
