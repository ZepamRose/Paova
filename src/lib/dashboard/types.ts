/** Shared dashboard types — keep the home page extensible without reshaping it. */

/** Primary pulse shown in the dashboard hero — one number, supporting context. */
export type DashboardHeroPulse = {
  value: number;
  /** e.g. "signatures cette semaine" */
  label: string;
  /** Quiet supporting line — today/month/delta. Omit when empty. */
  secondary?: string;
};

export type DashboardListView = "active" | "archived";

export type DashboardGroupRow = {
  id: string;
  name: string;
  template_id: string | null;
  template_title: string;
  status: string;
  total: number;
  signed: number;
  /** Quand le groupe est attendu. Null si la session n'est pas datée. */
  scheduled_at: string | null;
  /** V2: Heure de début réelle de la session */
  start_time: string | null;
  /** V2: Heure de fin réelle de la session */
  end_time: string | null;
  /** V2: Durée planifiée en minutes */
  duration_minutes: number | null;
  /** Product Evolution: Whether this session requires signatures */
  requires_signature: boolean;
  created_at: string;
  public_token: string;
  /**
   * V3: Mode de signature ("individual" | "group_representative").
   * Optionnel pour rétro-compatibilité — absent = "individual".
   */
  signature_mode?: string | null;
  /**
   * V3: True si le représentant a déjà signé (mode group_representative uniquement).
   * Optionnel pour rétro-compatibilité — absent = false.
   */
  rep_signed?: boolean;
  /**
   * V4: Type de groupe ("roster" | "express" | "station").
   * Optionnel pour rétro-compatibilité — absent = "roster".
   */
  kind?: string | null;
};

/** One actionable item in the "À traiter" priority zone. */
export type DashboardAttentionKind =
  | "waiver_expiring"
  | "group_near_complete"
  | "group_complete";

export type DashboardAttentionItem = {
  id: string;
  kind: DashboardAttentionKind;
  title: string;
  meta: string;
  href: string;
};
