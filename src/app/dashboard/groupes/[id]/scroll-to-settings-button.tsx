"use client";

type Props = {
  className?: string;
};

export function ScrollToSettingsButton({ className }: Props) {
  const handleClick = () => {
    const settingsEl = document.getElementById("session-settings");
    if (settingsEl) {
      settingsEl.scrollIntoView({ behavior: "smooth", block: "nearest" });
      const details = settingsEl.querySelector("details");
      if (details && !details.open) details.open = true;
    }
  };

  return (
    <button onClick={handleClick} className={className}>
      Modifier
    </button>
  );
}
