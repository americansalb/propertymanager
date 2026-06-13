"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { formatCents } from "@/lib/money";
import {
  formatLeaseDate,
  LEASE_SHARE_FIELDS,
  leaseTermLabel,
  ordinal,
  parseDateOnly,
  SHARE_FIELD_LABEL,
  type LeaseShareField,
} from "@/lib/leases";
import { inviteDaysLeft } from "@/lib/invites";
import { UTILITY_SUGGESTIONS } from "@/lib/validation/property";
import { Badge, buttonCls, inputCls } from "@/components/ui";
import { ConfirmButton, useToast } from "@/components/ui-feedback";
import { EditableRow, useRowPatch } from "@/components/ui-inline";

/**
 * The lease lives outside the app; this panel is where the landlord puts its
 * facts on file. One click drafts it from the unit's standing terms, every
 * row edits in place, and the tenant side hangs off it: one visibility
 * switch, invites by link (email when configured), the people themselves.
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

function StartLease({ unitId, occupied }: { unitId: string; occupied: boolean }) {
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
    toast("Lease drafted from the unit's terms.");
    router.refresh();
  }

  return (
    <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="text-sm font-medium text-stone-800">
          {occupied ? "Put the lease on file" : "No lease on file yet"}
        </p>
        <p className="text-sm text-stone-500">
          Starts as a copy of the unit&apos;s terms; edit any row after.
        </p>
      </div>
      <button onClick={() => void start()} disabled={busy} className={buttonCls("primary", "sm")}>
        {busy ? "Drafting…" : "Start the lease"}
      </button>
    </div>
  );
}

type EmailStatus = "sent" | "not_configured" | "failed";

function emailStatusLine(status: EmailStatus, email: string): string {
  if (status === "sent") return `Also emailed to ${email}.`;
  if (status === "failed") return "The email didn't go out, so share this link yourself.";
  return "Email sending isn't set up yet, so share this link yourself.";
}

type IssuedLink = { inviteId: string; email: string; link: string; emailStatus: EmailStatus };

/**
 * Per-field sharing: pills the landlord taps to choose exactly which term
 * groups the tenant sees. Optimistic; the PATCH carries the whole list.
 */
function ShareFieldPills({
  leaseId,
  sharedFields,
}: {
  leaseId: string;
  sharedFields: string[];
}) {
  const router = useRouter();
  const { push: toast } = useToast();
  const [shown, setShown] = useState<string[]>(sharedFields);
  const [busy, setBusy] = useState(false);

  async function toggle(field: LeaseShareField) {
    const next = shown.includes(field)
      ? shown.filter((f) => f !== field)
      : [...shown, field];
    const previous = shown;
    setShown(next);
    setBusy(true);
    const res = await fetch(`/api/v1/landlord/leases/${leaseId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sharedFields: next }),
    });
    setBusy(false);
    if (!res.ok) {
      setShown(previous);
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      toast(data.error ?? "Something went wrong.", "bad");
      return;
    }
    router.refresh();
  }

  return (
    <div className="mt-2">
      <p className="text-xs text-stone-400">They see:</p>
      <div className="mt-1.5 flex flex-wrap gap-1.5">
        {LEASE_SHARE_FIELDS.map((field) => {
          const on = shown.includes(field);
          return (
            <button
              key={field}
              onClick={() => void toggle(field)}
              disabled={busy}
              aria-pressed={on}
              className={`rounded-full border px-2.5 py-0.5 text-xs font-medium transition disabled:opacity-60 ${
                on
                  ? "border-patina bg-patina-tint text-patina"
                  : "border-stone-200 text-stone-400 hover:border-stone-300 hover:text-stone-500"
              }`}
            >
              {on ? "✓ " : ""}
              {SHARE_FIELD_LABEL[field]}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function InviteBlock({
  leaseId,
  tenants,
  invitations,
}: {
  leaseId: string;
  tenants: TenantLine[];
  invitations: InviteLine[];
}) {
  const router = useRouter();
  const { push: toast } = useToast();
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  // The raw link exists only right after create/reissue: tokens are hashed
  // at rest, so older invites need "New link" to show one again.
  const [issued, setIssued] = useState<IssuedLink | null>(null);

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
    const res = await fetch(`/api/v1/landlord/leases/${leaseId}/invitations`, {
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
    toast("Fresh link issued. The old one no longer works.");
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
    toast("Invite revoked.");
    router.refresh();
  }

  return (
    <div>
      {tenants.length > 0 && (
        <ul className="mb-3 space-y-1.5">
          {tenants.map((t) => (
            <li key={t.id} className="flex items-center gap-2 text-sm">
              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-patina" />
              <span className="font-medium text-stone-900">{t.name}</span>
              <span className="truncate text-stone-500">{t.email}</span>
              {t.isPrimary && tenants.length > 1 && <Badge tone="patina">Primary</Badge>}
            </li>
          ))}
        </ul>
      )}

      {invitations.length > 0 && (
        <ul className="mb-3 space-y-1.5">
          {invitations.map((inv) => {
            const days = inviteDaysLeft(new Date(inv.expiresAt));
            return (
              <li key={inv.id} className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-copper" />
                <span className="text-stone-700">Invited {inv.email}</span>
                <span className="text-xs text-stone-400">
                  {days > 0 ? `expires in ${days} day${days === 1 ? "" : "s"}` : "expired"}
                </span>
                <span className="ml-auto flex items-center gap-1">
                  {issued?.inviteId !== inv.id && (
                    <button
                      onClick={() => void reissue(inv)}
                      disabled={busy}
                      className={buttonCls("ghost", "sm")}
                    >
                      New link
                    </button>
                  )}
                  <ConfirmButton
                    onConfirm={() => void revoke(inv)}
                    confirmLabel="Revoke"
                    title="Revoke invite"
                    className={buttonCls("danger", "sm")}
                  >
                    Revoke
                  </ConfirmButton>
                </span>
              </li>
            );
          })}
        </ul>
      )}

      {issued && (
        <div className="mb-3 rounded-lg border border-patina bg-patina-tint/40 p-3">
          <p className="text-sm font-medium text-stone-900">Invite link for {issued.email}</p>
          <div className="mt-1.5 flex gap-2">
            <input
              readOnly
              value={issued.link}
              onFocus={(e) => e.currentTarget.select()}
              aria-label="Invite link"
              className={`${inputCls} font-mono text-xs`}
            />
            <button onClick={() => void copy(issued.link)} className={buttonCls("secondary", "sm")}>
              Copy
            </button>
          </div>
          <p className="mt-1.5 text-xs text-stone-500">
            {emailStatusLine(issued.emailStatus, issued.email)}
          </p>
        </div>
      )}

      <div className="flex gap-2">
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && void invite()}
          type="email"
          placeholder="tenant@email.com"
          aria-label="Tenant email"
          className={inputCls}
        />
        <button
          onClick={() => void invite()}
          disabled={busy || email.trim() === ""}
          className={buttonCls("primary", "sm")}
        >
          {tenants.length > 0 || invitations.length > 0 ? "Invite another" : "Invite"}
        </button>
      </div>
      <p className="mt-1.5 text-xs text-stone-400">
        They get a link to set a password and see their home. Links last 7 days.
      </p>
    </div>
  );
}

function LeasePanel({
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
  const patch = useRowPatch(`/api/v1/landlord/leases/${lease.id}`);
  const start = parseDateOnly(lease.startDate);
  const end = lease.endDate ? parseDateOnly(lease.endDate) : null;

  async function removeDraft() {
    const res = await fetch(`/api/v1/landlord/leases/${lease.id}`, { method: "DELETE" });
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    if (!res.ok) {
      toast(data.error ?? "Something went wrong.", "bad");
      return;
    }
    toast("Draft lease removed.");
    router.refresh();
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        {lease.status === "ACTIVE" ? (
          <Badge tone="patina">Active</Badge>
        ) : lease.status === "DRAFT" ? (
          <Badge tone="amber">Draft</Badge>
        ) : (
          <Badge tone="stone">{lease.status.toLowerCase()}</Badge>
        )}
        <span className="text-sm text-stone-500">{leaseTermLabel(start, end)}</span>
        {lease.status === "DRAFT" && tenants.length === 0 && (
          <span className="ml-auto">
            <ConfirmButton
              onConfirm={() => void removeDraft()}
              confirmLabel="Remove"
              title="Remove draft lease"
              className={buttonCls("danger", "sm")}
            >
              Remove
            </ConfirmButton>
          </span>
        )}
      </div>

      <div className="mt-4 grid gap-x-10 sm:grid-cols-2">
        <div>
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-copper-deep">
            The agreement
          </p>
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
            emptyPrompt="Month to month. Set an end date?"
            kind={{ kind: "date" }}
            onSave={(v) => patch({ endDate: v })}
            savedToast="End date saved."
          />
          <EditableRow
            label="Rent"
            value={dollars(lease.monthlyRentCents)}
            display={money(lease.monthlyRentCents, "/mo")}
            emptyPrompt="What's the rent?"
            kind={{ kind: "money", placeholder: "1,850" }}
            onSave={(v) => patch({ monthlyRentDollars: v })}
            savedToast="Rent saved."
            required
          />
          <EditableRow
            label="Due day"
            value={lease.rentDueDay.toString()}
            display={`The ${ordinal(lease.rentDueDay)} of the month`}
            emptyPrompt="Which day is rent due?"
            kind={{ kind: "number", placeholder: "1" }}
            onSave={(v) => patch({ rentDueDay: v })}
            savedToast="Due day saved."
            required
          />
          <EditableRow
            label="Deposit"
            value={lease.securityDepositCents > 0 ? dollars(lease.securityDepositCents) : null}
            display={lease.securityDepositCents > 0 ? money(lease.securityDepositCents) : null}
            emptyPrompt="No deposit held."
            kind={{ kind: "money", placeholder: "1,850" }}
            onSave={(v) => patch({ securityDepositDollars: v })}
            savedToast="Deposit saved."
          />
          <EditableRow
            label="Late fee"
            value={lease.lateFeeCents > 0 ? dollars(lease.lateFeeCents) : null}
            display={lease.lateFeeCents > 0 ? money(lease.lateFeeCents) : null}
            emptyPrompt="If rent comes late."
            kind={{ kind: "money", placeholder: "75" }}
            onSave={(v) => patch({ lateFeeDollars: v })}
            savedToast="Late fee saved."
          />
          {lease.lateFeeCents > 0 && (
            <EditableRow
              label="Grace days"
              value={lease.lateFeeGraceDays.toString()}
              display={`${lease.lateFeeGraceDays} day${lease.lateFeeGraceDays === 1 ? "" : "s"}`}
              emptyPrompt="Days before the fee applies."
              kind={{ kind: "number", placeholder: "5" }}
              onSave={(v) => patch({ lateFeeGraceDays: v })}
              savedToast="Grace period saved."
              required
            />
          )}
        </div>

        <div>
          <p className="mb-1 mt-4 text-[10px] font-semibold uppercase tracking-widest text-patina sm:mt-0">
            What&apos;s included
          </p>
          <EditableRow
            label="Pet deposit"
            value={dollars(lease.petDepositCents)}
            display={money(lease.petDepositCents)}
            emptyPrompt="One-time, if pets moved in."
            kind={{ kind: "money", placeholder: "300" }}
            onSave={(v) => patch({ petDepositDollars: v })}
            savedToast="Pet deposit saved."
          />
          <EditableRow
            label="Pet rent"
            value={dollars(lease.petRentCents)}
            display={money(lease.petRentCents, "/mo")}
            emptyPrompt="Monthly, per pet."
            kind={{ kind: "money", placeholder: "50" }}
            onSave={(v) => patch({ petRentDollars: v })}
            savedToast="Pet rent saved."
          />
          <EditableRow
            label="Parking spot"
            value={lease.parkingSpot}
            emptyPrompt="Assigned spot, garage, street permit?"
            kind={{ kind: "text", placeholder: "1 assigned spot, garage" }}
            onSave={(v) => patch({ parkingSpot: v })}
            savedToast="Saved."
          />
          <EditableRow
            label="Parking rent"
            value={dollars(lease.parkingRentCents)}
            display={lease.parkingRentCents === 0 ? "Included" : money(lease.parkingRentCents, "/mo")}
            emptyPrompt="Monthly; enter 0 if included."
            kind={{ kind: "money", placeholder: "150" }}
            onSave={(v) => patch({ parkingRentDollars: v })}
            savedToast="Parking rent saved."
          />
          <EditableRow
            label="Utilities"
            value={lease.utilitiesIncluded}
            emptyPrompt="Which utilities are included?"
            kind={{ kind: "chips", suggestions: UTILITY_SUGGESTIONS, placeholder: "Add utility" }}
            onSave={(v) => patch({ utilitiesIncluded: Array.isArray(v) ? v : [] })}
            savedToast="Utilities saved."
          />
        </div>
      </div>

      <div className="mt-5 border-t border-stone-100 pt-4">
        <p className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-stone-400">
          Tenant
        </p>
        <EditableRow
          label="Lease visibility"
          value={lease.shareWithTenant ? "SHOWN" : "HIDDEN"}
          display={
            lease.shareWithTenant ? "Shown to the tenant" : "Hidden from the tenant"
          }
          emptyPrompt="Shown or hidden?"
          kind={{
            kind: "select",
            options: [
              { value: "SHOWN", label: "Shown to the tenant" },
              { value: "HIDDEN", label: "Hidden from the tenant" },
            ],
          }}
          onSave={(v) => patch({ shareWithTenant: v === "SHOWN" })}
          savedToast="Visibility saved."
          required
        />
        {lease.shareWithTenant && (
          <ShareFieldPills leaseId={lease.id} sharedFields={lease.sharedFields} />
        )}
        <div className="mt-3">
          <InviteBlock leaseId={lease.id} tenants={tenants} invitations={invitations} />
        </div>
      </div>
    </div>
  );
}

export function LeaseSection({
  unitId,
  occupied,
  lease,
  tenants,
  invitations,
}: {
  unitId: string;
  occupied: boolean;
  lease: LeaseView | null;
  tenants: TenantLine[];
  invitations: InviteLine[];
}) {
  return lease ? (
    <LeasePanel lease={lease} tenants={tenants} invitations={invitations} />
  ) : (
    <StartLease unitId={unitId} occupied={occupied} />
  );
}
