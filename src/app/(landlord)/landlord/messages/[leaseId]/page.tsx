import { notFound } from "next/navigation";
import { requireOrg } from "@/lib/authz";
import { NotFoundError } from "@/lib/authz/api";
import { getThread } from "@/lib/services/message";
import { BackLink } from "@/components/ui";
import { MessageThread } from "@/components/messages/message-thread";

export const metadata = { title: "Conversation" };

export default async function LandlordThreadPage({
  params,
}: {
  params: Promise<{ leaseId: string }>;
}) {
  const session = await requireOrg("/landlord/messages");
  const { leaseId } = await params;
  let thread: Awaited<ReturnType<typeof getThread>>;
  try {
    thread = await getThread(session.userId, leaseId);
  } catch (e) {
    if (e instanceof NotFoundError) notFound();
    throw e;
  }

  return (
    <div className="mx-auto max-w-3xl">
      <BackLink href="/landlord/messages">Messages</BackLink>
      <h1 className="mt-1 text-3xl font-semibold tracking-tight text-stone-900">
        {thread.otherParty}
      </h1>
      <p className="mt-1 text-stone-600">{thread.title}</p>
      <section className="mt-5 rounded-2xl border border-stone-200 bg-white p-4 sm:p-6">
        <MessageThread
          leaseId={thread.leaseId}
          initialMessages={thread.messages.map((m) => ({ ...m, at: m.at.toISOString() }))}
        />
      </section>
    </div>
  );
}
