import Link from "next/link";
import { notFound } from "next/navigation";
import { requireOrg } from "@/lib/authz";
import { NotFoundError } from "@/lib/authz/api";
import { getThread } from "@/lib/services/message";
import { Card } from "@/components/ui";
import { IconChevronLeft } from "@/components/icons";
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
    <div className="mx-auto max-w-2xl">
      <Link
        href="/landlord/messages"
        className="-ml-2 inline-flex items-center gap-1 rounded-lg px-2 py-1 text-sm text-stone-400 hover:bg-stone-100 hover:text-stone-600"
      >
        <IconChevronLeft className="h-3 w-3" /> Messages
      </Link>
      <h1 className="mt-2 font-display text-2xl font-semibold tracking-tight text-stone-900">
        {thread.otherParty}
      </h1>
      <p className="mt-1 text-sm text-stone-500">{thread.title}</p>
      <Card className="mt-4 p-4 sm:p-5">
        <MessageThread
          leaseId={thread.leaseId}
          initialMessages={thread.messages.map((m) => ({ ...m, at: m.at.toISOString() }))}
        />
      </Card>
    </div>
  );
}
