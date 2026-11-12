"use client";

import { useEffect, useRef, useState } from "react";
import { buttonCls } from "@/components/ui";

export type ThreadMsg = {
  id: string;
  body: string;
  at: string;
  mine: boolean;
  senderName: string | null;
};

function fmtTime(iso: string) {
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

/**
 * A lease conversation: message bubbles plus a composer. Sends through the
 * shared /api/v1/messages route and polls for new messages while open. Enter
 * sends; Shift+Enter makes a newline.
 */
export function MessageThread({
  leaseId,
  initialMessages,
}: {
  leaseId: string;
  initialMessages: ThreadMsg[];
}) {
  const [messages, setMessages] = useState<ThreadMsg[]>(initialMessages);
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  async function refresh() {
    const res = await fetch(`/api/v1/messages?leaseId=${encodeURIComponent(leaseId)}`, {
      cache: "no-store",
    });
    if (!res.ok) return;
    const data = (await res.json()) as { thread?: { messages: ThreadMsg[] } };
    if (data.thread?.messages) setMessages(data.thread.messages);
  }

  useEffect(() => {
    const id = setInterval(refresh, 20_000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leaseId]);

  async function submit() {
    const text = body.trim();
    if (!text || busy) return;
    setBusy(true);
    setError(null);
    const res = await fetch("/api/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ leaseId, body: text }),
    });
    setBusy(false);
    if (!res.ok) {
      const d = (await res.json().catch(() => ({}))) as { error?: string };
      setError(d.error ?? "That did not send. Try again.");
      return;
    }
    setBody("");
    await refresh();
  }

  return (
    <div className="flex flex-col">
      <div className="flex max-h-[60vh] flex-col gap-3 overflow-y-auto py-1">
        {messages.length === 0 ? (
          <p className="py-8 text-center text-stone-600">No messages yet. Write the first one below.</p>
        ) : (
          messages.map((m) => (
            <div key={m.id} className={`flex flex-col ${m.mine ? "items-end" : "items-start"}`}>
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-base leading-6 ${
                  m.mine ? "bg-keep-deep text-white" : "bg-stone-100 text-stone-900"
                }`}
              >
                <p className="whitespace-pre-wrap">{m.body}</p>
              </div>
              <span className="mt-1 px-1 text-xs text-stone-500">
                {m.mine ? "You" : (m.senderName ?? "")} · {fmtTime(m.at)}
              </span>
            </div>
          ))
        )}
        <div ref={endRef} />
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
        className="mt-3 flex items-end gap-2 border-t border-stone-100 pt-3"
      >
        <textarea
          value={body}
          onChange={(e) => {
            setBody(e.target.value);
            setError(null);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void submit();
            }
          }}
          placeholder="Write a message"
          aria-label="Message"
          rows={2}
          className="min-w-0 flex-1 resize-none rounded-xl border border-stone-300 bg-white px-3.5 py-3 text-base text-stone-900 placeholder-stone-400 focus:border-patina focus:outline-none focus:ring-2 focus:ring-patina/25"
        />
        <button
          type="submit"
          disabled={busy || body.trim().length === 0}
          className={`${buttonCls("primary")} min-h-12`}
        >
          {busy ? "Sending…" : "Send"}
        </button>
      </form>
      {error && (
        <p role="alert" className="mt-2 text-sm font-medium text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}
