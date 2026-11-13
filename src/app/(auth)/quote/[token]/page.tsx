import { previewQuote } from "@/lib/services/quote";
import { formatQuotePrice } from "@/lib/quotes";
import { CATEGORY_LABEL } from "@/lib/validation/maintenance";
import { Badge } from "@/components/ui";
import { QuoteAnswerForm } from "@/components/quote-answer-form";

// A private link: never something a search engine should keep.
export const metadata = { title: "A repair needs a price", robots: { index: false } };

function Plain({ headline, sub }: { headline: string; sub: string }) {
  return (
    <div className="text-center">
      <h1 className="text-2xl font-semibold tracking-tight text-stone-900">{headline}</h1>
      <p className="mt-2 text-stone-600">{sub}</p>
    </div>
  );
}

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 py-2">
      <dt className="text-sm text-stone-500">{label}</dt>
      <dd className="text-base font-medium text-stone-900">{children}</dd>
    </div>
  );
}

export default async function QuotePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const q = await previewQuote(token);

  if (q.state === "invalid") {
    return (
      <Plain
        headline="This link does not work"
        sub="It may have been replaced by a newer one. Ask for a new link."
      />
    );
  }

  const mine = q.mine;
  const myPrice =
    mine.priceLowCents != null ? formatQuotePrice(mine.priceLowCents, mine.priceHighCents) : null;

  if (q.state === "closed") {
    return (
      <Plain
        headline="This one is closed"
        sub={
          mine.status === "NOT_CHOSEN" && myPrice
            ? `${q.ownerName} went with someone else for "${q.title}". Thank you for the quick price.`
            : `"${q.title}" is no longer open. Thank you for looking.`
        }
      />
    );
  }

  const category = CATEGORY_LABEL[q.category as keyof typeof CATEGORY_LABEL] ?? q.category;
  const job = (
    <>
      <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1">
        <h1 className="min-w-0 text-2xl font-semibold tracking-tight text-stone-900">{q.title}</h1>
        <span className="mt-1 flex shrink-0 gap-2">
          {q.urgency === "EMERGENCY" && <Badge tone="red">Emergency</Badge>}
          {q.urgency === "URGENT" && <Badge tone="amber">Urgent</Badge>}
        </span>
      </div>
      <p className="mt-1 text-stone-600">
        {q.where} · {category}
      </p>
      <p className="mt-3 whitespace-pre-wrap text-lg leading-7 text-stone-900">{q.description}</p>
      <dl className="mt-3 border-t border-stone-100 pt-2">
        <Fact label="Going in">
          {q.mayEnter ? "You may go in even if the tenant is out" : "Only when the tenant is home"}
        </Fact>
        {q.bestTimes.length > 0 && <Fact label="Best times">{q.bestTimes.join(", ")}</Fact>}
      </dl>
    </>
  );

  if (q.state === "won") {
    return (
      <div>
        <p className="flex items-center gap-2 text-sm font-semibold text-patina">
          <span aria-hidden="true" className="h-2 w-2 rounded-full bg-patina" />
          You have this job
        </p>
        <div className="mt-2">{job}</div>
        <dl className="border-t border-stone-100 pt-2">
          {myPrice && <Fact label="Your price">{myPrice}</Fact>}
          {mine.availability && <Fact label="You said you can come">{mine.availability}</Fact>}
        </dl>
        <p className="mt-3 text-stone-600">
          {q.ownerName} said yes. They will be in touch to set the time.
        </p>
      </div>
    );
  }

  return (
    <div>
      <p className="text-sm text-stone-500">
        Hi {q.contractorName}. {q.ownerName} needs a price.
      </p>
      <div className="mt-1">{job}</div>

      {q.state === "answered" && (
        <div className="mt-4 rounded-xl border border-patina bg-patina-tint/50 p-4">
          <p className="font-medium text-stone-900">
            {mine.status === "DECLINED"
              ? "You passed on this one."
              : `Your price is with ${q.ownerName}: ${myPrice}.`}
          </p>
          <p className="mt-0.5 text-sm text-stone-600">
            {mine.status === "DECLINED"
              ? "Changed your mind? Send a price below."
              : "You will get an email if they say yes. You can change your answer below."}
          </p>
        </div>
      )}

      <div className="mt-5 border-t border-stone-100 pt-5">
        <QuoteAnswerForm
          token={token}
          ownerName={q.ownerName}
          initial={
            mine.priceLowCents != null
              ? {
                  price: (mine.priceLowCents / 100).toString(),
                  high: mine.priceHighCents != null ? (mine.priceHighCents / 100).toString() : "",
                  availability: mine.availability ?? "",
                  note: mine.note ?? "",
                }
              : undefined
          }
        />
      </div>
    </div>
  );
}
