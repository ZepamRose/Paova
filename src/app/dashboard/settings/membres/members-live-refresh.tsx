"use client";

import { useLiveMemberActivityRefresh } from "@/lib/members/use-live-member-activity-refresh";

/**
 * Client component wrapper that enables real-time refresh of the members page
 * when any team member's activity status changes.
 */
export function MembersLiveRefresh({ businessId }: { businessId: string }) {
  useLiveMemberActivityRefresh(businessId);
  return null;
}
