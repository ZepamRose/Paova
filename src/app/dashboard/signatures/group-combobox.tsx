"use client";

import {
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Check, ChevronDown, Search } from "lucide-react";
import { GroupIcon } from "@/components/groups/group-icon";
import { GROUP_FILTER_ANY } from "@/lib/search";

const EASE = [0.22, 1, 0.36, 1] as const;
const POPOVER_MARGIN = 6;
const MAX_VISIBLE_ROWS = 7;
const ROW_HEIGHT = 34;

export type GroupComboboxOption = {
  id: string;
  name: string;
  status?: string;
};

type Placement = "top" | "bottom";
type PopoverPos = {
  top: number;
  left: number;
  width: number;
  placement: Placement;
};

function normalize(value: string) {
  return value.trim().toLowerCase();
}

/**
 * Searchable group picker — a plain <select> becomes unmanageable once a
 * business accumulates dozens/hundreds of groups over time. This adds
 * type-to-filter, while still separating "Actifs" from "Archivés" so the
 * two never blur together.
 */
export function GroupCombobox({
  id,
  groups,
  value,
  onChange,
  disabled = false,
  placeholder = "Tous les groupes",
}: {
  id?: string;
  groups: GroupComboboxOption[];
  value: string;
  onChange: (next: string) => void;
  disabled?: boolean;
  placeholder?: string;
}) {
  const reduced = useReducedMotion() ?? false;
  const panelId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<PopoverPos | null>(null);
  const [query, setQuery] = useState("");
  const [highlight, setHighlight] = useState(0);

  const selected = groups.find((g) => g.id === value) ?? null;

  const filtered = useMemo(() => {
    const q = normalize(query);
    if (!q) return groups;
    return groups.filter((g) => normalize(g.name).includes(q));
  }, [groups, query]);

  const activeGroups = useMemo(
    () => filtered.filter((g) => g.status !== "archived"),
    [filtered],
  );
  const archivedGroups = useMemo(
    () => filtered.filter((g) => g.status === "archived"),
    [filtered],
  );
  const showAllOption = normalize(query).length === 0;

  const flatItems = useMemo(() => {
    const items: { id: string; label: string }[] = [];
    if (showAllOption) items.push({ id: GROUP_FILTER_ANY, label: placeholder });
    for (const g of activeGroups) items.push({ id: g.id, label: g.name });
    for (const g of archivedGroups) items.push({ id: g.id, label: g.name });
    return items;
  }, [showAllOption, placeholder, activeGroups, archivedGroups]);

  useEffect(() => {
    setHighlight(0);
  }, [query, open]);

  useEffect(() => {
    if (!open) return;
    setQuery("");
    const raf = window.requestAnimationFrame(() => inputRef.current?.focus());
    return () => window.cancelAnimationFrame(raf);
  }, [open]);

  useLayoutEffect(() => {
    if (!open) {
      setPos(null);
      return;
    }

    function computePos(): PopoverPos {
      const trigger = triggerRef.current;
      const rect = trigger?.getBoundingClientRect();
      const width = Math.max(rect?.width ?? 240, 220);
      if (!rect) return { top: 0, left: 0, width, placement: "bottom" };

      let left = rect.left;
      left = Math.min(left, window.innerWidth - width - POPOVER_MARGIN);
      left = Math.max(POPOVER_MARGIN, left);

      const height = popoverRef.current?.offsetHeight ?? 0;
      const spaceBelow = window.innerHeight - rect.bottom;
      const placement: Placement =
        height > 0 &&
        spaceBelow < height + POPOVER_MARGIN &&
        rect.top > height + POPOVER_MARGIN
          ? "top"
          : "bottom";
      const top =
        placement === "bottom"
          ? rect.bottom + POPOVER_MARGIN
          : Math.max(POPOVER_MARGIN, rect.top - height - POPOVER_MARGIN);

      return { top, left, width, placement };
    }

    setPos((prev) => prev ?? computePos());
    const raf = window.requestAnimationFrame(() => setPos(computePos()));

    function reposition() {
      setPos(computePos());
    }

    window.addEventListener("scroll", reposition, true);
    window.addEventListener("resize", reposition);
    return () => {
      window.cancelAnimationFrame(raf);
      window.removeEventListener("scroll", reposition, true);
      window.removeEventListener("resize", reposition);
    };
  }, [open, flatItems.length]);

  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: MouseEvent) {
      const target = event.target as Node;
      if (rootRef.current?.contains(target)) return;
      if (popoverRef.current?.contains(target)) return;
      setOpen(false);
    }

    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [open]);

  useEffect(() => {
    const row = listRef.current?.querySelector<HTMLElement>(
      `[data-index="${highlight}"]`,
    );
    row?.scrollIntoView({ block: "nearest" });
  }, [highlight]);

  function pick(nextId: string) {
    onChange(nextId);
    setOpen(false);
    triggerRef.current?.focus();
  }

  function onInputKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setHighlight((h) => Math.min(h + 1, Math.max(flatItems.length - 1, 0)));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setHighlight((h) => Math.max(h - 1, 0));
    } else if (event.key === "Enter") {
      event.preventDefault();
      const item = flatItems[highlight];
      if (item) pick(item.id);
    } else if (event.key === "Escape") {
      event.preventDefault();
      setOpen(false);
      triggerRef.current?.focus();
    }
  }

  function onTriggerKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (
      event.key === "ArrowDown" ||
      event.key === "Enter" ||
      event.key === " "
    ) {
      event.preventDefault();
      setOpen(true);
    }
  }

  function renderRow(g: GroupComboboxOption, flatIndex: number) {
    const isHighlighted = highlight === flatIndex;
    const isSelected = g.id === value;
    return (
      <button
        key={g.id}
        type="button"
        data-index={flatIndex}
        role="option"
        aria-selected={isSelected}
        onMouseEnter={() => setHighlight(flatIndex)}
        onClick={() => pick(g.id)}
        className={`flex w-full items-center gap-2 rounded-[8px] px-2.5 py-1.5 text-left text-[13px] transition-colors duration-100 ${
          isHighlighted
            ? "bg-[color-mix(in_srgb,var(--color-brand)_11%,var(--color-surface-2))]"
            : "hover:bg-[var(--color-surface-2)]"
        }`}
      >
        <span className="min-w-0 flex-1 truncate font-medium text-[var(--color-foreground)]">
          {g.name}
        </span>
        {isSelected ? (
          <Check
            size={13}
            strokeWidth={2.2}
            className="shrink-0 text-[var(--color-brand)]"
            aria-hidden
          />
        ) : null}
      </button>
    );
  }

  const listMaxHeight = MAX_VISIBLE_ROWS * ROW_HEIGHT;

  const panel =
    open && pos ? (
      <motion.div
        ref={popoverRef}
        id={panelId}
        role="listbox"
        aria-label="Choisir une session"
        initial={
          reduced
            ? false
            : { opacity: 0, y: pos.placement === "bottom" ? 6 : -6, scale: 0.98 }
        }
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={
          reduced
            ? { opacity: 0 }
            : { opacity: 0, y: pos.placement === "bottom" ? 4 : -4, scale: 0.98 }
        }
        transition={{ duration: 0.14, ease: EASE }}
        style={{ position: "fixed", top: pos.top, left: pos.left, width: pos.width }}
        className="z-[999] origin-top overflow-hidden rounded-2xl border border-[color-mix(in_srgb,var(--color-border)_65%,var(--color-foreground))] bg-[var(--color-surface)] shadow-[var(--elev-3)]"
      >
        <div className="relative border-b border-[color-mix(in_srgb,var(--color-border)_70%,transparent)] p-2">
          <Search
            size={13}
            strokeWidth={1.9}
            className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[var(--color-muted)]/70"
            aria-hidden
          />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onInputKeyDown}
            placeholder="Rechercher une session…"
            className="h-8 w-full rounded-lg border border-transparent bg-[var(--color-surface-2)]/60 pl-7 pr-2.5 text-[13px] outline-none placeholder:text-[var(--color-muted)]/70 focus:border-[color-mix(in_srgb,var(--color-brand)_35%,var(--color-border))]"
          />
        </div>

        <div
          ref={listRef}
          className="overflow-y-auto p-1.5"
          style={{ maxHeight: listMaxHeight }}
        >
          {flatItems.length === 0 ? (
            <p className="px-2.5 py-3 text-center text-[12.5px] text-[var(--color-muted)]">
              Aucune session trouvée.
            </p>
          ) : (
            <>
              {showAllOption ? (
                <button
                  type="button"
                  data-index={0}
                  role="option"
                  aria-selected={value === GROUP_FILTER_ANY}
                  onMouseEnter={() => setHighlight(0)}
                  onClick={() => pick(GROUP_FILTER_ANY)}
                  className={`flex w-full items-center gap-2 rounded-[8px] px-2.5 py-1.5 text-left text-[13px] transition-colors duration-100 ${
                    highlight === 0
                      ? "bg-[color-mix(in_srgb,var(--color-brand)_11%,var(--color-surface-2))]"
                      : "hover:bg-[var(--color-surface-2)]"
                  }`}
                >
                  <span className="min-w-0 flex-1 truncate font-medium text-[var(--color-foreground)]">
                    {placeholder}
                  </span>
                  {value === GROUP_FILTER_ANY ? (
                    <Check
                      size={13}
                      strokeWidth={2.2}
                      className="shrink-0 text-[var(--color-brand)]"
                      aria-hidden
                    />
                  ) : null}
                </button>
              ) : null}

              {activeGroups.length > 0 ? (
                <div className="pointer-events-none mt-1.5 flex select-none items-center gap-2 px-2.5 pb-1 pt-1.5 first:mt-0">
                  <span className="text-[10px] font-medium uppercase tracking-[0.1em] text-[var(--color-muted)]/55">
                    Actifs
                  </span>
                  <span
                    className="h-px flex-1 bg-[color-mix(in_srgb,var(--color-border)_70%,transparent)]"
                    aria-hidden
                  />
                </div>
              ) : null}
              {activeGroups.map((g) =>
                renderRow(
                  g,
                  flatItems.findIndex((it) => it.id === g.id),
                ),
              )}

              {archivedGroups.length > 0 ? (
                <div className="pointer-events-none mt-1.5 flex select-none items-center gap-2 px-2.5 pb-1 pt-1.5 first:mt-0">
                  <span className="text-[10px] font-medium uppercase tracking-[0.1em] text-[var(--color-muted)]/55">
                    Archivés
                  </span>
                  <span
                    className="h-px flex-1 bg-[color-mix(in_srgb,var(--color-border)_70%,transparent)]"
                    aria-hidden
                  />
                </div>
              ) : null}
              {archivedGroups.map((g) =>
                renderRow(
                  g,
                  flatItems.findIndex((it) => it.id === g.id),
                ),
              )}
            </>
          )}
        </div>
      </motion.div>
    ) : null;

  return (
    <div ref={rootRef} className="relative">
      <button
        ref={triggerRef}
        id={id}
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        onClick={() => setOpen((v) => !v)}
        onKeyDown={onTriggerKeyDown}
        className="flex h-9 w-full items-center gap-2 rounded-[10px] border border-[color-mix(in_srgb,var(--color-border)_42%,var(--color-foreground))] bg-[var(--color-surface)] px-3 text-left text-[13px] text-[var(--color-foreground)] shadow-[inset_0_1px_0_color-mix(in_srgb,var(--color-foreground)_5%,transparent),var(--elev-1)] outline-none transition-[border-color,box-shadow,background-color] duration-150 hover:border-[color-mix(in_srgb,var(--color-border)_30%,var(--color-muted))] focus-visible:border-[color-mix(in_srgb,var(--color-brand)_42%,var(--color-border))] focus-visible:shadow-[0_0_0_3px_color-mix(in_srgb,var(--color-brand)_12%,transparent),var(--elev-1)] disabled:pointer-events-none disabled:opacity-60"
      >
        <GroupIcon
          size={13}
          className="shrink-0 text-[var(--color-muted)]"
        />
        <span
          className={`min-w-0 flex-1 truncate ${
            selected ? "font-medium" : "text-[var(--color-muted)]/85"
          }`}
        >
          {selected ? selected.name : placeholder}
        </span>
        {selected?.status === "archived" ? (
          <span className="shrink-0 rounded-md bg-[var(--color-surface-2)] px-1.5 py-[1px] text-[10px] font-medium text-[var(--color-muted)]">
            Archivé
          </span>
        ) : null}
        <ChevronDown
          size={14}
          strokeWidth={1.9}
          className={`shrink-0 text-[var(--color-muted)] transition-transform duration-150 ${
            open ? "rotate-180" : ""
          }`}
          aria-hidden
        />
      </button>

      {typeof document !== "undefined"
        ? createPortal(<AnimatePresence>{panel}</AnimatePresence>, document.body)
        : null}
    </div>
  );
}
