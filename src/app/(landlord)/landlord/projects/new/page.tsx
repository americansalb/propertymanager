import { requireOrg } from "@/lib/authz";
import { prisma } from "@/lib/db";
import { openTradeForCategory } from "@/lib/projects";
import type { RepairCategory } from "@/lib/quotes";
import { unitTitle } from "@/lib/units";
import { BackLink, Section } from "@/components/ui";
import { NewProjectForm } from "@/components/projects/new-project-form";

export const metadata = { title: "Post a project" };

export default async function NewProjectPage({ searchParams }: { searchParams: Promise<{ repair?: string }> }) {
  const session = await requireOrg("/landlord/projects/new");
  const { repair: repairId } = await searchParams;

  const [properties, repairRow] = await Promise.all([
    prisma.property.findMany({
      where: { orgId: session.orgId },
      orderBy: { name: "asc" },
      select: { id: true, name: true, units: { orderBy: { unitNumber: "asc" }, select: { id: true, unitNumber: true } } },
    }),
    repairId
      ? prisma.maintenanceRequest.findFirst({
          where: { id: repairId, orgId: session.orgId },
          select: { id: true, title: true, description: true, category: true, unit: { select: { unitNumber: true } }, property: { select: { name: true } } },
        })
      : Promise.resolve(null),
  ]);
  const repair =
    repairRow && openTradeForCategory(repairRow.category as RepairCategory)
      ? {
          id: repairRow.id,
          title: repairRow.title,
          description: repairRow.description,
          where: repairRow.unit ? `${unitTitle(repairRow.unit.unitNumber)} at ${repairRow.property.name}` : repairRow.property.name,
          trade: openTradeForCategory(repairRow.category as RepairCategory)!,
        }
      : null;

  return (
    <div className="mx-auto max-w-3xl">
      <BackLink href="/landlord/maintenance">Repairs</BackLink>
      <h1 className="mt-1 text-3xl font-semibold tracking-tight text-stone-900">
        {repair ? "Open it to nearby pros" : "Post a project"}
      </h1>
      <p className="mt-1 text-stone-600">
        Pros who do this work in that ZIP code are told right away. They bid with a price and a time,
        and you pick one. It is free, and the money stays between you and them.
      </p>
      <Section title={repair ? "The project" : "What and where"}>
        {properties.length === 0 ? (
          <p className="text-stone-600">Add a property first, then post a project for it.</p>
        ) : (
          <NewProjectForm
            repair={repair}
            places={properties.map((p) => ({
              id: p.id,
              name: p.name,
              units: p.units.map((u) => ({ id: u.id, label: unitTitle(u.unitNumber) })),
            }))}
          />
        )}
      </Section>
    </div>
  );
}
