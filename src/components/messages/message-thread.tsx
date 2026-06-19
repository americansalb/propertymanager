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
      setError(d.error ?? "Could not send.");
      return;
    }
    setBody("");
    await refresh();
  }

  return (
    <div className="flex flex-col">
      <div className="flex max-h-[60vh] flex-col gap-3 overflow-y-auto py-1">
        {messages.length === 0 ? (
          <p className="py-10 text-center text-sm text-stone-500">No messages yet. Say hello.</p>
        ) : (
          messages.map((m) => (
            <div key={m.id} className={`flex flex-col ${m.mine ? "items-end" : "items-start"}`}>
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm ${
                  m.mine ? "bg-iron text-white" : "border border-stone-200 bg-white text-stone-800"
                }`}
              >
                <p className="whitespace-pre-wrap">{m.body}</p>
              </div>
              <span className="mt-1 px-1 text-[11px] text-stone-400">
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
          className="flex-1 resize-none rounded-lg border border-stone-300 px-3 py-2 text-sm text-stone-900 placeholder-stone-400 focus:border-patina focus:outline-none focus:ring-1 focus:ring-patina"
        />
        <button
          type="submit"
          disabled={busy || body.trim().length === 0}
          className={`${buttonCls("primary")} disabled:opacity-50`}
        >
          {busy ? "Sending…" : "Send"}
        </button>
      </form>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  );
}
