"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useRouter } from "next/navigation";

/** Ephemeral success / warning toast for the team page. */
export function MembersStatusBanner({
  message,
  tone = "success",
}: {
  message: string;
  tone?: "success" | "warning";
}) {
  const router = useRouter();
  const reduced = useReducedMotion() ?? false;
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    setVisible(true);
    const id = window.setTimeout(() => {
      setVisible(false);
      router.replace("/dashboard/settings/membres", { scroll: false });
    }, 3800);
    return () => window.clearTimeout(id);
  }, [message, router]);

  const surface =
    tone === "warning"
      ? "border-[color-mix(in_srgb,var(--color-border)_75%,transparent)] bg-[var(--color-surface)] text-[var(--color-foreground)]"
      : "border-[color-mix(in_srgb,var(--color-brand)_24%,var(--color-border))] bg-[color-mix(in_srgb,var(--color-brand)_7%,var(--color-surface))] text-[var(--color-foreground)]";

  return (
    <AnimatePresence>
      {visible ? (
        <motion.p
          role={tone === "warning" ? "alert" : "status"}
          aria-live="polite"
          initial={reduced ? false : { opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reduced ? { opacity: 0 } : { opacity: 0, y: -4 }}
          transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
          className={`rounded-2xl border px-4 py-3 text-[13.5px] leading-relaxed shadow-[var(--elev-1)] ${surface}`}
        >
          {message}
        </motion.p>
      ) : null}
    </AnimatePresence>
  );
}
