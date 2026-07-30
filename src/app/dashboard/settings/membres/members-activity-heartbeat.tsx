"use client";

import { useActivityHeartbeat } from "@/lib/members/use-activity-heartbeat";

/**
 * Client component wrapper for activity heartbeat.
 * Placed at the top of the members page to track presence.
 */
export function MembersActivityHeartbeat({
  businessId,
}: {
  businessId: string;
}) {
  useActivityHeartbeat(businessId);
  return null;
}
