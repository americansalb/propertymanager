/**
 * The client's IP, as seen through the platform proxy.
 *
 * X-Forwarded-For is "client, proxy1, proxy2, ...": the LEFTMOST entry is
 * whatever the client sent (freely spoofable), and each proxy appends the
 * address it received the request from. Render terminates at its own load
 * balancer, which appends the real remote address as the RIGHTMOST entry, so
 * the last hop is the value to trust. Taking the first entry (the old
 * behavior) let anyone rotate the header to mint unlimited rate-limit buckets
 * and forge every audit-log IP; take the last instead.
 */
export function getClientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) {
    const hops = fwd
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    if (hops.length > 0) return hops[hops.length - 1]!;
  }
  return "unknown";
}
