"use client";

import { useRouter } from "next/navigation";
import { useId, useState } from "react";
import { formatCents } from "@/lib/money";
import {
  formatLeaseDate,
  LEASE_SHARE_FIELDS,
  ordinal,
  parseDateOnly,
  SHARE_FIELD_LABEL,
  type LeaseShareField,
} from "@/lib/leases";
import { inviteDaysLeft } from "@/lib/invites";
import { UTILITY_SUGGESTIONS } from "@/lib/validation/property";
import { Badge, buttonCls, inputCls } from "@/components/ui";
import { ConfirmButton, useToast } from "@/components/ui-feedback";
import { AddChips, EditableRow, useOptionalRows, useRowPatch } from "@/components/ui-inline";

/**
 * The lease lives outside the app; these pieces are where the landlord puts
 * its facts on file. One tap drafts it from the home's asking terms, every
 * row edits in place, and the tenant side hangs off it: who lives here,
 * who has been invited, and what the tenant is allowed to see.
 */

export type LeaseView = {
  id: string;
  status: string;
  startDate: string; // YYYY-MM-DD
  endDate: string | null;
  monthlyRentCents: number;
  securityDepositCents: number;
  rentDueDay: number;
  lateFeeCents: number;
  lateFeeGraceDays: number;
  petDepositCents: number | null;
  petRentCents: number | null;
  parkingSpot: string | null;
  parkingRentCents: number | null;
  utilitiesIncluded: string[];
  shareWithTenant: boolean;
  sharedFields: string[];
};

export type TenantLine = { id: string; name: string; email: string; isPrimary: boolean };
export type InviteLine = { id: string; email: string; expiresAt: string };

const dollars = (cents: number | null) => (cents != null ? (cents / 100).toString() : null);
const money = (cents: number | null, suffix = "") =>
  cents != null ? `${formatCents(cents)}${suffix}` : null;

/** The one button that puts a lease on file for a home that has none. */
export function StartLease({ unitId, label }: { unitId: string; label: string }) {
  const router = useRouter();
  const { push: toast } = useToast();
  const [busy, setBusy] = useState(false);

  async function start() {
    setBusy(true);
    const res = await fetch(`/api/v1/landlord/units/${unitId}/leases`, { method: "POST" });
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    setBusy(false);
    if (!res.ok) {
      toast(data.error ?? "Something went wrong.", "bad");
      return;
    }
    toast("Lease started from this home's asking terms.");
    router.refresh();
  }

  return (
    <button onClick={() => void start()} disabled={busy} className={buttonCls("accent")}>
      {busy ? "Starting…" : label}
    </button>
  );
}

/** The lease's terms. Required ones always show; extras wait behind chips. */
export function LeaseTerms({ lease, canRemove }: { lease: LeaseView; canRemove: boolean }) {
  const router = useRouter();
  const { push: toast } = useToast();
  const patch = useRowPatch(`/api/v1/landlord/leases/${lease.id}`);
  const start = parseDateOnly(lease.startDate);
  const end = lease.endDate ? parseDateOnly(lease.endDate) : null;

  const rows = useOptionalRows({
    deposit: lease.securityDepositCents > 0,
    lateFee: lease.lateFeeCents > 0,
    utilities: lease.utilitiesIncluded.length > 0,
    petDeposit: lease.petDepositCents != null,
    petRent: lease.petRentCents != null,
    parkingSpot: Boolean(lease.parkingSpot),
    parkingRent: lease.parkingRentCents != null,
  });
  const chipLabel = {
    deposit: "Deposit",
    lateFee: "Late fee",
    utilities: "Utilities included",
    petDeposit: "Pet deposit",
    petRent: "Pet rent",
    parkingSpot: "Parking",
    parkingRent: "Parking rent",
  } as const;

  async function removeDraft() {
    const res = await fetch(`/api/v1/landlord/leases/${lease.id}`, { method: "DELETE" });
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    if (!res.ok) {
      toast(data.error ?? "Something went wrong.", "bad");
      return;
    }
    toast("Lease removed.");
    router.refresh();
  }

  return (
    <div>
      <EditableRow
        label="Rent"
        value={dollars(lease.monthlyRentCents)}
        display={money(lease.monthlyRentCents, " a month")}
        emptyPrompt="What is the rent?"
        kind={{ kind: "money", placeholder: "1,850" }}
        onSave={(v) => patch({ monthlyRentDollars: v })}
        savedToast="Rent saved."
        required
      />
      <EditableRow
        label="Rent is due"
        value={lease.rentDueDay.toString()}
        display={`On the ${ordinal(lease.rentDueDay)} of each month`}
        emptyPrompt="Which day of the month?"
        kind={{ kind: "number", placeholder: "1" }}
        onSave={(v) => patch({ rentDueDay: v })}
        savedToast="Due day saved."
        required
      />
      <EditableRow
        label="Starts"
        value={lease.startDate}
        display={formatLeaseDate(start)}
        emptyPrompt="When does it start?"
        kind={{ kind: "date" }}
        onSave={(v) => patch({ startDate: v })}
        savedToast="Start date saved."
        required
      />
      <EditableRow
        label="Ends"
        value={lease.endDate}
        display={end ? formatLeaseDate(end) : null}
        emptyPrompt="No end date, so it runs month to month"
        kind={{ kind: "date" }}
        onSave={(v) => patch({ endDate: v })}
        savedToast="End date saved."
      />
      {rows.shows("deposit") && (
        <EditableRow
          label="Deposit"
          value={lease.securityDepositCents > 0 ? dollars(lease.securityDepositCents) : null}
          display={lease.securityDepositCents > 0 ? money(lease.securityDepositCents) : null}
          emptyPrompt="Security deposit you hold"
          kind={{ kind: "money", placeholder: "1,850" }}
          onSave={(v) => patch({ securityDepositDollars: v })}
          savedToast="Deposit saved."
          autoOpen={rows.fresh("deposit")}
          onDismissEmpty={() => rows.hide("deposit")}
        />
      )}
      {rows.shows("lateFee") && (
        <EditableRow
          label="Late fee"
          value={lease.lateFeeCents > 0 ? dollars(lease.lateFeeCents) : null}
          display={lease.lateFeeCents > 0 ? money(lease.lateFeeCents) : null}
          emptyPrompt="Charged when rent is late"
          kind={{ kind: "money", placeholder: "75" }}
          onSave={(v) => patch({ lateFeeDollars: v })}
          savedToast="Late fee saved."
          autoOpen={rows.fresh("lateFee")}
          onDismissEmpty={() => rows.hide("lateFee")}
        />
      )}
      {lease.lateFeeCents > 0 && (
        <EditableRow
          label="Late after"
          value={lease.lateFeeGraceDays.toString()}
          display={`${lease.lateFeeGraceDays} day${lease.lateFeeGraceDays === 1 ? "" : "s"} past the due date`}
          emptyPrompt="Days before the fee applies"
          kind={{ kind: "number", placeholder: "5" }}
          onSave={(v) => patch({ lateFeeGraceDays: v })}
          savedToast="Saved."
          required
        />
      )}
      {rows.shows("utilities") && (
        <EditableRow
          label="Utilities included"
          value={lease.utilitiesIncluded}
          emptyPrompt="Which utilities are included?"
          kind={{ kind: "chips", suggestions: UTILITY_SUGGESTIONS, placeholder: "Add a utility" }}
          onSave={(v) => patch({ utilitiesIncluded: Array.isArray(v) ? v : [] })}
          savedToast="Utilities saved."
          autoOpen={rows.fresh("utilities")}
          onDismissEmpty={() => rows.hide("utilities")}
        />
      )}
      {rows.shows("petDeposit") && (
        <EditableRow
          label="Pet deposit"
          value={dollars(lease.petDepositCents)}
          display={money(lease.petDepositCents)}
          emptyPrompt="One time, for pets"
          kind={{ kind: "money", placeholder: "300" }}
          onSave={(v) => patch({ petDepositDollars: v })}
          savedToast="Pet deposit saved."
          autoOpen={rows.fresh("petDeposit")}
          onDismissEmpty={() => rows.hide("petDeposit")}
        />
      )}
      {rows.shows("petRent") && (
        <EditableRow
          label="Pet rent"
          value={dollars(lease.petRentCents)}
          display={money(lease.petRentCents, " a month")}
          emptyPrompt="Each month, per pet"
          kind={{ kind: "money", placeholder: "50" }}
          onSave={(v) => patch({ petRentDollars: v })}
          savedToast="Pet rent saved."
          autoOpen={rows.fresh("petRent")}
          onDismissEmpty={() => rows.hide("petRent")}
        />
      )}
      {rows.shows("parkingSpot") && (
        <EditableRow
          label="Parking"
          value={lease.parkingSpot}
          emptyPrompt="Assigned spot, garage, street permit?"
          kind={{ kind: "text", placeholder: "1 assigned spot, garage" }}
          onSave={(v) => patch({ parkingSpot: v })}
          savedToast="Saved."
          autoOpen={rows.fresh("parkingSpot")}
          onDismissEmpty={() => rows.hide("parkingSpot")}
        />
      )}
      {rows.shows("parkingRent") && (
        <EditableRow
          label="Parking rent"
          value={dollars(lease.parkingRentCents)}
          display={
            lease.parkingRentCents === 0 ? "Included" : money(lease.parkingRentCents, " a month")
          }
          emptyPrompt="Each month. Enter 0 if it is included."
          kind={{ kind: "money", placeholder: "150" }}
          onSave={(v) => patch({ parkingRentDollars: v })}
          savedToast="Parking rent saved."
          autoOpen={rows.fresh("parkingRent")}
          onDismissEmpty={() => rows.hide("parkingRent")}
        />
      )}
      <AddChips
        title="Add to this lease"
        items={rows.pending.map((key) => ({ key, label: chipLabel[key] }))}
        onPick={(key) => rows.reveal(key as keyof typeof chipLabel)}
      />
      {canRemove && (
        <div className="mt-4 border-t border-stone-100 pt-3">
          <ConfirmButton
            onConfirm={() => void removeDraft()}
            confirmLabel="Remove it"
            title="Remove this lease"
            className={buttonCls("danger", "sm")}
          >
            Remove this lease
          </ConfirmButton>
        </div>
      )}
    </div>
  );
}

type EmailStatus = "sent" | "not_configured" | "failed";

function emailStatusLine(status: EmailStatus, email: string): string {
  if (status === "sent") return `We also emailed it to ${email}.`;
  if (status === "failed") return "The email did not go out, so send them this link yourself.";
  return "Email is not set up yet, so send them this link yourself.";
}

type IssuedLink = { inviteId: string; email: string; link: string; emailStatus: EmailStatus };

/** One switch for the whole lease, then a chip per group of terms. */
function TenantVisibility({ lease }: { lease: LeaseView }) {
  const router = useRouter();
  const { push: toast } = useToast();
  const [shared, setShared] = useState(lease.shareWithTenant);
  const [fields, setFields] = useState<string[]>(lease.sharedFields);
  const [busy, setBusy] = useState(false);

  async function save(body: Record<string, unknown>, undo: () => void) {
    setBusy(true);
    const res = await fetch(`/api/v1/landlord/leases/${lease.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setBusy(false);
    if (!res.ok) {
      undo();
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      toast(data.error ?? "Something went wrong.", "bad");
      return;
    }
    router.refresh();
  }

  function toggleShared() {
    const next = !shared;
    setShared(next);
    void save({ shareWithTenant: next }, () => setShared(!next));
  }

  function toggleField(field: LeaseShareField) {
    const previous = fields;
    const next = fields.includes(field) ? fields.filter((f) => f !== field) : [...fields, field];
    setFields(next);
    void save({ sharedFields: next }, () => setFields(previous));
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="font-medium text-stone-900">Show the lease to the tenant</p>
          <p className="text-sm text-stone-500">
            {shared
              ? "They see the parts you tick below on their home page."
              : "They see their home, but none of the lease terms."}
          </p>
        </div>
        <button
          role="switch"
          aria-checked={shared}
          aria-label="Show the lease to the tenant"
          onClick={toggleShared}
          disabled={busy}
          className={`relative h-8 w-14 shrink-0 rounded-full transition disabled:opacity-60 ${
            shared ? "bg-patina" : "bg-stone-300"
          }`}
        >
          <span
            className={`absolute top-1 h-6 w-6 rounded-full bg-white transition-all ${
              shared ? "left-7" : "left-1"
            }`}
          />
        </button>
      </div>
      {shared && (
        <div className="mt-3 flex flex-wrap gap-2">
          {LEASE_SHARE_FIELDS.map((field) => {
            const on = fields.includes(field);
            return (
              <button
                key={field}
                onClick={() => toggleField(field)}
                disabled={busy}
                aria-pressed={on}
                className={`inline-flex min-h-9 items-center gap-1.5 rounded-full border px-3.5 text-sm font-medium transition disabled:opacity-60 ${
                  on
                    ? "border-patina bg-patina-tint text-patina"
                    : "border-stone-300 bg-white text-stone-500 hover:border-stone-400"
                }`}
              >
                <span aria-hidden="true">{on ? "✓" : "+"}</span>
                {SHARE_FIELD_LABEL[field]}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

/** Who lives here, who has been invited, and what they are allowed to see. */
export function TenantAccess({
  lease,
  tenants,
  invitations,
}: {
  lease: LeaseView;
  tenants: TenantLine[];
  invitations: InviteLine[];
}) {
  const router = useRouter();
  const { push: toast } = useToast();
  const emailId = useId();
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  // The raw link exists only right after create/reissue: tokens are hashed
  // at rest, so older invites need a new link to show one again.
  const [issued, setIssued] = useState<IssuedLink | null>(null);
  const someone = tenants.length > 0 || invitations.length > 0;

  async function copy(link: string) {
    try {
      await navigator.clipboard.writeText(link);
      toast("Link copied.");
    } catch {
      toast("Couldn't copy. Select the link text instead.", "bad");
    }
  }

  async function invite() {
    const to = email.trim().toLowerCase();
    if (!to) return;
    setBusy(true);
    const res = await fetch(`/api/v1/landlord/leases/${lease.id}/invitations`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: to }),
    });
    const data = (await res.json().catch(() => ({}))) as {
      invitation?: { id: string };
      link?: string;
      emailStatus?: EmailStatus;
      error?: string;
    };
    setBusy(false);
    if (!res.ok || !data.invitation || !data.link) {
      toast(data.error ?? "Something went wrong.", "bad");
      return;
    }
    setIssued({
      inviteId: data.invitation.id,
      email: to,
      link: data.link,
      emailStatus: data.emailStatus ?? "not_configured",
    });
    setEmail("");
    toast(data.emailStatus === "sent" ? `Invite emailed to ${to}.` : "Invite link ready.");
    router.refresh();
  }

  async function reissue(inv: InviteLine) {
    setBusy(true);
    const res = await fetch(`/api/v1/landlord/invitations/${inv.id}/send`, { method: "POST" });
    const data = (await res.json().catch(() => ({}))) as {
      link?: string;
      emailStatus?: EmailStatus;
      error?: string;
    };
    setBusy(false);
    if (!res.ok || !data.link) {
      toast(data.error ?? "Something went wrong.", "bad");
      return;
    }
    setIssued({
      inviteId: inv.id,
      email: inv.email,
      link: data.link,
      emailStatus: data.emailStatus ?? "not_configured",
    });
    toast("New link ready. The old one no longer works.");
    router.refresh();
  }

  async function revoke(inv: InviteLine) {
    const res = await fetch(`/api/v1/landlord/invitations/${inv.id}`, { method: "DELETE" });
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    if (!res.ok) {
      toast(data.error ?? "Something went wrong.", "bad");
      return;
    }
    if (issued?.inviteId === inv.id) setIssued(null);
    toast("Invite cancelled.");
    router.refresh();
  }

  return (
    <div>
      {someone && (
        <ul className="divide-y divide-stone-100">
          {tenants.map((t) => (
            <li key={t.id} className="flex min-h-14 items-center justify-between gap-3 py-2.5">
              <div className="min-w-0">
                <p className="truncate font-medium text-stone-900">{t.name}</p>
                <p className="truncate text-sm text-stone-500">{t.email}</p>
              </div>
              {t.isPrimary && tenants.length > 1 ? (
                <Badge tone="patina">Main contact</Badge>
              ) : (
                <Badge tone="patina">Lives here</Badge>
              )}
            </li>
          ))}
          {invitations.map((inv) => {
            const days = inviteDaysLeft(new Date(inv.expiresAt));
            return (
              <li
                key={inv.id}
                className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:gap-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-stone-900">{inv.email}</p>
                  <p className="text-sm text-copper-deep">
                    {days > 0
                      ? `Invited. The link works for ${days} more day${days === 1 ? "" : "s"}.`
                      : "Invited, but the link has expired."}
                  </p>
                </div>
                <span className="-ml-1 flex shrink-0 items-center gap-1 sm:ml-0">
                  {issued?.inviteId !== inv.id && (
                    <button
                      onClick={() => void reissue(inv)}
                      disabled={busy}
                      className={buttonCls("secondary", "sm")}
                    >
                      Get a new link
                    </button>
                  )}
                  <ConfirmButton
                    onConfirm={() => void revoke(inv)}
                    confirmLabel="Cancel it"
                    title="Cancel this invite"
                    className={buttonCls("danger", "sm")}
                  >
                    Cancel invite
                  </ConfirmButton>
                </span>
              </li>
            );
          })}
        </ul>
      )}

      {issued && (
        <div className="mt-3 rounded-xl border border-patina bg-patina-tint/50 p-4">
          <p className="font-medium text-stone-900">Invite link for {issued.email}</p>
          <div className="mt-2 flex gap-2">
            <input
              readOnly
              value={issued.link}
              onFocus={(e) => e.currentTarget.select()}
              aria-label="Invite link"
              className={`${inputCls} font-mono text-sm`}
            />
            <button onClick={() => void copy(issued.link)} className={buttonCls("primary")}>
              Copy
            </button>
          </div>
          <p className="mt-2 text-sm text-stone-600">
            {emailStatusLine(issued.emailStatus, issued.email)}
          </p>
        </div>
      )}

      <div className={someone ? "mt-4 border-t border-stone-100 pt-4" : ""}>
        <label htmlFor={emailId} className="block text-sm font-medium text-stone-700">
          {someone ? "Invite another person by email" : "Invite your tenant by email"}
        </label>
        <div className="mt-1.5 flex flex-col gap-2 sm:flex-row">
          <input
            id={emailId}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && void invite()}
            type="email"
            autoComplete="off"
            placeholder="name@email.com"
            className={inputCls}
          />
          <button
            onClick={() => void invite()}
            disabled={busy || email.trim() === ""}
            className={`${buttonCls(someone ? "primary" : "accent")} shrink-0`}
          >
            {busy ? "Sending…" : "Send invite"}
          </button>
        </div>
        <p className="mt-2 text-sm text-stone-500">
          They get a link to set a password and see their home. The link works for 7 days.
        </p>
      </div>

      <div className="mt-5 border-t border-stone-100 pt-5">
        <TenantVisibility lease={lease} />
      </div>
    </div>
  );
}
