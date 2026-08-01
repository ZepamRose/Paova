"use client";

export function NewSessionButton({
  hasExistingSessions,
  className,
}: {
  hasExistingSessions: boolean;
  className: string;
}) {
  return (
    <button
      type="button"
      onClick={() => {
        window.location.href = '/dashboard';
        setTimeout(() => window.dispatchEvent(new CustomEvent('open-new-session-modal')), 100);
      }}
      className={className}
    >
      {hasExistingSessions ? "Nouvelle session" : "Créer une session"}
    </button>
  );
}
