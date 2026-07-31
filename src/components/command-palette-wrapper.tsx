"use client";

import { CommandPalette, useCommandPalette } from "./command-palette";
import { SearchTrigger } from "./search-trigger";
import { CommandPaletteHint } from "./command-palette-hint";

/**
 * Wrapper qui combine la palette et le bouton trigger
 * Utilise le contexte pour synchroniser l'état
 */
export function CommandPaletteWrapper() {
  return (
    <>
      <CommandPalette />
      <CommandPaletteHint />
    </>
  );
}

export function CommandPaletteTrigger() {
  const { setOpen } = useCommandPalette();
  return <SearchTrigger onClick={() => setOpen(true)} />;
}
