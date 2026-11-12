"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { buttonCls, inputCls } from "@/components/ui";

const labelCls = "mb-1 block text-sm font-medium text-stone-700";
const submitCls = `${buttonCls("primary")} min-h-12 w-full`;

async function postJson(url: string, body: unknown) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = (await res.json().catch(() => ({}))) as { redirect?: string; error?: string };
  if (!res.ok) throw new Error(data.error ?? "Something went wrong.");
  return data;
}

export function LoginForm({ next }: { next?: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [show, setShow] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const form = new FormData(e.currentTarget);
    try {
      const data = await postJson("/api/v1/auth/login", {
        email: form.get("email"),
        password: form.get("password"),
      });
      router.push(next || data.redirect || "/");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <label htmlFor="email" className={labelCls}>Email</label>
        <input id="email" name="email" type="email" required autoComplete="email" className={inputCls} />
      </div>
      <div>
        <label htmlFor="password" className={labelCls}>Password</label>
        <div className="relative">
          <input
            id="password"
            name="password"
            type={show ? "text" : "password"}
            required
            autoComplete="current-password"
            className={`${inputCls} pr-16`}
          />
          <button
            type="button"
            onClick={() => setShow((s) => !s)}
            aria-pressed={show}
            className="absolute inset-y-0 right-1.5 my-1.5 rounded-lg px-2.5 text-sm font-medium text-stone-600 hover:bg-stone-100"
          >
            {show ? "Hide" : "Show"}
          </button>
        </div>
      </div>
      {error && (
        <p role="alert" className="text-sm font-medium text-red-700">
          {error}
        </p>
      )}
      <button type="submit" disabled={busy} className={submitCls}>
        {busy ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
