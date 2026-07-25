import type { ReactNode } from "react";

/**
 * Caps tall lists (~12–15 rows) so the page stays put and the list scrolls.
 */
export function ScrollablePanel({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`max-h-[min(36rem,70vh)] overflow-y-auto overscroll-contain [scrollbar-gutter:stable] ${className}`}
    >
      {children}
    </div>
  );
}
