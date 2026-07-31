"use client";

import { useFormStatus } from "react-dom";

function Spinner({ className = "" }: { className?: string }) {
  return (
    <svg
      className={`animate-spin ${className}`}
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
    >
      <circle
        cx="12"
        cy="12"
        r="9"
        stroke="currentColor"
        strokeOpacity="0.25"
        strokeWidth="2.5"
      />
      <path
        d="M21 12a9 9 0 0 0-9-9"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function PendingSubmitButton({
  className,
  style,
  idle,
  pendingLabel,
  children,
}: {
  className?: string;
  style?: React.CSSProperties;
  idle: React.ReactNode;
  pendingLabel: string;
  children?: React.ReactNode;
}) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      aria-busy={pending}
      className={className}
      style={style}
    >
      {pending ? (
        <span className="inline-flex items-center justify-center gap-2">
          <Spinner />
          <span className="whitespace-nowrap">{pendingLabel}</span>
        </span>
      ) : (
        (children ?? idle)
      )}
    </button>
  );
}
