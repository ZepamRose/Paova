/**
 * @deprecated Prefer `@/lib/waiver-packs`.
 * Thin compatibility layer so existing imports keep working.
 */

export {
  DEFAULT_LEGAL_TEXT,
  getPackById as getPresetById,
  WAIVER_PACKS as WAIVER_PRESETS,
  type PackField as PresetField,
  type PackFieldType as PresetFieldType,
  type WaiverPack as WaiverPreset,
} from "@/lib/waiver-packs";
