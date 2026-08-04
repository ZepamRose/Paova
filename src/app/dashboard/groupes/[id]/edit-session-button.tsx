"use client";

import { useState } from "react";
import { EditSessionModal } from "../edit-session-modal";
import type { ClosingMode, OpeningHours } from "@/lib/groups/lifecycle";

interface Template {
  id: string;
  title: string;
}

interface EditSessionButtonProps {
  session: {
    id: string;
    name: string;
    closesAt: string | null;
    startTime: string | null;
    endTime: string | null;
    durationMinutes: number | null;
    closingMode: ClosingMode;
    requiresSignature: boolean;
    templateId: string | null;
  };
  templates: Template[];
  openingHours?: OpeningHours | null;
  className?: string;
  disabled?: boolean;
  /** Des signatures existent pour cette activité — verrouille les champs juridiques. */
  hasSignatures?: boolean;
}

export function EditSessionButton({
  session,
  templates,
  openingHours = null,
  className,
  disabled = false,
  hasSignatures = false,
}: EditSessionButtonProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setIsModalOpen(true)}
        disabled={disabled}
        className={className}
      >
        Modifier
      </button>
      <EditSessionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        session={session}
        templates={templates}
        openingHours={openingHours}
        disabled={disabled}
        legalLocked={hasSignatures}
      />
    </>
  );
}
