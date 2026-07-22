import { stableStringify } from "@/lib/proof";
import type { TemplateVersionContent } from "./types";

/** True when version-significant content differs. */
export function templateContentChanged(
  a: TemplateVersionContent,
  b: TemplateVersionContent,
): boolean {
  return (
    a.title !== b.title ||
    a.legal_text !== b.legal_text ||
    (a.signer_name_label ?? null) !== (b.signer_name_label ?? null) ||
    stableStringify(a.fields) !== stableStringify(b.fields)
  );
}
