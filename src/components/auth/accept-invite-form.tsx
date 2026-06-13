"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { buttonCls } from "@/components/ui";

const inputCls =
  "w-full rounded-lg border border-stone-300 px-3 py-2 text-sm text-stone-900 placeholder-stone-400 focus:border-patina focus:outline-none focus:ring-1 focus:ring-patina";
const labelCls = "mb-1 block text-sm font-medium text-stone-700";

/**
 * The tenant's last step: a name and a password (or one click when they're
 * already signed in as the invited email). Posts the accept and lands on
 * the tenant home.
 */
export function AcceptInviteForm({ token, mode }: { token: string; mode: "new" | "session" }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(body: Record<string, unknown>) {
    setBusy(true);
    setError(null);
    const res = await fetch("/api/v1/invitations/accept", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, ...body }),
    });
    const data = (await res.json().catch(() => ({}))) as { redirect?: string; error?: string };
    if (!res.ok) {
      setError(data.error ?? "Something went wrong.");
      setBusy(false);
      return;
    }
    router.push(data.redirect ?? "/tenant/dashboard");
    router.refresh();
  }

  if (mode === "session") {
    return (
      <div className="space-y-3">
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          onClick={() => void submit({})}
          disabled={busy}
          className={`${buttonCls("primary")} w-full py-2.5`}
        >
          {busy ? "One moment…" : "Accept and see your home"}
        </button>
      </div>
    );
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    void submit({
      firstName: form.get("firstName"),
      lastName: form.get("lastName"),
      password: form.get("password"),
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="firstName" className={labelCls}>
            First name
          </label>
          <input
            id="firstName"
            name="firstName"
            required
            autoComplete="given-name"
            className={inputCls}
          />
        </div>
        <div>
          <label htmlFor="lastName" className={labelCls}>
            Last name
          </label>
          <input
            id="lastName"
            name="lastName"
            required
            autoComplete="family-name"
            className={inputCls}
          />
        </div>
      </div>
      <div>
        <label htmlFor="password" className={labelCls}>
          Choose a password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          className={inputCls}
        />
        <p className="mt-1 text-xs text-stone-400">At least 8 characters with a letter and a number.</p>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button type="submit" disabled={busy} className={`${buttonCls("primary")} w-full py-2.5`}>
        {busy ? "Setting up…" : "See your home"}
      </button>
    </form>
  );
}

/** Signed in as someone else: step out, then the invite link works. */
export function SignOutToSwitch() {
  const [busy, setBusy] = useState(false);
  async function signOut() {
    setBusy(true);
    await fetch("/api/v1/auth/logout", { method: "POST" });
    window.location.reload();
  }
  return (
    <button
      onClick={() => void signOut()}
      disabled={busy}
      className={`${buttonCls("secondary")} w-full py-2.5`}
    >
      {busy ? "Signing out…" : "Sign out and continue"}
    </button>
  );
}
