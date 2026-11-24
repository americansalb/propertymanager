import type { SpotView } from "@/lib/urgent";

/**
 * Where things are, for someone who has never been in the basement: the
 * owner's words and their photo. Server-safe; used on the tenant's home,
 * in an emergency, and nowhere a stranger can reach.
 */
export function SpotList({ spots }: { spots: SpotView[] }) {
  return (
    <ul className="divide-y divide-stone-100">
      {spots.map((s) => (
        <li key={s.spot} className="py-3">
          <p className="text-sm text-stone-500">{s.label}</p>
          {s.where && (
            <p className="mt-0.5 break-words text-base font-medium text-stone-900">{s.where}</p>
          )}
          {s.photoUrl && (
            <a
              href={s.photoUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-2 block overflow-hidden rounded-lg border border-stone-200 bg-stone-100"
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- private bytes, no loader */}
              <img
                src={s.photoUrl}
                alt={`Photo of the ${s.label.toLowerCase()}`}
                className="max-h-72 w-full object-cover"
              />
            </a>
          )}
        </li>
      ))}
    </ul>
  );
}
