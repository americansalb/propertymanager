import { requireRole } from "@/lib/authz";
import { getTenantThread } from "@/lib/services/message";
import { Card, PageTitle } from "@/components/ui";
import { MessageThread } from "@/components/messages/message-thread";

export const metadata = { title: "Messages" };

export default async function TenantMessages() {
  const session = await requireRole("TENANT", "/tenant/messages");
  const thread = await getTenantThread(session.userId);

  return (
    <div className="mx-auto max-w-xl">
      <PageTitle>Messages</PageTitle>
      {!thread ? (
        <Card className="mt-4 p-5 text-sm text-stone-500">
          Your home isn&apos;t connected yet. Once you accept your invite, you can message your
          landlord here.
        </Card>
      ) : (
        <>
          <p className="mt-1 text-sm text-stone-500">
            {thread.otherParty} · {thread.title}
          </p>
          <Card className="mt-4 p-4 sm:p-5">
            <MessageThread
              leaseId={thread.leaseId}
              initialMessages={thread.messages.map((m) => ({ ...m, at: m.at.toISOString() }))}
            />
          </Card>
        </>
      )}
    </div>
  );
}
