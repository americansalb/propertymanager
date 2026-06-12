"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

const inputCls =
  "w-full rounded-lg border border-stone-300 px-3 py-2 text-sm text-stone-900 placeholder-stone-400 focus:border-patina focus:outline-none focus:ring-1 focus:ring-patina";
const labelCls = "mb-1 block text-sm font-medium text-stone-700";
const buttonCls =
  "w-full rounded-lg bg-iron px-4 py-2.5 text-sm font-semibold text-white hover:bg-iron-deep disabled:opacity-50";

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
        <input id="password" name="password" type="password" required autoComplete="current-password" className={inputCls} />
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button type="submit" disabled={busy} className={buttonCls}>
        {busy ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}

export function SignupForm() {
  const router = useRouter();
  const [accountType, setAccountType] = useState<"LANDLORD" | "PRO">("LANDLORD");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const form = new FormData(e.currentTarget);
    try {
      const data = await postJson("/api/v1/auth/signup", {
        accountType,
        firstName: form.get("firstName"),
        lastName: form.get("lastName"),
        email: form.get("email"),
        password: form.get("password"),
        businessName: form.get("businessName"),
        phone: form.get("phone") || undefined,
      });
      router.push(data.redirect ?? "/");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setBusy(false);
    }
  }

  const typeBtn = (active: boolean) =>
    `flex-1 rounded-lg border px-3 py-2.5 text-sm font-medium transition ${
      active
        ? "border-patina bg-patina-tint text-patina"
        : "border-stone-300 text-stone-600 hover:border-stone-400"
    }`;

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <span className={labelCls}>I am a…</span>
        <div className="flex gap-2">
          <button type="button" className={typeBtn(accountType === "LANDLORD")} onClick={() => setAccountType("LANDLORD")}>
            Landlord / property owner
          </button>
          <button type="button" className={typeBtn(accountType === "PRO")} onClick={() => setAccountType("PRO")}>
            Service pro
          </button>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="firstName" className={labelCls}>First name</label>
          <input id="firstName" name="firstName" required className={inputCls} />
        </div>
        <div>
          <label htmlFor="lastName" className={labelCls}>Last name</label>
          <input id="lastName" name="lastName" required className={inputCls} />
        </div>
      </div>
      <div>
        <label htmlFor="businessName" className={labelCls}>
          {accountType === "LANDLORD" ? "Company or portfolio name" : "Business name"}
        </label>
        <input
          id="businessName"
          name="businessName"
          required
          placeholder={accountType === "LANDLORD" ? "e.g. Oakdale Properties" : "e.g. Smith Plumbing Co"}
          className={inputCls}
        />
      </div>
      {accountType === "PRO" && (
        <div>
          <label htmlFor="phone" className={labelCls}>Business phone</label>
          <input id="phone" name="phone" type="tel" required className={inputCls} />
        </div>
      )}
      <div>
        <label htmlFor="email" className={labelCls}>Email</label>
        <input id="email" name="email" type="email" required autoComplete="email" className={inputCls} />
      </div>
      <div>
        <label htmlFor="password" className={labelCls}>Password</label>
        <input
          id="password"
          name="password"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          className={inputCls}
        />
        <p className="mt-1 text-xs text-stone-400">At least 8 characters, with a letter and a number.</p>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button type="submit" disabled={busy} className={buttonCls}>
        {busy ? "Creating account…" : "Create account"}
      </button>
    </form>
  );
}
