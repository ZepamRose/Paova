"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

type Status = "idle" | "sending" | "sent" | "error";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("sending");
    setError("");

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });

    if (error) {
      setError(error.message);
      setStatus("error");
    } else {
      setStatus("sent");
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-8 px-6 py-16">
      <Link href="/" className="flex items-center gap-2">
        <span className="inline-block h-6 w-6 rounded-md bg-[var(--color-brand)]" />
        <span className="text-lg font-semibold tracking-tight">SafeSign</span>
      </Link>

      {status === "sent" ? (
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-semibold tracking-tight">Vérifiez vos emails</h1>
          <p className="text-[var(--color-muted)]">
            Un lien de connexion a été envoyé à <strong>{email}</strong>. Cliquez
            dessus pour accéder à votre tableau de bord.
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">Connexion</h1>
            <p className="text-[var(--color-muted)]">
              Entrez votre email, nous vous envoyons un lien de connexion.
            </p>
          </div>

          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="vous@exemple.com"
            className="rounded-lg border border-[var(--color-border)] px-4 py-2.5 text-sm outline-none focus:border-[var(--color-brand)]"
          />

          {status === "error" && (
            <p className="text-sm text-red-600">{error}</p>
          )}

          <button
            type="submit"
            disabled={status === "sending"}
            className="rounded-lg bg-[var(--color-brand)] px-5 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {status === "sending" ? "Envoi…" : "Recevoir le lien"}
          </button>
        </form>
      )}
    </main>
  );
}
