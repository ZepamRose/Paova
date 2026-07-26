"use client";

import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  useTransition,
} from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  removeMember,
  changeMemberRole,
  resendInvite,
  setMemberStatus,
} from "./actions";
import { MemberConfirmDialog } from "./member-confirm-dialog";

const EASE = [0.22, 1, 0.36, 1] as const;

const menuItem =
  "flex w-full items-center px-3 py-2 text-left text-[13px] font-medium tracking-tight text-[var(--color-foreground)]/88 transition-[background-color,color] duration-150 hover:bg-[var(--color-surface-2)] hover:text-[var(--color-foreground)] disabled:opacity-50";

const menuItemDanger =
  "flex w-full items-center px-3 py-2 text-left text-[13px] font-medium tracking-tight text-red-600/90 transition-[background-color,color] duration-150 hover:bg-[color-mix(in_srgb,#dc2626_9%,transparent)] hover:text-red-600 disabled:opacity-50 dark:text-red-400";

type ConfirmKind = "role" | "disable" | "enable" | "remove" | null;

export function MemberActionsMenu({
  businessId,
  id,
  role,
  status,
  email,
  canAssignAdmin,
  loginUrl,
}: {
  businessId: string;
  id: string;
  role: string;
  status: string;
  email: string | null;
  canAssignAdmin: boolean;
  loginUrl: string;
}) {
  const [open, setOpen] = useState(false);
  const [confirm, setConfirm] = useState<ConfirmKind>(null);
  const [nextRole, setNextRole] = useState(
    role === "admin" ? "admin" : "employee",
  );
  const [copied, setCopied] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [coords, setCoords] = useState<{
    top?: number;
    bottom?: number;
    right: number;
    openUp: boolean;
  } | null>(null);
  const menuId = useId();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion() ?? false;

  const isInvited = status === "invited";
  const isDisabled = status === "disabled";
  const isActive = status === "active";

  function updatePosition() {
    const el = buttonRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const menuHeight = menuRef.current?.offsetHeight ?? 220;
    const gap = 6;
    const spaceBelow = window.innerHeight - rect.bottom - gap;
    const spaceAbove = rect.top - gap;
    const openUp = spaceBelow < menuHeight && spaceAbove > spaceBelow;

    setCoords({
      right: Math.max(8, window.innerWidth - rect.right),
      openUp,
      ...(openUp
        ? { bottom: window.innerHeight - rect.top + gap }
        : { top: rect.bottom + gap }),
    });
  }

  useLayoutEffect(() => {
    if (!open) return;
    updatePosition();
    // Re-measure once the menu is mounted so height is accurate.
    const id = window.requestAnimationFrame(() => updatePosition());
    return () => window.cancelAnimationFrame(id);
  }, [open]);

  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: MouseEvent) {
      const target = event.target as Node;
      if (
        buttonRef.current?.contains(target) ||
        menuRef.current?.contains(target)
      ) {
        return;
      }
      setOpen(false);
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    function onReposition() {
      updatePosition();
    }

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    window.addEventListener("resize", onReposition);
    window.addEventListener("scroll", onReposition, true);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("resize", onReposition);
      window.removeEventListener("scroll", onReposition, true);
    };
  }, [open]);

  function run(action: () => Promise<void> | void) {
    startTransition(() => {
      void action();
    });
  }

  async function handleCopyLink() {
    try {
      await navigator.clipboard.writeText(loginUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      // ignore
    }
  }

  const label = email ?? "ce membre";
  const menu =
    open && coords && typeof document !== "undefined"
      ? createPortal(
          <AnimatePresence>
            <motion.div
              ref={menuRef}
              id={menuId}
              role="menu"
              initial={
                reduced
                  ? false
                  : {
                      opacity: 0,
                      y: coords.openUp ? -4 : 4,
                      scale: 0.98,
                    }
              }
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={
                reduced
                  ? { opacity: 0 }
                  : {
                      opacity: 0,
                      y: coords.openUp ? -2 : 2,
                      scale: 0.98,
                    }
              }
              transition={{ duration: 0.15, ease: EASE }}
              style={{
                right: coords.right,
                ...(coords.openUp
                  ? { bottom: coords.bottom }
                  : { top: coords.top }),
              }}
              className={`fixed z-[90] max-h-[min(20rem,calc(100vh-1rem))] min-w-[12.75rem] overflow-y-auto overflow-x-hidden rounded-xl border border-[color-mix(in_srgb,var(--color-border)_70%,transparent)] bg-[var(--color-surface)] py-1 shadow-[0_14px_36px_-12px_rgba(0,0,0,0.28),0_0_0_1px_color-mix(in_srgb,var(--color-foreground)_5%,transparent)] ${
                coords.openUp ? "origin-bottom-right" : "origin-top-right"
              }`}
            >
              <button
                type="button"
                role="menuitem"
                className={menuItem}
                onClick={() => {
                  setOpen(false);
                  setNextRole(role === "admin" ? "admin" : "employee");
                  setConfirm("role");
                }}
              >
                Modifier le rôle
              </button>

              {isInvited ? (
                <>
                  <button
                    type="button"
                    role="menuitem"
                    className={menuItem}
                    onClick={() => {
                      setOpen(false);
                      const fd = new FormData();
                      fd.set("business_id", businessId);
                      fd.set("member_id", id);
                      run(() => resendInvite(fd));
                    }}
                  >
                    Renvoyer l&apos;invitation
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    className={menuItem}
                    onClick={() => {
                      setOpen(false);
                      void handleCopyLink();
                    }}
                  >
                    {copied ? "Lien copié" : "Copier le lien"}
                  </button>
                </>
              ) : null}

              {isActive ? (
                <button
                  type="button"
                  role="menuitem"
                  className={menuItem}
                  onClick={() => {
                    setOpen(false);
                    setConfirm("disable");
                  }}
                >
                  Désactiver
                </button>
              ) : null}

              {isDisabled ? (
                <button
                  type="button"
                  role="menuitem"
                  className={menuItem}
                  onClick={() => {
                    setOpen(false);
                    setConfirm("enable");
                  }}
                >
                  Réactiver
                </button>
              ) : null}

              <div
                role="separator"
                className="my-1 h-px bg-[color-mix(in_srgb,var(--color-border)_70%,transparent)]"
              />

              <button
                type="button"
                role="menuitem"
                className={menuItemDanger}
                onClick={() => {
                  setOpen(false);
                  setConfirm("remove");
                }}
              >
                Supprimer
              </button>
            </motion.div>
          </AnimatePresence>,
          document.body,
        )
      : null;

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        type="button"
        aria-label={`Actions pour ${label}`}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        disabled={isPending}
        onClick={() => setOpen((v) => !v)}
        className={`relative inline-flex h-9 w-9 items-center justify-center rounded-xl transition-[color,background-color,transform,box-shadow] duration-[200ms] ease-[cubic-bezier(0.22,1,0.36,1)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-brand)] active:scale-[0.96] disabled:opacity-55 ${
          open
            ? "bg-[color-mix(in_srgb,var(--color-brand)_10%,var(--color-surface-2))] text-[var(--color-foreground)] shadow-[var(--elev-1)]"
            : "text-[var(--color-muted)]/75 hover:bg-[var(--color-surface-2)] hover:text-[var(--color-foreground)]"
        }`}
      >
        <motion.svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="currentColor"
          aria-hidden
          animate={open ? { scale: 1.06 } : { scale: 1 }}
          transition={{ duration: 0.16, ease: EASE }}
        >
          <circle cx="12" cy="5" r="1.55" />
          <circle cx="12" cy="12" r="1.55" />
          <circle cx="12" cy="19" r="1.55" />
        </motion.svg>
      </button>

      {menu}

      <MemberConfirmDialog
        open={confirm === "role"}
        onClose={() => setConfirm(null)}
        title="Modifier le rôle"
        description={`Choisissez le nouveau niveau d'accès pour ${label}.`}
        confirmLabel="Enregistrer"
        pendingLabel="Mise à jour…"
        onConfirm={() => {
          const fd = new FormData();
          fd.set("business_id", businessId);
          fd.set("member_id", id);
          fd.set("role", nextRole);
          setConfirm(null);
          run(() => changeMemberRole(fd));
        }}
      >
        <label className="flex flex-col gap-1.5">
          <span className="text-[13px] font-medium text-[var(--color-foreground)]">
            Rôle
          </span>
          <select
            value={nextRole}
            onChange={(e) => setNextRole(e.target.value)}
            className="h-11 rounded-xl border border-[color-mix(in_srgb,var(--color-border)_78%,var(--color-foreground))] bg-[var(--color-background)] px-3.5 text-[14px] outline-none focus:border-[var(--color-brand)] focus:shadow-[0_0_0_3px_color-mix(in_srgb,var(--color-brand)_16%,transparent)]"
          >
            <option value="employee">Collaborateur</option>
            {canAssignAdmin ? (
              <option value="admin">Administrateur</option>
            ) : null}
          </select>
        </label>
      </MemberConfirmDialog>

      <MemberConfirmDialog
        open={confirm === "disable"}
        onClose={() => setConfirm(null)}
        title="Désactiver ce membre ?"
        description={`${label} ne pourra plus accéder à l'espace tant que le compte n'est pas réactivé. Les données restent conservées.`}
        confirmLabel="Désactiver"
        pendingLabel="Désactivation…"
        onConfirm={() => {
          const fd = new FormData();
          fd.set("business_id", businessId);
          fd.set("member_id", id);
          fd.set("status", "disabled");
          setConfirm(null);
          run(() => setMemberStatus(fd));
        }}
      />

      <MemberConfirmDialog
        open={confirm === "enable"}
        onClose={() => setConfirm(null)}
        title="Réactiver ce membre ?"
        description={`${label} retrouvera l'accès selon son rôle actuel.`}
        confirmLabel="Réactiver"
        pendingLabel="Réactivation…"
        onConfirm={() => {
          const fd = new FormData();
          fd.set("business_id", businessId);
          fd.set("member_id", id);
          fd.set("status", "active");
          setConfirm(null);
          run(() => setMemberStatus(fd));
        }}
      />

      <MemberConfirmDialog
        open={confirm === "remove"}
        onClose={() => setConfirm(null)}
        title="Supprimer ce membre ?"
        description={`Retirer définitivement ${label} de l'équipe. Cette action est immédiate.`}
        confirmLabel="Supprimer"
        pendingLabel="Suppression…"
        tone="danger"
        onConfirm={() => {
          const fd = new FormData();
          fd.set("business_id", businessId);
          fd.set("member_id", id);
          setConfirm(null);
          run(() => removeMember(fd));
        }}
      />
    </div>
  );
}
