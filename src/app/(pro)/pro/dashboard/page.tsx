import { requireRole } from "@/lib/authz";
import { prisma } from "@/lib/db";
import { getProPage } from "@/lib/services/pro";
import { ProPageEditor } from "@/components/pro/pro-page-editor";

export const metadata = { title: "Your page" };

export default async function ProDashboard() {
  const session = await requireRole("PRO", "/pro/dashboard");
  const profile = await prisma.proProfile.findUnique({
    where: { userId: session.userId },
    select: { id: true },
  });
  if (!profile) return null;
  const page = await getProPage({ userId: session.userId, proProfileId: profile.id });

  return (
    <div className="mx-auto max-w-3xl">
      <ProPageEditor
        data={{
          ...page,
          prices: page.prices.map((p) => ({ taskKey: p.taskKey, fromCents: p.fromCents })),
        }}
      />
    </div>
  );
}
