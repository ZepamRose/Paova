"use client";

import Link from "next/link";

type BrandLogoProps = {
  href?: string;
  className?: string;
  /** `sm` = quiet product chrome (dashboard). `lg` = entry surfaces. */
  size?: "sm" | "default" | "lg";
};

/**
 * Always keeps the sage-green P mark.
 * Only the wordmark text follows the theme (light/dark).
 */
export function BrandLogo({
  href = "/",
  className = "",
  size = "default",
}: BrandLogoProps) {
  const iconPx = size === "lg" ? 30 : size === "sm" ? 22 : 28;
  const iconClass =
    size === "lg"
      ? "h-[1.875rem] w-[1.875rem] shrink-0"
      : size === "sm"
        ? "h-[1.375rem] w-[1.375rem] shrink-0 opacity-90"
        : "h-7 w-7 shrink-0";
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
        src="/brand/PaovaIcon.svg"
        alt=""
        width={iconPx}
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
