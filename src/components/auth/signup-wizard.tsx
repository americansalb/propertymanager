"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { OptionCards, WizardShell } from "@/components/wizard/wizard-shell";

const inputCls =
  "w-full rounded-lg border border-stone-300 px-3 py-2.5 text-base text-stone-900 placeholder-stone-400 focus:border-patina focus:outline-none focus:ring-1 focus:ring-patina";
const continueCls =
  "mt-6 w-full rounded-lg bg-iron px-4 py-3 text-sm font-semibold text-white hover:bg-iron-deep disabled:opacity-50";

type StepId = "type" | "name" | "business" | "phone" | "email" | "password";

type Draft = {
  accountType: "LANDLORD" | "PRO" | null;
  firstName: string;
  lastName: string;
  businessName: string;
  phone: string;
  email: string;
  password: string;
};

const EMPTY: Draft = {
  accountType: null,
  firstName: "",
  lastName: "",
  businessName: "",
  phone: "",
  email: "",
  password: "",
};

function stepsFor(d: Draft): StepId[] {
  return d.accountType === "PRO"
    ? ["type", "name", "business", "phone", "email", "password"]
    : ["type", "name", "business", "email", "password"];
}

function validate(id: StepId, d: Draft): string | null {
  switch (id) {
    case "name":
      return d.firstName.trim() && d.lastName.trim() ? null : "Enter your first and last name.";
    case "business":
      return d.businessName.trim() ? null : "Give it a name, you can change it later.";
    case "phone":
      return d.phone.trim().length >= 7 ? null : "Enter a phone number pros can be reached at.";
    case "email":
      return /^\S+@\S+\.\S+$/.test(d.email.trim()) ? null : "Enter a valid email address.";
    case "password":
      if (d.password.length < 8) return "At least 8 characters.";
      if (!/[a-zA-Z]/.test(d.password) || !/[0-9]/.test(d.password))
        return "Include at least one letter and one number.";
      return null;
    default:
      return null;
  }
}

export function SignupWizard() {
  const router = useRouter();
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [step, setStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const steps = stepsFor(draft);
  const id = steps[step]!;
  const isLast = step === steps.length - 1;

  function set<K extends keyof Draft>(key: K, value: Draft[K]) {
    setDraft((d) => ({ ...d, [key]: value }));
    setError(null);
  }

  function back() {
    setError(null);
    setStep((s) => Math.max(0, s - 1));
  }

  async function next(e?: React.FormEvent) {
    e?.preventDefault();
    const problem = validate(id, draft);
    if (problem) {
      setError(problem);
      return;
    }
    if (!isLast) {
      setError(null);
      setStep((s) => s + 1);
      return;
    }
    // Final step: create the account.
    setBusy(true);
    setError(null);
    const res = await fetch("/api/v1/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        accountType: draft.accountType,
        firstName: draft.firstName.trim(),
        lastName: draft.lastName.trim(),
        businessName: draft.businessName.trim(),
        phone: draft.phone.trim() || undefined,
        email: draft.email.trim(),
        password: draft.password,
      }),
    });
    const data = (await res.json().catch(() => ({}))) as { redirect?: string; error?: string };
    if (!res.ok) {
      setBusy(false);
      if (res.status === 409) {
        // Email already exists: send them back to the email step with context.
        setStep(steps.indexOf("email"));
        setError(data.error ?? "An account with this email already exists.");
        return;
      }
      setError(data.error ?? "Something went wrong.");
      return;
    }
    router.push(data.redirect ?? "/");
    router.refresh();
  }

  const isLandlord = draft.accountType !== "PRO";

  const meta: Record<StepId, { title: string; subtitle?: string }> = {
    type: { title: "What brings you to VillageKeep?", subtitle: "Tenants join via an invitation from their landlord." },
    name: { title: "What's your name?" },
    business: isLandlord
      ? { title: "What should we call your portfolio?", subtitle: "Your company or a simple label like \"Smith Rentals\". You can change it anytime." }
      : { title: "What's your business called?", subtitle: "The name landlords and tenants will see on your bids." },
    phone: { title: "What's the best phone for jobs?", subtitle: "Landlords use this to coordinate scheduling once you win work." },
    email: { title: "What's your email?", subtitle: "You'll sign in with this." },
    password: { title: "Set your password", subtitle: "At least 8 characters, with a letter and a number." },
  };

  return (
    <WizardShell
      step={step}
      total={steps.length}
      onBack={back}
      title={meta[id].title}
      subtitle={meta[id].subtitle}
    >
      {id === "type" ? (
        <OptionCards
          options={[
            {
              value: "LANDLORD",
              label: "I own or manage rentals",
              description: "Collect rent, handle maintenance, hire trusted pros",
              icon: "🏠",
            },
            {
              value: "PRO",
              label: "I'm a service pro",
              description: "Plumbing, electrical, handyman: get leads and guaranteed payment",
              icon: "🛠️",
            },
          ]}
          onSelect={(v) => {
            set("accountType", v as Draft["accountType"]);
            setStep(1);
          }}
        />
      ) : (
        <form onSubmit={next} className="flex flex-1 flex-col">
          {id === "name" && (
            <div className="grid grid-cols-2 gap-3">
              <input autoFocus value={draft.firstName} onChange={(e) => set("firstName", e.target.value)} placeholder="First name" aria-label="First name" className={inputCls} />
              <input value={draft.lastName} onChange={(e) => set("lastName", e.target.value)} placeholder="Last name" aria-label="Last name" className={inputCls} />
            </div>
          )}
          {id === "business" && (
            <input
              autoFocus
              value={draft.businessName}
              onChange={(e) => set("businessName", e.target.value)}
              placeholder={isLandlord ? "e.g. Oakdale Properties" : "e.g. Smith Plumbing Co"}
              aria-label="Business name"
              className={inputCls}
            />
          )}
          {id === "phone" && (
            <input autoFocus type="tel" value={draft.phone} onChange={(e) => set("phone", e.target.value)} placeholder="(312) 555-0142" aria-label="Business phone" className={inputCls} />
          )}
          {id === "email" && (
            <input autoFocus type="email" value={draft.email} onChange={(e) => set("email", e.target.value)} placeholder="you@example.com" autoComplete="email" aria-label="Email" className={inputCls} />
          )}
          {id === "password" && (
            <input autoFocus type="password" value={draft.password} onChange={(e) => set("password", e.target.value)} autoComplete="new-password" aria-label="Password" className={inputCls} />
          )}

          {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

          <button type="submit" disabled={busy} className={continueCls}>
            {busy ? "Creating your account…" : isLast ? "Create account" : "Continue"}
          </button>
        </form>
      )}
    </WizardShell>
  );
}
