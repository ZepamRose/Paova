import { getDashboardSession } from "@/lib/auth/session";
import { DashboardActivityHeartbeat } from "./dashboard-activity-heartbeat";

/**
 * Ensures every dashboard request claims pending invites and resolves a
 * membership (honouring the active-business cookie) before rendering children.
 * Pages still call requireDashboardCapability for sensitive routes.
 */
export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await getDashboardSession();
  return (
    <>
      <DashboardActivityHeartbeat />
      {children}
    </>
  );
}
