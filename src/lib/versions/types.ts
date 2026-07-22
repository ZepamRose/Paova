import type { Json } from "@/types/database.types";

export type TemplateVersionContent = {
  title: string;
  legal_text: string;
  fields: Json;
  signer_name_label: string | null;
};

export type TemplateVersionRow = TemplateVersionContent & {
  id: string;
  template_id: string;
  version: number;
  created_by: string | null;
  created_at: string;
};
