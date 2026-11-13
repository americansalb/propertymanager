"use client";

import { useEffect, useRef, useState } from "react";
import { PhoneFrame } from "./frames";

/**
 * The landing hero: one repair, start to finish, on the owner's phone.
 * The tenant reports a leak, both plumbers are asked, two prices come in,
 * the owner taps yes. Pure CSS timing (see .beat in globals.css), so it
 * plays without waiting on anything. "Play it again" remounts the story.
 *
 * This file runs in the browser: it must never import brand settings, so
 * the phone's top bar arrives as a prop from the page.
 */

/** When each beat lands, in seconds. */
const T = {
  report: 0.25,
  asked: 1.05,
  mike: 1.9,
  a1: 2.6,
  yes: 3.35,
  tap: 4.15,
  gone: 4.3,
  won: 4.4,
  told: 5.05,
};

const at = (s: number) => ({ animationDelay: `${s}s` });

function Check() {
  return (
    <svg viewBox="0 0 16 16" className="h-3.5 w-3.5 shrink-0" aria-hidden="true">
      <path
        d="M3.5 8.5 6.5 11.5 12.5 4.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function HeroStory({ bar }: { bar: React.ReactNode }) {
  const [run, setRun] = useState(0);
  const box = useRef<HTMLDivElement>(null);

  // On a phone the story sits below the headline and finishes before anyone
  // scrolls to it. If it was out of view when the page loaded, play it again
  // the first time it comes into view. (It always plays on load, so the
  // page is complete for anyone who never scrolls.)
  useEffect(() => {
    const el = box.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const r = el.getBoundingClientRect();
    const seenAtLoad = r.top < window.innerHeight * 0.6 && r.bottom > 0;
    if (seenAtLoad) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setRun((n) => n + 1);
          io.disconnect();
        }
      },
      { threshold: 0.35 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div ref={box} className="flex flex-col items-center">
      <PhoneFrame label="A landlord's phone. Tom reports that the kitchen sink leaks. Mike's Plumbing and A1 Rooter are asked for a price. Mike says $180.00 for tomorrow morning, A1 says $280.00 to $350.00 for Friday. The landlord taps yes to Mike, and Tom is told who is coming.">
        {bar}
        <div key={run} className="bg-[#f3f6f4] px-3 pb-4 pt-3">
          <p className="font-brand text-[19px] font-semibold leading-6 tracking-tight text-stone-900">
            Kitchen sink leaks
          </p>
          <p className="text-[11px] text-stone-500">Unit 1F at Oakdale Duplex</p>

          <div className="mt-3 space-y-2">
            {/* the tenant reports it */}
            <div className="beat rounded-2xl rounded-tl-md bg-white p-3" style={at(T.report)}>
              <p className="flex items-center gap-2 text-[11px] text-stone-500">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-patina-tint text-[10px] font-bold text-patina">
                  T
                </span>
                Tom Tenant · 10:02 PM
              </p>
              <p className="mt-1.5 text-[13px] leading-5 text-stone-900">
                Water pools under the sink after running it.
              </p>
            </div>

            {/* your people are asked, by themselves */}
            <p
              className="beat flex items-center justify-center gap-1.5 rounded-full bg-patina-tint px-3 py-1.5 text-center text-[11px] font-medium text-patina"
              style={at(T.asked)}
            >
              <Check />
              Asked your 2 plumbers for a price
            </p>

            {/* the prices come in */}
            <div className="beat rounded-2xl bg-white p-3" style={at(T.mike)}>
              <div className="flex items-center justify-between gap-2">
                <span className="text-[12px] font-semibold text-stone-900">Mike&apos;s Plumbing</span>
                <span className="rounded-full bg-patina-tint px-1.5 py-0.5 text-[10px] font-semibold text-patina">
                  Lowest
                </span>
              </div>
              <p className="font-brand mt-0.5 text-[24px] font-bold leading-7 tracking-tight text-stone-900">
                $180.00
              </p>
              <p className="text-[11px] text-stone-600">Can come tomorrow morning</p>
            </div>
            <div className="beat rounded-2xl bg-white p-3" style={at(T.a1)}>
              <span className="text-[12px] font-semibold text-stone-900">A1 Rooter</span>
              <p className="font-brand mt-0.5 text-[24px] font-bold leading-7 tracking-tight text-stone-900">
                $280.00 <span className="text-[14px] text-stone-500">to $350.00</span>
              </p>
              <p className="text-[11px] text-stone-600">Can come Friday</p>
            </div>

            {/* you tap yes */}
            <div className="relative grid">
              <span
                className="beat-gone flex h-11 items-center justify-center rounded-xl bg-copper text-[14px] font-semibold text-iron-deep [grid-area:1/1]"
                style={{ animationDelay: `${T.yes}s, ${T.gone}s` }}
              >
                Say yes to $180.00
              </span>
              <span
                aria-hidden="true"
                className="beat-tap pointer-events-none h-11 w-11 place-self-center rounded-full bg-white [grid-area:1/1]"
                style={at(T.tap)}
              />
              <span
                className="beat flex h-11 items-center justify-center gap-2 rounded-xl bg-keep-deep text-[14px] font-semibold text-white [grid-area:1/1]"
                style={at(T.won)}
              >
                <Check />
                Mike&apos;s Plumbing has the job
              </span>
            </div>

            <p className="beat text-center text-[11px] text-stone-600" style={at(T.told)}>
              Tom was told who is coming, and when.
            </p>
          </div>
        </div>
      </PhoneFrame>
      <button
        type="button"
        onClick={() => setRun((r) => r + 1)}
        className="mt-4 inline-flex min-h-10 items-center gap-2 rounded-full px-4 text-sm font-semibold text-patina transition hover:bg-patina-tint"
      >
        <svg viewBox="0 0 16 16" className="h-4 w-4" aria-hidden="true">
          <path
            d="M13 8a5 5 0 1 1-1.6-3.7M13 2.5v3h-3"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        Play it again
      </button>
    </div>
  );
}
