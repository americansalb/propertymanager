# VillageKeep: core surfaces spec

First-principles design for the three load-bearing surfaces: the marketplace
loop, property profiles, and the landlord dashboard. This is the working
product spec; milestones implement slices of it.

## 1. Marketplace

### The wedge

Every other home-services platform sells unverified leads to five competing
pros and walks away before money changes hands. Our jobs originate inside a
property management system, which means:

- Demand is verified: a real landlord, a real unit, an address, photos,
  urgency, access notes. Not a form fill.
- Context pros never get elsewhere: permission to enter, tenant availability
  (the tenant is in-app), pets, lockbox, shutoff locations.
- We hold the money. Escrow is the trust mechanism both sides lack today.

Pro pitch: free to join, no lead fees, you see the budget band up front, and
a FUNDED badge means the money already exists before you drive anywhere.
Paid in days, not net-30. Landlord pitch: vetted pros, transparent typical
prices, payment released only when you approve the work.

### The loop

1. ORIGINATE. A maintenance request (tenant- or landlord-created) converts
   to a Job with one action (MaintenanceRequest.convertedJobId). Photos,
   trade, urgency, ZIP, access notes carry over. Standalone jobs also work
   (Job.orgId nullable: the marketplace stands alone).
2. SCOPE. The service catalog anchors price expectations ("Water heater
   replacement, Chicago: typically $950 to $1,900"). Landlord sets an
   optional budget band and bid deadline.
3. MATCH. No blasting. JobInvites go to 3 to 5 pros where trade matches,
   ZIP is in ProServiceArea, status ACTIVE, acceptingJobs, under
   maxConcurrentJobs, and verifications are current (license where
   required, insurance at or above $500k). Ranked by response speed,
   rating, completions. Widen the wave after N hours without bids;
   EMERGENCY urgency widens immediately.
4. BID. Pros see full context plus the typical price band. A bid is:
   amount, materials included or not, earliest start, message, optional
   milestone breakdown for large jobs.
5. AWARD AND FUND. Accepting a bid immediately prompts funding (full
   amount for small jobs, milestone 1 for large). Stripe separate charges
   and transfers; EscrowIntent per milestone. No funding, no scheduling.
   The FUNDED state is the product.
6. EXECUTE. Scheduling proposes windows to the tenant in-app (our unfair
   advantage: no phone tag). Pro marks arrival, uploads completion photos,
   submits work.
7. RELEASE. Landlord approves; escrow transfers to the pro minus
   takeRateBps (default 10%). Auto-approve after 72h of landlord silence,
   with reminders; an open dispute pauses the clock. Ledger entries are
   append-only on both sides.
8. REVIEW. Two-sided, five dimensions, only after a funded job: every
   review is verified-work. Pro responses allowed.

### Money and integrity rules

- Separate charges and transfers only. Never destination charges: refunds,
  partial releases, and splits stay clean.
- Pro payout gates: Stripe payouts_enabled AND TIN matched
  (ProProfile.firstPayoutHold). W-9 collected at onboarding.
- Rent collection stays at 0 bps (acquisition); the marketplace take rate
  is the revenue line.
- Disputes are platform-level (quality), founder-adjudicated at first with
  an SLA clock, resolved as release, refund, or split. Distinct from card
  disputes. Do not automate before volume exists.
- Off-platform leakage: counter with value, not policing. Repeat-hire is
  one tap, and the take rate drops for repeat landlord-pro pairs (e.g. 10%
  to 7%): staying must be cheaper than leaving.

### Supply cold start (Chicago)

Seed 10 to 20 pros per launch trade (plumbing, electrical, handyman: the
highest-frequency maintenance categories). Manual verification through an
admin queue (license, COI); VERIFIED badge is the carrot. PREMIUM tier
(placement, SLAs) waits until demand justifies it.

### Pro portal surfaces

Lead feed (invites with context and price band), My bids, Jobs pipeline
(funded / scheduled / in progress / submitted / paid), Earnings (ledger
view, next payout), Profile and credentials with 30-day expiry warnings
and auto-suspend on expiry.

## 2. Property profiles

A property profile is not a listing; it is the operational record of an
asset. Audiences: the landlord (asset state and economics), the system
(everything hangs off property/unit), an assigned pro (a scoped access
slice), later the tenant (their unit's slice).

### Anatomy

- HEADER: name, address, type, hero photo, occupancy summary (3 of 4
  occupied), scheduled vs collected this month. Quick actions: add unit,
  invite tenant, new maintenance, get bids.
- UNITS (exists today): per unit: number, beds/baths/sqft, market rent,
  status, current lease chip (tenant, rent, end date) or vacancy age with
  an invite action. Unit detail page: lease history, charge ledger,
  maintenance history.
- MONEY: per-property P&L lite: scheduled vs collected by month,
  outstanding by tenant, maintenance spend YTD. Small landlords do this in
  spreadsheets; even a simple roll-up is a retention feature.
- MAINTENANCE: open items, plus history with costs ("water heater, March,
  $1,240, Smith Plumbing"). The repair log is the asset's medical record:
  valuable at sale or refi, and quiet long-term lock-in.
- DETAILS AND ACCESS (operational gold nobody else stores): parking,
  lockbox and key location (encrypted, shared per-job with the assigned
  pro only), water main and breaker locations, appliance inventory with
  model/serial and age (enables remote quoting and, later, failure
  prediction), HOA contact, insurance, roof age. All optional, filled over
  time; every field raises quote accuracy and switching cost.
- DOCUMENTS: deed, insurance, inspections, leases (Attachment model).
- ACTIVITY: append-only feed scoped to the property (AuditLog).

Phasing: header and units exist. Lease chips and money arrive with 1.4,
maintenance tab with 1.5, details/access alongside 1.5 (pros need them),
documents when upload infra lands.

## 3. Landlord dashboard

### Principle

First login and login 1,000 are the same screen: an attention engine.
The landlord's only question is "is everything okay, and what needs me?"
On day 0 the answers are setup gaps; in year 3 they are operations
exceptions. Inventory never lives on the dashboard; it lives in
Properties, Tenants, Money, Maintenance.

### One engine, three renderings (standalone + integrated marketplace)

The marketplace ships standalone AND inside the PM tool. That is a
composition rule, not two dashboards. The dashboard renders zones based
on what the account has; roles are already derived from data, and the
dashboard follows the same philosophy.

1. PM LANDLORD (org with properties): full attention engine below.
   Marketplace is a verb inside their workflow, not a place: "Get bids"
   on a maintenance request, then bids/funding/release events surface as
   attention items and pulse segments. A "Find a pro" entry exists for
   proactive hiring (e.g. seasonal gutter cleaning) without a
   maintenance request.
2. STANDALONE POSTER (jobs, no org): the same engine minus the PM zones.
   "Post a job" as the permanent primary action; jobs-in-flight cards
   (status, who is on it, the one next step); the same Needs-you queue
   restricted to marketplace item types (bids in, fund award, confirm
   schedule, review and release); past jobs per address with one-tap
   re-hire. No rent pulse, no portfolio strip.
3. PRO: unchanged by the dual mode. PM-originated and standalone demand
   pool into ONE lead feed; supply never knows or cares where the job
   was born. That pooling is the point: integrated demand subsidizes
   standalone liquidity and vice versa.

The strategic hinge: a standalone poster's address plus job history is a
shadow property profile (the repair log accrues from job one). Upgrading
to the PM tool is therefore a data unlock ("you've hired 3 pros for 1247
W Oakdale; track rent and leases there too?"), not a migration. The
standalone marketplace is top-of-funnel for property management, and the
funnel is the same database row. For the standalone signup itself:
describe-the-job-first, create-the-account-last (classic marketplace
conversion order), which the wizard machinery already supports.

### Zones (single column, mobile-first)

1. PULSE BAR: "June rent: $7,400 of $9,200 in · 3 of 5 paid · next payout
   Fri." Patina progress fill, occupancy chip, open-maintenance count.
   Each segment links to its filtered list.
2. NEEDS YOU: prioritized action cards, each with one fact, the stake, the
   age, and ONE primary action:
   - "1F Oakdale · $1,850 · 5 days late" [Send reminder]
   - "No hot water · 2F · urgent · 2 photos" [Review]
   - "3 bids in · water heater · low $1,050" [Compare]
   - "Smith Plumbing marked complete" [Review and release $1,240]
   - "2F lease ends in 45 days" [Start renewal]
   - "3R vacant 21 days · about $1,200 lost" [Invite tenant]
   - Day-0 instances: "No property yet" [Add], "No bank connected" [Connect]
   Ordering by class: emergency > money waiting on you (releases, bids) >
   money owed to you (late rent) > expiring (leases, credentials) >
   optimization (vacancy) > setup. Within class: by dollars, then age.
   Show 5, expand for the rest. Items leave the queue by being resolved,
   not dismissed.
3. EMPTY STATE IS THE PRODUCT: most days render "All quiet. 8 units,
   nothing needs you." in patina with the last activity line. Peace of
   mind, visibly earned.
4. PORTFOLIO STRIP: compact property cards: occupancy dots (patina
   occupied, amber vacant), collected/scheduled mini-bar. Click through to
   the profile.
5. ACTIVITY: collapsed reverse-chron trust feed: "Tenant paid $1,850 ·
   1F", "Released $1,240 to Smith Plumbing". Proof it worked while they
   slept.

### Implementation shape

One AttentionItem contract: { icon, title, meta, stakeCents?, age,
severity, primaryAction }. Each item type is a scoped query over existing
models (no new tables); the dashboard is a server component composing
them. Every milestone adds item types to the same surface: setup items
now, invites in 1.3, charges in 1.4, maintenance in 1.5, escrow releases
in 1.6/Phase 2.

### Visual language

Iron text on parchment, white cards, patina means good or money-in,
copper means action needed, amber warns, red only for emergencies. Icons
from the forged set. Calm density: this is a peace-of-mind product, not a
trading terminal.
