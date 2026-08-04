"use client";

import Link from "next/link";
import { useRef, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Settings, Users, ChevronDown, LogOut, User, Sun, Moon, CalendarClock, FileText } from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";
import { BusinessSwitcher } from "./business-switcher";
import { DashboardCreateControl } from "./dashboard-create-control";
import { DashboardMobileMenu } from "./dashboard-mobile-menu";
import { CreateActivityModal } from "./groupes/create-activity-modal";
import type { OpeningHours } from "@/lib/groups/lifecycle";
import { applyTheme, resolveTheme, type Theme } from "@/lib/theme";

const easing = "duration-[180ms] ease-[cubic-bezier(0.22,1,0.36,1)]";

const utilityItem = `inline-flex h-9 items-center gap-1.5 rounded-xl px-2.5 text-[13px] font-medium text-[var(--color-foreground)]/78 transition-[background-color,color,transform] ${easing} hover:bg-[var(--color-surface-2)] hover:text-[var(--color-foreground)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-brand)] active:scale-[0.98] sm:px-3`;

const navItem = `inline-flex h-9 items-center gap-2 rounded-xl px-3 text-[13.5px] font-medium transition-[background-color,color,transform,border-color] ${easing} focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-brand)] active:scale-[0.98]`;

const ROLE_LABELS: Record<"owner" | "admin" | "employee", string> = {
  owner: "Propriétaire",
  admin: "Administrateur",
  employee: "Collaborateur",
};

const menuItemBase = "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-[7px] text-left text-[12.5px] font-medium transition-colors duration-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--color-brand)]";
const menuItem = `${menuItemBase} text-[var(--color-foreground)]/85 hover:bg-[var(--color-surface-2)] hover:text-[var(--color-foreground)]`;

function UserMenu({ viewerName, role }: { viewerName: string | null; role: "owner" | "admin" | "employee" }) {
  const [open, setOpen] = useState(false);
  const [theme, setTheme] = useState<Theme>("light");
  const [mounted, setMounted] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setTheme(resolveTheme());
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  function handleTheme() {
    const next: Theme = theme === "dark" ? "light" : "dark";
    setTheme(next);
    applyTheme(next);
  }

  const displayName = viewerName ?? "Mon compte";
  const roleLabel = ROLE_LABELS[role];
  const isDark = mounted && theme === "dark";

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="true"
        aria-label={`${displayName}, ${roleLabel}`}
        className={`flex items-center gap-1.5 rounded-lg px-2 py-1.5 transition-colors ${easing} hover:bg-[var(--color-surface-2)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-brand)]`}
      >
        <span className="flex min-w-0 flex-col items-start">
          <span className="max-w-[120px] truncate text-[13px] font-medium leading-[1.3] tracking-tight text-[var(--color-foreground)]">
            {displayName}
          </span>
          <span className="text-[11px] leading-[1.3] text-[var(--color-muted)]">
            {roleLabel}
          </span>
        </span>
        <ChevronDown size={13} strokeWidth={2.1} className={`shrink-0 text-[var(--color-muted)]/70 transition-transform duration-150 ${open ? "rotate-180" : "rotate-0"}`} aria-hidden />
      </button>
      {open && (
        <div role="menu" className="absolute right-0 top-[calc(100%+6px)] z-50 w-[208px] overflow-hidden rounded-xl border border-[color-mix(in_srgb,var(--color-border)_55%,transparent)] bg-[var(--color-surface)] p-1 shadow-[var(--elev-3),0_0_0_0.5px_color-mix(in_srgb,var(--color-border)_40%,transparent)]">
          <Link href="/dashboard/settings" role="menuitem" onClick={() => setOpen(false)} className={menuItem}>
            <User size={13} strokeWidth={1.85} className="shrink-0 text-[var(--color-muted)]" aria-hidden />
            Mon compte
          </Link>
          <button type="button" role="menuitem" onClick={handleTheme} className={menuItem}>
            {isDark ? <Sun size={13} strokeWidth={1.85} className="shrink-0 text-[var(--color-muted)]" aria-hidden /> : <Moon size={13} strokeWidth={1.85} className="shrink-0 text-[var(--color-muted)]" aria-hidden />}
            {isDark ? "Mode clair" : "Mode sombre"}
          </button>
          <div className="my-1 h-px bg-[color-mix(in_srgb,var(--color-border)_55%,transparent)]" role="separator" aria-hidden />
          <form action="/auth/signout" method="post">
            <button type="submit" role="menuitem" className={`${menuItemBase} text-[color-mix(in_srgb,#dc2626_80%,var(--color-foreground))] hover:bg-[color-mix(in_srgb,#dc2626_7%,var(--color-surface-2))] hover:text-[color-mix(in_srgb,#dc2626_90%,var(--color-foreground))]`}>
              <LogOut size={13} strokeWidth={1.85} className="shrink-0" aria-hidden />
              Se déconnecter
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

type BusinessOption = {
  businessId: string;
  name: string;
  role: string;
};

type TemplateChoice = {
  id: string;
  title: string;
};

export function DashboardHeader({
  currentBusinessId,
  businessName,
  businesses,
  role,
  viewerName,
  canEditBusiness,
  canManageWaivers,
  canCreateGroups,
  canCreateGroup,
  templateChoices = [],
  openingHours = null,
}: {
  currentBusinessId: string;
  businessName: string;
  businesses: BusinessOption[];
  role: "owner" | "admin" | "employee";
  viewerName?: string | null;
  canEditBusiness: boolean;
  canManageWaivers: boolean;
  canCreateGroups: boolean;
  canCreateGroup: boolean;
  templateChoices?: TemplateChoice[];
  openingHours?: OpeningHours | null;
}) {
  const pathname = usePathname();
  const [createModalOpen, setCreateModalOpen] = useState(false);

  // Determine active section
  const isSessionsActive = pathname === "/dashboard" || pathname.startsWith("/dashboard/groupes");
  const isTemplatesActive = pathname.startsWith("/dashboard/waivers");
  const isSignaturesActive = pathname.startsWith("/dashboard/signatures");
  const isArchivesActive = pathname.startsWith("/dashboard/archives");

  return (
    <div className="flex flex-col gap-3">
      <header className="flex min-w-0 items-center justify-between gap-3 sm:gap-4">
        <BrandLogo href="/dashboard" size="sm" />

        <div className="flex min-w-0 items-center gap-2">
          <div className="hidden items-center gap-1.5 sm:flex sm:gap-2">
            <BusinessSwitcher
              currentBusinessId={currentBusinessId}
              options={businesses}
            />

            <nav aria-label="Navigation principale" className="flex items-center gap-1">
              <Link
                href="/dashboard/settings/membres"
                className={utilityItem}
                aria-label="Accès & rôles"
              >
                <Users
                  size={14}
                  strokeWidth={1.85}
                  className="text-[var(--color-muted)]"
                  aria-hidden
                />
                <span className="hidden sm:inline">{"Accès & rôles"}</span>
              </Link>
              {canEditBusiness ? (
                <Link
                  href="/dashboard/settings"
                  className={utilityItem}
                  aria-label="Réglages"
                >
                  <Settings
                    size={14}
                    strokeWidth={1.85}
                    className="text-[var(--color-muted)]"
                    aria-hidden
                  />
                  <span className="hidden sm:inline">Réglages</span>
                </Link>
              ) : null}
            </nav>

            <span
              className="mx-0.5 hidden h-4 w-px bg-[color-mix(in_srgb,var(--color-border)_70%,transparent)] sm:block"
              aria-hidden
            />

            {canCreateGroups && templateChoices.length > 0 ? (
              <>
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(true)}
                  className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-[var(--color-brand)] px-3.5 text-[13px] font-semibold text-[var(--color-on-brand)] shadow-[0_1px_0_rgba(255,255,255,0.1)_inset,var(--elev-1)] transition-[transform,filter] duration-[160ms] hover:-translate-y-px hover:brightness-[1.03] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white active:translate-y-0 active:scale-[0.98]"
                >
                  <CalendarClock size={14} strokeWidth={2} aria-hidden />
                  <span className="hidden sm:inline">Nouvelle activité</span>
                </button>
                <CreateActivityModal
                  choices={templateChoices}
                  open={createModalOpen}
                  onOpenChange={setCreateModalOpen}
                />
              </>
            ) : canManageWaivers || canCreateGroups ? (
              <DashboardCreateControl
                canManageWaivers={canManageWaivers}
                canCreateGroups={canCreateGroups}
                canCreateGroup={canCreateGroup}
              />
            ) : null}

            <UserMenu viewerName={viewerName ?? null} role={role} />
          </div>

          <div className="flex items-center gap-2 sm:hidden">
            {canCreateGroups && templateChoices.length > 0 ? (
              <>
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(true)}
                  className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-[var(--color-brand)] px-3 text-[13px] font-semibold text-[var(--color-on-brand)] shadow-[0_1px_0_rgba(255,255,255,0.1)_inset,var(--elev-1)] transition-[transform,filter] duration-[160ms] hover:-translate-y-px hover:brightness-[1.03] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white active:translate-y-0 active:scale-[0.98]"
                >
                  <CalendarClock size={14} strokeWidth={2} aria-hidden />
                </button>
              </>
            ) : canManageWaivers || canCreateGroups ? (
              <DashboardCreateControl
                canManageWaivers={canManageWaivers}
                canCreateGroups={canCreateGroups}
                canCreateGroup={canCreateGroup}
              />
            ) : null}
            <DashboardMobileMenu
              currentBusinessId={currentBusinessId}
              businesses={businesses}
              businessName={businessName}
              role={role}
              canManageMembers={true}
              canEditBusiness={canEditBusiness}
            />
          </div>
        </div>
      </header>

      {/* Primary Navigation - V2 */}
      <nav aria-label="Navigation principale" className="hidden sm:flex items-center gap-1.5 border-b border-[color-mix(in_srgb,var(--color-border)_28%,transparent)] pb-2">
        <Link
          href="/dashboard"
          className={`${navItem} ${
            isSessionsActive
              ? "bg-[color-mix(in_srgb,var(--color-brand)_9%,transparent)] text-[var(--color-brand)] border border-[color-mix(in_srgb,var(--color-brand)_20%,transparent)]"
              : "text-[var(--color-foreground)]/68 hover:bg-[var(--color-surface-2)] hover:text-[var(--color-foreground)] border border-transparent"
          }`}
          aria-current={isSessionsActive ? "page" : undefined}
        >
          <CalendarClock size={15} strokeWidth={1.85} aria-hidden />
          Activités
        </Link>

        <Link
          href="/dashboard/waivers"
          className={`${navItem} ${
            isTemplatesActive
              ? "bg-[color-mix(in_srgb,var(--color-brand)_9%,transparent)] text-[var(--color-brand)] border border-[color-mix(in_srgb,var(--color-brand)_20%,transparent)]"
              : "text-[var(--color-foreground)]/68 hover:bg-[var(--color-surface-2)] hover:text-[var(--color-foreground)] border border-transparent"
          }`}
          aria-current={isTemplatesActive ? "page" : undefined}
        >
          <FileText size={15} strokeWidth={1.85} aria-hidden />
          Modèles
        </Link>

        <span className="flex-1" />

        {(isSignaturesActive || isArchivesActive) && (
          <>
            {isSignaturesActive && (
              <span className="text-[12.5px] font-medium text-[var(--color-muted)]/80">
                Signatures
              </span>
            )}
            {isArchivesActive && (
              <span className="text-[12.5px] font-medium text-[var(--color-muted)]/80">
                Archives
              </span>
            )}
          </>
        )}
      </nav>
    </div>
  );
}
