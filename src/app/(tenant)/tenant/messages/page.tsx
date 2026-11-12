import { requireRole } from "@/lib/authz";
import { getTenantThread } from "@/lib/services/message";
import { MessageThread } from "@/components/messages/message-thread";

export const metadata = { title: "Messages" };

export default async function TenantMessages() {
  const session = await requireRole("TENANT", "/tenant/messages");
  const thread = await getTenantThread(session.userId);

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-3xl font-semibold tracking-tight text-stone-900">Messages</h1>
      {!thread ? (
        <section className="mt-5 rounded-2xl border border-stone-200 bg-white p-6 sm:p-8">
          <p className="text-xl font-semibold tracking-tight text-stone-900">
            Your home is not connected yet
          </p>
          <p className="mt-1 text-stone-600">
            Open the invite link your landlord sent you. After that, you can message them here.
          </p>
        </section>
      ) : (
        <>
          <p className="mt-1 text-stone-600">
            With {thread.otherParty}, about {thread.title}
          </p>
          <section className="mt-5 rounded-2xl border border-stone-200 bg-white p-4 sm:p-6">
            <MessageThread
              leaseId={thread.leaseId}
              initialMessages={thread.messages.map((m) => ({ ...m, at: m.at.toISOString() }))}
            />
          </section>
        </>
      )}
    </div>
  );
}
