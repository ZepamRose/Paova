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
  template_id: string;
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
  created_at: string;
  public_token: string;
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
