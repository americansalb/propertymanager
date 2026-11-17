import Link from "next/link";
import { notFound } from "next/navigation";
import { requireOrg } from "@/lib/authz";
import { NotFoundError } from "@/lib/authz/api";
import { getOwnerProject } from "@/lib/services/project";
import { TRADE_LABEL, type Trade } from "@/lib/quotes";
import { BackLink, Badge, Section } from "@/components/ui";
import { BidList } from "@/components/projects/bid-list";

export const metadata = { title: "Project" };

export default async function OwnerProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireOrg("/landlord/maintenance");
  const { id } = await params;
  let project: Awaited<ReturnType<typeof getOwnerProject>>;
  try {
    project = await getOwnerProject({ userId: session.userId, orgId: session.orgId }, id);
  } catch (e) {
    if (e instanceof NotFoundError) notFound();
    throw e;
  }
  const open = project.status === "OPEN_FOR_BIDS";
  const live = project.bids.filter((b) => b.status === "PENDING").length;
  const winner = project.bids.find((b) => b.status === "ACCEPTED");

  return (
    <div className="mx-auto max-w-3xl">
      <BackLink href="/landlord/maintenance">Repairs</BackLink>
      <div className="mt-1 flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
        <h1 className="min-w-0 text-3xl font-semibold tracking-tight text-stone-900">{project.title}</h1>
        <span className="mt-2 shrink-0">
          {open ? (
            <Badge tone="copper">{live === 0 ? "Taking bids" : live === 1 ? "1 bid to look at" : `${live} bids to compare`}</Badge>
          ) : winner ? (
            <Badge tone="patina">Has a pro</Badge>
          ) : (
            <Badge tone="stone">Taken down</Badge>
          )}
        </span>
      </div>
      <p className="mt-1 text-stone-600">
        {project.where} · {TRADE_LABEL[project.trade as Trade] ?? project.trade}
        {open ? ` · ${project.closes}` : ""}
      </p>

      <section className="mt-6 rounded-2xl border border-stone-200 bg-white p-5 sm:p-6">
        <p className="whitespace-pre-wrap text-lg leading-7 text-stone-900">{project.description}</p>
        {project.repairId && (
          <p className="mt-3 text-sm">
            <Link href={`/landlord/maintenance/${project.repairId}`} className="font-medium text-patina underline">
              See the tenant&apos;s report
            </Link>
          </p>
        )}
      </section>

      <Section title="Bids">
        <BidList
          projectId={project.id}
          open={open}
          bids={project.bids.map((b) => ({
            id: b.id,
            status: b.status,
            amountCents: b.amountCents,
            amountHighCents: b.amountHighCents,
            availability: b.availability,
            message: b.message,
            pro: b.pro,
          }))}
        />
      </Section>
    </div>
  );
}
