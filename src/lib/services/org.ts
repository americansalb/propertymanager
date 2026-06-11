import { prisma } from "@/lib/db";

function slugify(name: string): string {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 48) || "org"
  );
}

/** Creates an organization with a unique slug and an OWNER membership. */
export async function createOrgWithOwner(
  tx: Pick<typeof prisma, "organization" | "membership">,
  opts: { name: string; ownerUserId: string },
) {
  const base = slugify(opts.name);
  let slug = base;
  for (let i = 2; ; i++) {
    const existing = await tx.organization.findUnique({ where: { slug }, select: { id: true } });
    if (!existing) break;
    slug = `${base}-${i}`;
  }
  return tx.organization.create({
    data: {
      name: opts.name,
      slug,
      memberships: { create: { userId: opts.ownerUserId, role: "OWNER" } },
    },
  });
}
