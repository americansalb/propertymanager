"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useId, useState } from "react";
import { buttonCls, inputCls } from "@/components/ui";

const labelCls = "mb-1 block text-sm font-medium text-stone-700";
const submitCls = `${buttonCls("primary")} min-h-12 w-full`;

/** Step one: say which email. The answer is the same either way. */
export function ForgotForm({ initialEmail }: { initialEmail?: string }) {
  const id = useId();
  const [email, setEmail] = useState(initialEmail ?? "");
  const [busy, setBusy] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await fetch("/api/v1/auth/forgot", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    setBusy(false);
    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      setError(data.error ?? "Something went wrong. Try again.");
      return;
    }
    setSentTo(email.trim());
  }

  if (sentTo) {
    return (
      <div>
        <p className="text-stone-700">
          If <span className="font-semibold text-stone-900">{sentTo}</span> has an account, a link
          to set a new password is on its way. It works for one hour.
        </p>
        <p className="mt-3 text-sm text-stone-500">
          Nothing after a few minutes? Check your spam folder, or{" "}
          <button
            type="button"
            onClick={() => setSentTo(null)}
            className="font-medium text-patina underline"
          >
            try a different email
          </button>
          .
        </p>
        <Link href="/login" className={`${buttonCls("secondary")} mt-6 min-h-12 w-full`}>
          Back to sign in
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <label htmlFor={id} className={labelCls}>
          Email
        </label>
        <input
          id={id}
          type="email"
          required
          autoFocus
          autoComplete="email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            setError(null);
          }}
          className={inputCls}
        />
      </div>
      {error && (
        <p role="alert" className="text-sm font-medium text-red-700">
          {error}
        </p>
      )}
      <button type="submit" disabled={busy} className={submitCls}>
        {busy ? "Sending…" : "Email me a link"}
      </button>
    </form>
  );
}

/** Step two: from the link, choose the new password. */
export function ResetForm({ token }: { token: string }) {
  const router = useRouter();
  const id = useId();
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 8 || !/[a-zA-Z]/.test(password) || !/[0-9]/.test(password)) {
      setError("Use at least 8 characters, with a letter and a number.");
      return;
    }
    setBusy(true);
    setError(null);
    const res = await fetch("/api/v1/auth/reset", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, password }),
    });
    const data = (await res.json().catch(() => ({}))) as { redirect?: string; error?: string };
    if (!res.ok) {
      setBusy(false);
      setError(data.error ?? "Something went wrong. Try again.");
      return;
    }
    router.push(data.redirect ?? "/login");
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <label htmlFor={id} className={labelCls}>
          New password
        </label>
        <div className="relative">
          <input
            id={id}
            type={show ? "text" : "password"}
            required
            autoFocus
            autoComplete="new-password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              setError(null);
            }}
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
        <p className="mt-1 text-sm text-stone-500">At least 8 characters, with a letter and a number.</p>
      </div>
      {error && (
        <p role="alert" className="text-sm font-medium text-red-700">
          {error}
        </p>
      )}
      <button type="submit" disabled={busy} className={submitCls}>
        {busy ? "Saving…" : "Save and sign in"}
      </button>
      <p className="text-center text-sm text-stone-500">
        This signs you out everywhere else.
      </p>
    </form>
  );
}
