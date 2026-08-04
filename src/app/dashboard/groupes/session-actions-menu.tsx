"use client";

import { useState, useRef, useEffect } from "react";
import { MoreVertical, Eye, Edit2, CheckCircle, Archive, Trash2 } from "lucide-react";
import Link from "next/link";
import { setGroupStatus, archiveGroup, deleteGroup } from "./actions";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

type SessionActionsMenuProps = {
  sessionId: string;
  sessionName: string;
  isCompleted: boolean;
  variant?: "card" | "modal";
};

export function SessionActionsMenu({
  sessionId,
  sessionName,
  isCompleted,
  variant = "card",
}: SessionActionsMenuProps) {
  const [open, setOpen] = useState(false);
  const [isTerminating, setIsTerminating] = useState(false);
  const [isArchiving, setIsArchiving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open]);

  const buttonClass = variant === "modal"
    ? "flex h-8 w-8 items-center justify-center rounded-lg text-[var(--color-muted)] transition-[background-color,color,transform] hover:bg-[var(--color-surface-2)] hover:text-[var(--color-foreground)] active:scale-95"
    : "flex h-7 w-7 items-center justify-center rounded-lg text-[var(--color-muted)] transition-[background-color,color,transform] hover:bg-[var(--color-surface-2)] hover:text-[var(--color-foreground)] active:scale-95";

  const menuItemClass = "flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-[12.5px] font-medium transition-colors duration-100 hover:bg-[var(--color-surface-2)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--color-brand)]";

  async function handleTerminate(e: React.FormEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (isTerminating) return;
    setIsTerminating(true);
    const formData = new FormData();
    formData.append("group_id", sessionId);
    formData.append("status", "closed");
    try {
      await setGroupStatus(formData);
      setOpen(false);
    } catch (error) {
      console.error("Failed to terminate session:", error);
      setIsTerminating(false);
    }
  }

  async function handleArchive(e: React.FormEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (isArchiving) return;
    setIsArchiving(true);
    const formData = new FormData();
    formData.append("group_id", sessionId);
    try {
      await archiveGroup(formData);
      setOpen(false);
    } catch (error) {
      console.error("Failed to archive session:", error);
      setIsArchiving(false);
    }
  }

  function openDeleteDialog(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setDeleteError(null);
    setDeleteDialogOpen(true);
    setOpen(false);
  }

  async function handleDeleteConfirmed() {
    if (isDeleting) return;
    setDeleteError(null);
    setIsDeleting(true);
    const formData = new FormData();
    formData.append("group_id", sessionId);
    try {
      await deleteGroup(formData);
      // deleteGroup redirects on success — we won't reach this line
      setDeleteDialogOpen(false);
    } catch (error) {
      console.error("Failed to delete session:", error);
      setDeleteError(
        "La suppression a échoué. Vérifiez qu'aucune signature n'a été collectée pour cette activité."
      );
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <>
      <div ref={menuRef} className="relative z-50" onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setOpen(!open);
          }}
          aria-label="Actions"
          aria-expanded={open}
          aria-haspopup="true"
          className={buttonClass}
        >
          <MoreVertical size={variant === "modal" ? 16 : 15} strokeWidth={2} />
        </button>

        {open && (
          <div
            role="menu"
            className="absolute right-0 top-[calc(100%+4px)] z-[9999] min-w-[180px] overflow-hidden rounded-xl border border-[color-mix(in_srgb,var(--color-border)_60%,transparent)] bg-[var(--color-surface)] p-1 shadow-[var(--elev-3),0_0_0_0.5px_color-mix(in_srgb,var(--color-border)_40%,transparent)] animate-in fade-in slide-in-from-top-2 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <Link
              href={`/dashboard/groupes/${sessionId}`}
              role="menuitem"
              onClick={() => setOpen(false)}
              className={menuItemClass}
            >
              <Eye size={14} strokeWidth={1.9} className="text-[var(--color-muted)]" />
              Voir l&apos;activité
            </Link>

            <Link
              href={`/dashboard/groupes/${sessionId}?edit=true`}
              role="menuitem"
              onClick={() => setOpen(false)}
              className={menuItemClass}
            >
              <Edit2 size={14} strokeWidth={1.9} className="text-[var(--color-muted)]" />
              Modifier
            </Link>

            {!isCompleted && (
              <button
                type="button"
                role="menuitem"
                onClick={handleTerminate}
                disabled={isTerminating}
                className={menuItemClass}
              >
                <CheckCircle size={14} strokeWidth={1.9} className="text-[var(--color-muted)]" />
                {isTerminating ? "Fermeture..." : "Terminer maintenant"}
              </button>
            )}

            <div className="my-1 h-px bg-[color-mix(in_srgb,var(--color-border)_50%,transparent)]" />

            <button
              type="button"
              role="menuitem"
              onClick={handleArchive}
              disabled={isArchiving}
              className={menuItemClass}
            >
              <Archive size={14} strokeWidth={1.9} className="text-[var(--color-muted)]" />
              {isArchiving ? "Archivage..." : "Archiver"}
            </button>

            <div className="my-1 h-px bg-[color-mix(in_srgb,var(--color-border)_50%,transparent)]" />

            <button
              type="button"
              role="menuitem"
              onClick={openDeleteDialog}
              disabled={isDeleting}
              className={`${menuItemClass} text-[color-mix(in_srgb,#dc2626_80%,var(--color-foreground))] hover:bg-[color-mix(in_srgb,#dc2626_7%,var(--color-surface-2))] hover:text-[color-mix(in_srgb,#dc2626_90%,var(--color-foreground))]`}
            >
              <Trash2 size={14} strokeWidth={1.9} />
              {isDeleting ? "Suppression..." : "Supprimer"}
            </button>
          </div>
        )}
      </div>

      {/* ── Confirmation modal ──────────────────────────────────────── */}
      <ConfirmDialog
        open={deleteDialogOpen}
        onClose={() => {
          if (!isDeleting) {
            setDeleteDialogOpen(false);
            setDeleteError(null);
          }
        }}
        onConfirm={handleDeleteConfirmed}
        title="Supprimer cette activité ?"
        description={
          <p>
            Cette action est définitive.{" "}
            L&apos;activité sera supprimée uniquement si{" "}
            <strong className="font-semibold text-[var(--color-foreground)]">
              aucune signature
            </strong>{" "}
            n&apos;a encore été collectée.
          </p>
        }
        confirmLabel="Supprimer définitivement"
        pendingLabel="Suppression…"
        tone="danger"
        pending={isDeleting}
      >
        {deleteError ? (
          <p
            role="alert"
            className="rounded-xl border border-[color-mix(in_srgb,#dc2626_28%,var(--color-border))] bg-[color-mix(in_srgb,#dc2626_6%,var(--color-surface))] px-3.5 py-2.5 text-[12.5px] leading-snug text-[color-mix(in_srgb,#b91c1c_90%,var(--color-foreground))]"
          >
            {deleteError}
          </p>
        ) : null}
      </ConfirmDialog>
    </>
  );
}
