"use client";

import { ReactNode } from "react";

export function StationFormWrapper({
  action,
  children,
}: {
  action: (formData: FormData) => void;
  children: ReactNode;
}) {
  return (
    <form
      action={action}
      onSubmit={(e) => {
        console.log("📝 Form onSubmit triggered");
        const formData = new FormData(e.currentTarget);
        console.log("📋 Form data:", {
          name: formData.get("name"),
          template_id: formData.get("template_id"),
        });
      }}
      className="flex flex-col gap-5"
    >
      {children}
    </form>
  );
}
