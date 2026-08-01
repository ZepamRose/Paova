import { redirect } from "next/navigation";

/** This page redirects to dashboard - old direct access kept for compatibility */
export default async function GroupesPage() {
  redirect("/dashboard");
}
