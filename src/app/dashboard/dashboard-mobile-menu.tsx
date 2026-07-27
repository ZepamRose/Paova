"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { CreditCard, Menu, Settings, Users, X } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { BusinessSwitcher } from "./business-switcher";

type BusinessOption = {
  businessId: string;
  name: string;
  role: string;
};

/**
 * Mobile-only account drawer. The dashboard header keeps one primary action
 * visible; tenant and account utilities live here instead of competing for
 * horizontal space.
 */
export function DashboardMobileMenu({
  currentBusinessId,
  businesses,
  businessName,
  role,
  canManageMembers,
  canEditBusiness,
  canManageBilling,
}: {
  currentBusinessId: string;
  businesses: BusinessOption[];
  businessName: string;
  role: "owner" | "admin" | "employee";
  canManageMembers: boolean;
  canEditBusiness: boolean;
  canManageBilling: boolean;
}) {
  const [open, setOpen] = useState(false);
  const reduced = useReducedMotion() ?? false;
  const hasAccountLinks = canManageMembers || canEditBusiness || canManageBilling;
  const roleLabel =
    role === "owner"
      ? "Propri\u00e9taire"
      : role === "admin"
        ? "Administrateur"
        : "Collaborateur";

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const item =
    "flex min-h-11 items-center gap-3 rounded-xl px-3 text-[14px] font-medium text-[var(--color-foreground)] transition-colors hover:bg-[var(--color-surface-2)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-brand)]";

  return (
    <>
      <button
        type="button"
        aria-label="Ouvrir le menu"
        aria-expanded={open}
        aria-controls="dashboard-mobile-menu"
        onClick={() => setOpen(true)}
        className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-[color-mix(in_srgb,var(--color-border)_65%,transparent)] bg-[var(--color-surface)] text-[var(--color-foreground)] shadow-[var(--elev-1)] transition-[background-color,border-color,transform] hover:bg-[var(--color-surface-2)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-brand)] active:scale-[0.97]"
      >
        <Menu size={19} strokeWidth={1.8} aria-hidden />
      </button>

      <AnimatePresence>
        {open ? (
          <div className="fixed inset-0 z-[70] sm:hidden">
          <motion.button
            type="button"
            aria-label="Fermer le menu"
            onClick={() => setOpen(false)}
            initial={reduced ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.16 }}
            className="absolute inset-0 bg-black/20 backdrop-blur-[1px]"
          />
          <motion.aside
            id="dashboard-mobile-menu"
            role="dialog"
            aria-modal="true"
            aria-label="Menu du compte"
            initial={reduced ? false : { opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={reduced ? { opacity: 0 } : { opacity: 0, x: 16 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="absolute inset-y-0 right-0 flex w-[min(21rem,calc(100vw-1.25rem))] flex-col overflow-y-auto border-l border-[color-mix(in_srgb,var(--color-border)_70%,transparent)] bg-[var(--color-surface)] px-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-[max(1rem,env(safe-area-inset-top))] shadow-[-18px_0_45px_-24px_rgba(15,23,42,0.35)]"
          >
            <div className="flex items-center justify-between gap-3">
              <p className="text-[13px] font-semibold tracking-tight text-[var(--color-muted)]">
                Espace
              </p>
              <button
                type="button"
                aria-label="Fermer le menu"
                onClick={() => setOpen(false)}
                className="inline-flex h-11 w-11 items-center justify-center rounded-xl text-[var(--color-muted)] transition-colors hover:bg-[var(--color-surface-2)] hover:text-[var(--color-foreground)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-brand)]"
              >
                <X size={19} strokeWidth={1.8} aria-hidden />
              </button>
            </div>

            <section className="mt-4 rounded-2xl border border-[color-mix(in_srgb,var(--color-brand)_15%,var(--color-border))] bg-[color-mix(in_srgb,var(--color-brand)_5%,var(--color-surface))] p-3.5 shadow-[var(--elev-1)]">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--color-muted)]">
                    Espace actif
                  </p>
                  <p className="mt-1 truncate text-[15px] font-semibold tracking-tight text-[var(--color-foreground)]">
                    {businessName}
                  </p>
                </div>
                <span className="shrink-0 rounded-full bg-[color-mix(in_srgb,var(--color-brand)_12%,transparent)] px-2.5 py-1 text-[10.5px] font-semibold text-[var(--color-brand)] ring-1 ring-[color-mix(in_srgb,var(--color-brand)_18%,transparent)]">
                  {roleLabel}
                </span>
              </div>
              {businesses.length > 1 ? (
                <div className="mt-3 border-t border-[color-mix(in_srgb,var(--color-brand)_12%,var(--color-border))] pt-3">
                  <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.09em] text-[var(--color-muted)]">
                    Changer d&apos;espace
                  </p>
                <BusinessSwitcher
                  currentBusinessId={currentBusinessId}
                  options={businesses}
                  fullWidth
                />
                </div>
              ) : null}
            </section>

            {hasAccountLinks ? (
            <section className="mt-5">
              <p className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--color-muted)]">
                Compte
              </p>
            <nav className="flex flex-col gap-1" aria-label="Compte">
              {canManageMembers ? (
                <Link href="/dashboard/settings/membres" className={item} onClick={() => setOpen(false)}>
                  <Users size={18} strokeWidth={1.75} className="text-[var(--color-muted)]" aria-hidden />
                  {"\u00c9quipe et invitations"}
                </Link>
              ) : null}
              {canEditBusiness ? (
                <Link href="/dashboard/settings" className={item} onClick={() => setOpen(false)}>
                  <Settings size={18} strokeWidth={1.75} className="text-[var(--color-muted)]" aria-hidden />
                  {"R\u00e9glages"}
                </Link>
              ) : null}
              {canManageBilling ? (
                <Link href="/dashboard/billing" className={item} onClick={() => setOpen(false)}>
                  <CreditCard size={18} strokeWidth={1.75} className="text-[var(--color-muted)]" aria-hidden />
                  Facturation
                </Link>
              ) : null}
            </nav>
            </section>
            ) : null}

            <div className="mt-auto border-t border-[color-mix(in_srgb,var(--color-border)_55%,transparent)] pt-4">
              <p className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--color-muted)]">
                Apparence
              </p>
              <div className="flex min-h-11 items-center justify-between rounded-xl px-3">
                <span className="text-[14px] font-medium text-[var(--color-foreground)]">Apparence</span>
                <ThemeToggle variant="default" className="h-11 w-11 shadow-none" />
              </div>
              <form action="/auth/signout" method="post" className="mt-4 border-t border-[color-mix(in_srgb,var(--color-border)_45%,transparent)] pt-3">
                <p className="mb-1 px-1 text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--color-muted)]">
                  Session
                </p>
                <button
                  type="submit"
                  className="flex min-h-11 w-full items-center rounded-xl px-3 text-left text-[14px] font-medium text-[var(--color-muted)] transition-colors hover:bg-[var(--color-surface-2)] hover:text-[var(--color-foreground)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-brand)]"
                >
                  Quitter
                </button>
              </form>
            </div>
          </motion.aside>
        </div>
        ) : null}
      </AnimatePresence>
    </>
  );
}
