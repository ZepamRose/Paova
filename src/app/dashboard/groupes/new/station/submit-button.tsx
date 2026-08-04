"use client";

import { useFormStatus } from "react-dom";
import { Zap } from "lucide-react";

export function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      onClick={() => {
        console.log("🔘 Submit button clicked");
      }}
      className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl bg-[#3b82f6] px-5 text-[13px] font-semibold text-white shadow-[0_1px_0_rgba(255,255,255,0.12)_inset,var(--elev-1)] transition-[transform,filter] duration-[220ms] hover:-translate-y-px hover:brightness-[1.04] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3b82f6] disabled:opacity-50 disabled:cursor-not-allowed"
    >
      <Zap size={15} strokeWidth={2} />
      {pending ? "Création..." : "Créer le QR permanent"}
    </button>
  );
}
