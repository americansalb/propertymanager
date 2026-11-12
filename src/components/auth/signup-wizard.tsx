"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { OptionCards, WizardShell } from "@/components/wizard/wizard-shell";
import { IconDoor, IconHome, IconMail, IconTenants, IconTools } from "@/components/icons";
import { buttonCls, inputCls } from "@/components/ui";

const continueCls = `${buttonCls("primary")} mt-6 min-h-12 w-full`;
const fieldLabel = "mb-1 block text-sm font-medium text-stone-700";

type StepId = "type" | "tenant" | "name" | "business" | "phone" | "email" | "password";

type Draft = {
  accountType: "LANDLORD" | "PRO" | "TENANT" | null;
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
  if (d.accountType === "TENANT") return ["type", "tenant"];
  return d.accountType === "PRO"
    ? ["type", "name", "business", "phone", "email", "password"]
    : ["type", "name", "business", "email", "password"];
}

function validate(id: StepId, d: Draft): string | null {
  switch (id) {
    case "name":
      return d.firstName.trim() && d.lastName.trim() ? null : "Enter your first and last name.";
    case "business":
      return d.businessName.trim() ? null : "Give it a name. You can change it later.";
    case "phone":
      return d.phone.trim().length >= 7 ? null : "Enter a phone number you can be reached at.";
    case "email":
      return /^\S+@\S+\.\S+$/.test(d.email.trim()) ? null : "That does not look like an email address.";
    case "password":
      if (d.password.length < 8) return "Use at least 8 characters.";
      if (!/[a-zA-Z]/.test(d.password) || !/[0-9]/.test(d.password))
        return "Use at least one letter and one number.";
      return null;
    default:
      return null;
  }
}

export function SignupWizard({
  brandName,
  brandDomain,
}: {
  brandName: string;
  brandDomain: string;
}) {
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
    type: { title: `What brings you to ${brandName}?` },
    tenant: {
      title: "You join with a link from your landlord",
      subtitle: "The link connects you to your home and your lease.",
    },
    name: { title: "What is your name?" },
    business: isLandlord
      ? {
          title: "What should we call your rentals?",
          subtitle: 'Your company name, or something simple like "Smith Rentals". You can change it later.',
        }
      : { title: "What is your business called?", subtitle: "This is the name owners see." },
    phone: {
      title: "What is the best phone number for jobs?",
      subtitle: "Owners call this number to set up a visit.",
    },
    email: { title: "What is your email?", subtitle: "You sign in with it." },
    password: {
      title: "Choose a password",
      subtitle: "At least 8 characters, with a letter and a number.",
    },
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
              description: "Keep track of leases, rent and repairs in one place.",
              icon: <IconHome className="h-8 w-8" duo />,
            },
            {
              value: "PRO",
              label: "I do repairs for a living",
              description: "Plumbing, electrical, handyman and more. Be first in line when repair jobs open.",
              icon: <IconTools className="h-8 w-8" duo />,
            },
            {
              value: "TENANT",
              label: "I rent my home",
              description: "See your lease and report problems. Your landlord invites you.",
              icon: <IconDoor className="h-8 w-8" duo />,
            },
          ]}
          onSelect={(v) => {
            set("accountType", v as Draft["accountType"]);
            setStep(1);
          }}
        />
      ) : id === "tenant" ? (
        <div className="flex flex-1 flex-col">
          <ul className="space-y-4 leading-6 text-stone-700">
            <li className="flex gap-3">
              <IconMail className="mt-1 h-5 w-5 shrink-0 text-patina" />
              <span>
                <span className="font-semibold text-stone-900">Already invited?</span> Open the
                email from {brandName} and tap the link inside.
              </span>
            </li>
            <li className="flex gap-3">
              <IconTenants className="mt-1 h-5 w-5 shrink-0 text-patina" />
              <span>
                <span className="font-semibold text-stone-900">Not yet?</span> Ask your landlord
                to invite you. They only need your email.
              </span>
            </li>
          </ul>
          <Link href="/login" className={`${continueCls} text-center`}>
            I already have an account
          </Link>
          <p className="mt-4 text-center text-sm text-stone-500">
            Landlord not on {brandName} yet? Send them to {brandDomain}.
          </p>
        </div>
      ) : (
        <form onSubmit={next} className="flex flex-1 flex-col">
          {id === "name" && (
            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className={fieldLabel}>First name</span>
                <input autoFocus value={draft.firstName} onChange={(e) => set("firstName", e.target.value)} autoComplete="given-name" className={inputCls} />
              </label>
              <label className="block">
                <span className={fieldLabel}>Last name</span>
                <input value={draft.lastName} onChange={(e) => set("lastName", e.target.value)} autoComplete="family-name" className={inputCls} />
              </label>
            </div>
          )}
          {id === "business" && (
            <label className="block">
              <span className={fieldLabel}>Name</span>
              <input
                autoFocus
                value={draft.businessName}
                onChange={(e) => set("businessName", e.target.value)}
                placeholder={isLandlord ? "Smith Rentals" : "Smith Plumbing"}
                autoComplete="organization"
                className={inputCls}
              />
            </label>
          )}
          {id === "phone" && (
            <label className="block">
              <span className={fieldLabel}>Phone number</span>
              <input autoFocus type="tel" value={draft.phone} onChange={(e) => set("phone", e.target.value)} placeholder="(312) 555-0142" autoComplete="tel" className={inputCls} />
            </label>
          )}
          {id === "email" && (
            <label className="block">
              <span className={fieldLabel}>Email</span>
              <input autoFocus type="email" value={draft.email} onChange={(e) => set("email", e.target.value)} placeholder="you@example.com" autoComplete="email" className={inputCls} />
            </label>
          )}
          {id === "password" && (
            <label className="block">
              <span className={fieldLabel}>Password</span>
              <input autoFocus type="password" value={draft.password} onChange={(e) => set("password", e.target.value)} autoComplete="new-password" className={inputCls} />
            </label>
          )}

          {error && (
            <p role="alert" className="mt-3 text-sm font-medium text-red-700">
              {error}
            </p>
          )}

          <button type="submit" disabled={busy} className={continueCls}>
            {busy ? "Creating your account…" : isLast ? "Create my account" : "Continue"}
          </button>
        </form>
      )}
    </WizardShell>
  );
}
