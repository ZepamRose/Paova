"use client";

import Link from "next/link";

type BrandLogoProps = {
  href?: string;
  className?: string;
  /** Slightly larger mark for premium entry surfaces (login, etc.). */
  size?: "default" | "lg";
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
  const isLg = size === "lg";
  const content = (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/brand/PaovaIcon.svg"
        alt=""
        width={isLg ? 30 : 28}
        height={isLg ? 30 : 28}
        className={
          isLg ? "h-[1.875rem] w-[1.875rem] shrink-0" : "h-7 w-7 shrink-0"
        }
      />
      <span
        className={
          isLg
            ? "text-[1.1875rem] font-semibold tracking-tight"
            : "text-lg font-semibold tracking-tight"
        }
      >
        paova
      </span>
    </>
  );

  if (!href) {
    return (
      <span
        className={`inline-flex items-center ${isLg ? "gap-2" : "gap-1.5"} ${className}`}
      >
        {content}
      </span>
    );
  }

  return (
    <Link
      href={href}
      className={`inline-flex items-center ${isLg ? "gap-2" : "gap-1.5"} ${className}`}
    >
      {content}
    </Link>
  );
}
