# The PropertyMaster Manifesto

## Disrupting the $500B Property Maintenance Industry

---

## Part 1: The Broken System

### Why Property Maintenance Is a Disaster

The property maintenance industry is one of the last major markets untouched by transparency. Every other market has been transformed:

| Market | Before | After |
|--------|--------|-------|
| Travel | Call a travel agent, unknown prices | Kayak: see all prices instantly |
| Used cars | Dealer has all the info, you have none | CarFax + KBB: information parity |
| Real estate | Agents controlled all listings | Zillow: all homes, all prices, all history |
| Restaurants | Word of mouth, hope for the best | Yelp/Google: see reviews before you go |
| **Property maintenance** | **Call 3 vendors, get 3 wildly different quotes, have no idea what's fair** | **???** |

**This market is stuck in 1995.** There is no Zillow for repair costs. There is no Yelp that actually works for contractors. There is no transparency.

### Who Gets Hurt?

**Landlords/Property Managers:**
- No idea if $400 toilet repair is fair or a ripoff
- Can't compare vendors meaningfully
- Waste hours getting quotes for simple jobs
- Get burned by bad vendors, no recourse
- Pay premium because they can't verify fair pricing

**Honest Vendors:**
- Compete on same playing field as scammers
- No way to prove they're fair-priced and reliable
- Spend 20%+ of time chasing payments
- Unpredictable income despite doing good work
- Undercut by hacks who do shoddy work cheaper

**Tenants:**
- Live with unfixed issues because landlord doesn't trust vendors
- Deal with multiple "repair attempts" by unqualified people
- No voice in vendor selection or quality

**The Economy:**
- Billions wasted on overpriced repairs
- Good tradespeople leave the industry (it doesn't reward quality)
- Trade shortage worsens (young people see a broken industry)
- Housing quality degrades (maintenance is too painful)

### The Root Causes

**1. Information Asymmetry**
The vendor knows exactly what a job should cost. The landlord has no idea. This gap is exploited constantly.

**2. No Reputation Portability**
A vendor's reputation doesn't follow them. Every new customer relationship starts from zero trust.

**3. Payment Friction**
Vendors wait 30-60 days to get paid. This creates distrust, forces vendors to charge more (to cover cash flow risk), and incentivizes volume over quality.

**4. No Quality Accountability**
If a vendor does bad work, there's no consequence. The landlord eats the cost, vendor moves on to next victim.

**5. Local Fragmentation**
There's no platform that has achieved the density required for network effects. Previous attempts (HomeAdvisor, Thumbtack) sell leads without solving trust or transparency.

---

## Part 2: The Vision

### What We're Actually Building

**We are not building property management software.**

We are building **the trust layer for the entire property maintenance economy.**

The software is the distribution mechanism - it's how we get landlords onto the platform. But the business is:

1. **Transparent pricing** - Everyone can see what things should cost
2. **Verified quality** - Vendor reputation that actually means something
3. **Guaranteed transactions** - Payment for vendors, quality for landlords
4. **Fair market dynamics** - Honest vendors win, dishonest ones fail

### The End State (5-10 Years)

Imagine this:

```
LANDLORD RECEIVES WORK ORDER:
"Toilet running constantly - Unit 4B"

PLATFORM SHOWS:
"This is typically a flapper valve replacement."
"Average cost in Chicago: $85-120"
"Your options:"

┌─────────────────────────────────────────────────────────────┐
│ ⭐ FAIR PRICE VENDORS (Verified Pricing)                    │
├─────────────────────────────────────────────────────────────┤
│ Martinez Plumbing          $95    ⭐ 4.9 (234 jobs)         │
│ Response: Usually same-day  │  On-time: 97%                 │
│ Guarantee: 90-day workmanship                               │
├─────────────────────────────────────────────────────────────┤
│ Quick Fix Plumbers         $110   ⭐ 4.7 (89 jobs)          │
│ Response: Next day          │  On-time: 94%                 │
│ Guarantee: 90-day workmanship                               │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ OTHER MARKETPLACE VENDORS                                   │
├─────────────────────────────────────────────────────────────┤
│ Joe's Plumbing             Quote   ⭐ 4.2 (12 jobs)         │
│ (Pricing not verified - may vary)                           │
│ Avg. quote: $180 (50% above market)                         │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ YOUR PERSONAL VENDORS                                       │
├─────────────────────────────────────────────────────────────┤
│ Uncle Tony (not on marketplace)                             │
│ You'll need to handle payment directly                      │
└─────────────────────────────────────────────────────────────┘
```

The landlord sees:
- What this job typically costs
- Which vendors have verified fair pricing
- Actual performance metrics (not just reviews)
- Where each vendor falls relative to market average
- One-click dispatch with full protection

The vendor sees:
- Guaranteed payment (funds secured before dispatch)
- Clear job scope
- Fair workload distribution based on quality
- 48-hour payout

**This is the Zillow moment for property maintenance.** Before Zillow, you had no idea if a house price was fair. After Zillow, everyone can see the Zestimate. It didn't eliminate real estate agents - it just made the market transparent.

We will do the same for repairs.

---

## Part 3: The Theory of Change

### How We Get From Here to There

This isn't a feature roadmap. This is a strategy for fundamentally changing how this market works.

### Phase 0: The Wedge (Now - 6 months)

**Goal:** Get transaction volume in one city, one niche.

**Why Lock/Rekey in Chicago:**
- Every turnover needs it (predictable demand)
- Extremely standardized pricing (easy to verify "fair")
- Low complexity (hard to screw up)
- Quick jobs (fast feedback loops)
- You're in Chicago (can do everything in person)

**What we build:**
- Marketplace dispatch for lock services only
- Guaranteed payment (Stripe Connect)
- Simple rating system
- Basic vendor profiles

**What we learn:**
- Can we get vendors to join?
- Can we get landlords to use it?
- Do they stay on-platform?
- What's the actual pricing distribution?

**Success metric:** 100 transactions through the platform.

### Phase 1: Data Foundation (6-12 months)

**Goal:** Build the pricing intelligence engine.

Every transaction becomes a data point:
- Service type
- Actual price charged
- Location (neighborhood level)
- Vendor
- Time to completion
- Quality rating
- Any disputes

**What we build:**
- Service catalog with taxonomy
- Price tracking per service per area
- "Market average" calculations
- Vendor price position (fair / above / below)
- Basic price insights for landlords

**What we unlock:**
- First-ever transparent view of repair costs
- Ability to identify which vendors are fair
- Data to attract more vendors ("we can prove you're competitively priced")

**Success metric:** Enough data to publish "average price" for top 20 services in Chicago.

### Phase 2: Trust Layer (12-18 months)

**Goal:** Create real accountability for quality.

**The Workmanship Guarantee:**
- All marketplace jobs include 90-day guarantee
- If repair fails due to vendor error, vendor fixes free
- If dispute is unclear, platform covers from reserve
- Vendors agree to this as condition of marketplace

**The Verified Quality Program:**
- On-time percentage (tracked automatically)
- Completion rate
- Return visit rate (how often they have to come back)
- Dispute rate
- Price consistency

**What we build:**
- Claim submission and resolution flow
- Vendor quality scoring algorithm
- "Verified Quality" badge for top vendors
- Insurance reserve fund management

**What we unlock:**
- Real reason to stay on-platform (the guarantee)
- Quality vendors differentiate from hacks
- Data on what actually predicts good outcomes

**Success metric:** <2% dispute rate, measurable improvement in repeat vendor selection.

### Phase 3: Market Expansion (18-24 months)

**Goal:** Prove the model works across services and cities.

**Expand services in Chicago:**
- Appliance repair (standardized, high frequency)
- Drain cleaning (standardized, emergency-driven)
- HVAC maintenance (seasonal, predictable)
- Electrical (higher value, more complexity)
- General handyman (catch-all)

**Expand geography:**
- Pick 2-3 similar Midwest cities (Milwaukee, Indianapolis, Detroit)
- Same playbook: niche entry → expand
- Test market-specific dynamics

**What we build:**
- Multi-market pricing engine
- Regional vendor quality standards
- Scalable vendor onboarding
- Market expansion playbook

**Success metric:** 3 cities, 5+ service categories, 1,000 transactions/month.

### Phase 4: The Transparency Revolution (24-36 months)

**Goal:** Publish pricing data to the world.

**The Fair Price Index:**
- Public database of what repairs cost
- Searchable by service, location, complexity
- Updated monthly with real transaction data
- Free to everyone

**Why give this away?**
1. **Goodwill** - We become the trusted authority on fair pricing
2. **SEO** - "How much does X cost in Chicago?" leads to us
3. **Vendor pressure** - Bad vendors can't hide anymore
4. **PR** - "Company publishes first-ever transparent repair pricing database"
5. **Moat** - Competitors can't replicate our data

**The Verified Pricing Program:**
- Vendors who commit to published pricing get priority
- Landlords can filter for "Fair Price Verified" vendors
- Creates market pressure toward transparency

**What we build:**
- Public pricing API
- Consumer-facing price lookup tool
- Vendor pricing commitment system
- "Fair Price Verified" vendor tier

**Success metric:** 10,000+ monthly visitors to pricing tool, 50%+ of transactions with verified pricing vendors.

### Phase 5: Full Platform (36+ months)

**Goal:** Become essential infrastructure.

**For Landlords:**
- All maintenance through one platform
- Predictable costs
- Guaranteed quality
- Complete maintenance history
- Preventive maintenance recommendations

**For Vendors:**
- Guaranteed payment
- Steady work flow
- Business insights
- Financial services (early pay, loans, tax docs)
- Training and certification paths

**For the Market:**
- The definitive source of repair pricing data
- Quality standards for trade work
- Trust infrastructure for the entire industry

---

## Part 4: The Flywheel

### Network Effects Strategy

```
                    ┌───────────────────┐
                    │                   │
                    │   MORE LANDLORDS  │
                    │   (Free software) │
                    │                   │
                    └─────────┬─────────┘
                              │
                              │ More work orders
                              ▼
     ┌────────────────────────────────────────────────┐
     │                                                │
     │              MORE TRANSACTIONS                 │
     │                                                │
     └──────┬─────────────────────────────────┬───────┘
            │                                 │
            │                                 │
            ▼                                 ▼
┌───────────────────┐               ┌───────────────────┐
│                   │               │                   │
│   MORE VENDORS    │               │  BETTER PRICING   │
│ (Guaranteed work) │               │     DATA          │
│                   │               │                   │
└─────────┬─────────┘               └─────────┬─────────┘
          │                                   │
          │                                   │
          └───────────────┬───────────────────┘
                          │
                          │ More choice + transparency
                          ▼
                    ┌───────────────────┐
                    │                   │
                    │  BETTER SERVICE   │
                    │  (Faster, cheaper,│
                    │   more reliable)  │
                    │                   │
                    └─────────┬─────────┘
                              │
                              │ Word of mouth + retention
                              ▼
                    ┌───────────────────┐
                    │                   │
                    │   MORE LANDLORDS  │
                    │                   │
                    └───────────────────┘
```

### Key Flywheel Triggers

**Trigger 1: Free Software**
- Removes price objection entirely
- Every user is a potential marketplace participant
- Competitors charging $2/unit/month can't match

**Trigger 2: Guaranteed Payment**
- Vendors join because payment is certain
- Faster payout = vendors prioritize your jobs
- Creates vendor loyalty

**Trigger 3: Pricing Transparency**
- Landlords stay because they can verify fair pricing
- Creates pressure on overpriced vendors
- Attracts more landlords seeking transparency

**Trigger 4: Quality Guarantee**
- Landlords stay for protection
- Good vendors want the badge
- Bad vendors self-select out

**Trigger 5: Reputation Lock-in**
- Vendor ratings don't transfer to competitors
- 4.9-star vendor with 500 jobs won't leave
- Creates durable competitive advantage

---

## Part 5: The Moat

### Why This Will Be Defensible

**Moat 1: Data Advantage**
Every transaction makes our pricing intelligence better. A competitor starting today would need years to match our data.

**Moat 2: Vendor Reputation**
A vendor's 500 five-star reviews and "Verified Quality" badge are trapped on our platform. They won't start over somewhere else.

**Moat 3: Network Density**
Once we have 50 plumbers in Chicago with <1 hour response time, a competitor needs to match that entire network. That takes years.

**Moat 4: Trust Layer**
The guarantee infrastructure (claims, reserves, resolution) is hard to build and requires scale to fund.

**Moat 5: Brand = Fair Pricing**
If we become synonymous with "fair, transparent repair pricing," that brand position is extremely durable.

**Moat 6: Integration Depth**
Our free PM software means landlords' entire operation runs through us. Switching cost is enormous.

---

## Part 6: The Ethical Framework

### Principles for Benefiting All Parties

**1. Win-Win-Win Required**
Every feature must benefit landlords, vendors, AND tenants. If someone loses, we don't ship it.

**2. Transparency as Default**
When in doubt, make information visible. Opacity benefits bad actors.

**3. Meritocracy Over Pay-to-Play**
Vendor placement based on quality, not advertising spend. We don't sell leads - we match good vendors to jobs.

**4. Fair Value Exchange**
Our fee must be worth more than it costs. Guaranteed payment + quality guarantee + steady work = worth 10-15%.

**5. Vendor Dignity**
Tradespeople are professionals, not gig workers. Fast payment, fair treatment, sustainable income.

**6. Data Stewardship**
We collect sensitive data. We use it to create market transparency, not to exploit users.

### How We Know We're Succeeding

**Landlord Metrics:**
- Average repair cost decreasing (market becoming fairer)
- Time to dispatch decreasing
- Dispute rate decreasing
- Satisfaction increasing

**Vendor Metrics:**
- Days-to-payment decreasing
- Income stability increasing
- Bad actors exiting the market
- Trade worker retention improving

**Market Metrics:**
- Price variance decreasing (market standardizing)
- Quality variance decreasing
- Information asymmetry decreasing

---

## Part 7: What Could Kill This

### Existential Risks and Mitigations

**Risk 1: Disintermediation**
Landlords and vendors go direct after first job.

*Mitigation:* The guarantee layer. Going off-platform means losing:
- 90-day workmanship guarantee
- Damage protection
- Dispute resolution
- Payment guarantee (for vendors)

**Risk 2: Vendor Resistance**
Vendors refuse transparent pricing.

*Mitigation:* Don't force it. Start with lead gen (charge what you want), build pricing intelligence passively, gradually make transparency attractive (priority dispatch for fair-priced vendors).

**Risk 3: Big Tech Entry**
Amazon, Google, or Thumbtack builds this.

*Mitigation:* Local density and trust are hard to replicate quickly. By the time they try, we have 3+ years of data and vendor relationships. Also: we focus on B2B (landlords), they focus on B2C (homeowners).

**Risk 4: Quality Guarantee Losses**
Claims exceed reserves.

*Mitigation:* Conservative reserve ratios, careful vendor vetting, start with low-risk services (locksmith), build claims data before expanding to high-risk services.

**Risk 5: Chicken-and-Egg Failure**
Can't get landlords without vendors, can't get vendors without landlords.

*Mitigation:*
- Landlords: Free software brings them in regardless
- Vendors: Guaranteed payment is compelling even with few jobs
- Start in single niche (locksmith) where we only need 5-10 vendors

---

## Part 8: Platform Retention - Why They Stay

### The Core Problem

Every marketplace faces disintermediation. Once a landlord finds a good vendor, why keep paying platform fees?

**The naive answer:** "They'll lose the guarantee!"

**The real answer:** That's not enough. Once you trust someone, you'll risk losing the guarantee to save 10%.

We need **multiple layers of value** that make staying on-platform the obvious choice for BOTH sides.

---

### Landlord Retention Mechanisms

#### 1. Competitive Bidding System

For non-urgent jobs with high confidence estimates (90%+), landlords can open jobs for competitive bids:

```
┌─────────────────────────────────────────────────────────────┐
│  DISPATCH OPTIONS                                           │
│                                                             │
│  [⚡ INSTANT DISPATCH - $120]                               │
│  Send to next available verified vendor                     │
│  Response within 4 hours                                    │
│                                                             │
│  [📊 OPEN FOR BIDS - Starting $120]                        │
│  Let vendors compete for the job                            │
│  Set bidding window: [4hr] [8hr] [24hr] [48hr]             │
│  You can accept any bid at any time                         │
└─────────────────────────────────────────────────────────────┘
```

**How bidding works:**
- Starting price = high end of platform estimate
- Vendors bid DOWN from starting price
- Each bid has a validity period (vendor chooses: 2hr, 4hr, 6hr)
- Landlord can accept any bid at any time
- Vendor commits to bid price if scope matches description

**Why this retains landlords:**
- They can ALWAYS get competitive pricing
- They see the real market clearing price
- More value than calling vendors themselves
- Creates incentive to post ALL jobs (even with trusted vendors)

**Scope change rules:**
- Scope matches description → Vendor honors bid
- Minor variance → Vendor can request up to estimate high
- Major change → Vendor documents with photos, submits new quote
- Repeated scope disputes → Landlord's "description accuracy" drops, future bids higher

#### 2. Pricing Intelligence (Only On-Platform)

```
┌─────────────────────────────────────────────────────────────┐
│  PRICING INTELLIGENCE                                       │
│                                                             │
│  Your vendor quoted: $280                                   │
│                                                             │
│  Market data (847 similar jobs):                           │
│  ├── Low: $95                                              │
│  ├── Average: $145                                         │
│  ├── High: $210                                            │
│  └── Your quote: ████████████████░░ 93rd percentile        │
│                                                             │
│  ⚠️ This quote is 47% above market average                 │
│                                                             │
│  [See Fair Price Vendors]  [Request Bids]  [Accept Anyway] │
└─────────────────────────────────────────────────────────────┘
```

Off-platform transactions don't get this. Landlords lose the ability to verify if prices are fair.

#### 3. Property Health Score

```
┌─────────────────────────────────────────────────────────────┐
│  PROPERTY HEALTH SCORE                                      │
│                                                             │
│  123 Main St, Unit 4B                    SCORE: 94/100     │
│                                                             │
│  ✓ Plumbing: Last serviced 3mo ago                         │
│  ✓ HVAC: Filter changed 1mo ago                            │
│  ✓ Electrical: Inspection 6mo ago                          │
│  ✓ Locks: Rekeyed at last turnover                         │
│  ⚠️ Water heater: 8 years old (avg lifespan: 10yr)         │
│                                                             │
│  This score is verified by platform transaction history.   │
│                                                             │
│  USEFUL FOR:                                                │
│  • Insurance claims (documented maintenance)                │
│  • Property sales (verified history for buyers)             │
│  • Refinancing (proves asset condition)                     │
│  • Rental license compliance (Chicago requires records)     │
└─────────────────────────────────────────────────────────────┘
```

Off-platform jobs don't count. The score becomes valuable for insurance, sales, refinancing, and compliance.

#### 4. Maintenance Budget Tracking

```
┌─────────────────────────────────────────────────────────────┐
│  2024 MAINTENANCE SUMMARY                                   │
│                                                             │
│  Total spend: $14,847                                       │
│  vs. last year: -12% ($16,892)                             │
│  vs. similar properties: -8% below average                  │
│                                                             │
│  BY CATEGORY:                                               │
│  ├── Plumbing: $4,200 (28%)                                │
│  ├── HVAC: $3,800 (26%)                                    │
│  ├── Electrical: $2,100 (14%)                              │
│  ├── Appliances: $2,847 (19%)                              │
│  └── Other: $1,900 (13%)                                   │
│                                                             │
│  📊 TAX REPORT: [Download for Schedule E]                  │
│                                                             │
│  🔮 PREDICTED 2025: $13,200-16,400                         │
│     Based on property age and maintenance patterns          │
└─────────────────────────────────────────────────────────────┘
```

Complete spend tracking, tax-ready reports, and predictions only work for platform transactions.

#### 5. Emergency Priority

Platform subscribers get priority dispatch during high-demand periods:

```
EMERGENCY DISPATCH QUEUE:

🔴 PIPE BURST - 2:47 AM Sunday

Non-subscriber: "Next available vendor: 4-6 hours"
Subscriber: "Priority dispatch: 45-90 minutes"
```

When you really need someone, platform membership matters.

#### 6. Preventive Maintenance Alerts

```
┌─────────────────────────────────────────────────────────────┐
│  🔔 PREVENTIVE MAINTENANCE ALERT                           │
│                                                             │
│  Based on your property data:                               │
│                                                             │
│  ⚠️ HVAC filter due for replacement                        │
│     Last changed: 87 days ago                               │
│     Recommended: Every 90 days                              │
│     [Schedule Now - $45]                                    │
│                                                             │
│  ⚠️ Water heater approaching end of life                   │
│     Age: 9 years | Avg lifespan: 10-12 years               │
│     Recommendation: Budget $1,200-1,800 for replacement    │
│     [Get Quotes Now]                                        │
│                                                             │
│  Properties using preventive maintenance save an average    │
│  of 23% on emergency repairs.                               │
└─────────────────────────────────────────────────────────────┘
```

Predictive insights only work with complete platform history.

#### 7. Volume Benefits

| Annual Platform Jobs | Platform Fee |
|---------------------|--------------|
| 1-10 jobs           | 12%          |
| 11-25 jobs          | 10%          |
| 26-50 jobs          | 8%           |
| 50+ jobs            | 6%           |

Creates incentive to keep ALL jobs on platform to maintain tier.

---

### Vendor Retention Mechanisms

#### 1. Guaranteed Payment + Fast Payout

This is the killer feature. Most vendors spend 20%+ of time on collections.

| Off-Platform | On-Platform |
|--------------|-------------|
| Invoice and hope | Payment secured before dispatch |
| Wait 30-60 days | Paid in 48 hours |
| Chase with calls | Money just appears |
| Sometimes never paid | 100% collection rate |

**The math:** A vendor doing $15K/month who spends 8 hours/month on invoicing and collections values their time at ~$50/hour = $400/month. Our 10% fee on $15K = $1,500. But they also avoid:
- Bad debt (2-5% of revenue typically)
- Cash flow stress
- Accounting complexity

For many vendors, guaranteed fast payment is worth MORE than our fee.

#### 2. Instant Pay Option

```
┌─────────────────────────────────────────────────────────────┐
│  JOB COMPLETED: Toilet Repair - $185                       │
│                                                             │
│  Your payout: $166.50 (after 10% platform fee)             │
│                                                             │
│  PAYOUT OPTIONS:                                            │
│  ○ Standard (48 hours): $166.50                            │
│  ○ Next-day ($1 fee): $165.50                              │
│  ○ Instant (1.5% fee): $164.00                             │
│                                                             │
│  [Complete Payout]                                          │
└─────────────────────────────────────────────────────────────┘
```

Vendors who need cash flow will pay for instant access. Only available on-platform.

#### 3. Fair Price Certification

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│        ✓ PROPERTYMASTER CERTIFIED                          │
│                                                             │
│        Martinez Plumbing                                    │
│        ────────────────────                                 │
│        ⭐ 4.9 (234 verified jobs)                           │
│        💰 Fair Price Verified                               │
│        ⏱️ 98% on-time                                       │
│        🔄 2% callback rate                                  │
│                                                             │
│  "This vendor's pricing and quality are verified           │
│   through 234 documented platform transactions."           │
│                                                             │
│        [Download Badge]  [Embed on Website]                │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Certification requires:**
- 80%+ of jobs through platform (maintains data integrity)
- Pricing within 15% of market average
- 4.5+ star rating
- <5% dispute rate

**Certification provides:**
- Marketing badge (truck, website, cards)
- Priority in search results
- Featured in "Fair Price Vendors" section
- Platform promotes certified vendors

**If vendor takes jobs off-platform:** Certification suspended. They lose competitive advantage.

#### 4. Revenue-Based Financing

```
┌─────────────────────────────────────────────────────────────┐
│  💰 PROPERTYMASTER CAPITAL                                 │
│                                                             │
│  Based on your platform history, you're pre-approved for:  │
│                                                             │
│  EQUIPMENT LOAN                                             │
│  Up to: $15,000                                            │
│  APR: 9.9%                                                  │
│  Term: 12-36 months                                        │
│  Repayment: Auto-deducted from platform earnings           │
│                                                             │
│  CASH ADVANCE                                               │
│  Up to: $5,000                                             │
│  Fee: 5% flat                                               │
│  Repayment: 10% of each payout until repaid               │
│                                                             │
│  No credit check. Based on your platform performance.      │
│                                                             │
│  [Apply Now]                                                │
└─────────────────────────────────────────────────────────────┘
```

Once a vendor has financing tied to platform earnings, they're locked in.

#### 5. Business Intelligence Dashboard

```
┌─────────────────────────────────────────────────────────────┐
│  YOUR BUSINESS INSIGHTS - November 2024                    │
│                                                             │
│  Revenue: $12,400                                          │
│  Jobs completed: 47                                         │
│  Avg job value: $264                                        │
│                                                             │
│  VS. MARKET:                                                │
│  ├── Your avg toilet repair: $165                          │
│  │   Market average: $155                                  │
│  │   You're 6% above average (still competitive)           │
│  │                                                          │
│  ├── Your avg water heater: $1,240                         │
│  │   Market average: $1,380                                │
│  │   You're 10% below average (room to increase)          │
│                                                             │
│  OPPORTUNITY:                                               │
│  🔥 Drain cleaning demand up 34% this month                │
│  💡 Consider adding drain services to your profile         │
│                                                             │
│  EFFICIENCY:                                                │
│  Your response time: 2.1 hours (Top 15%)                   │
│  Your completion rate: 98% (Top 10%)                       │
│  Your rating: 4.9 (Top 5%)                                 │
└─────────────────────────────────────────────────────────────┘
```

This intelligence only exists on-platform. Vendors become dependent on it.

#### 6. Tax & Business Documentation

```
┌─────────────────────────────────────────────────────────────┐
│  📋 TAX CENTER                                             │
│                                                             │
│  2024 EARNINGS: $148,720                                   │
│                                                             │
│  DOCUMENTS READY:                                           │
│  ├── [Download 1099-NEC]                                   │
│  ├── [Download Income Summary]                             │
│  ├── [Download Expense Report]                             │
│  └── [Download Mileage Log]                                │
│                                                             │
│  ESTIMATED QUARTERLY TAX: $8,400                           │
│  Next payment due: January 15                               │
│                                                             │
│  [Set Up Auto Tax Withholding]                             │
└─────────────────────────────────────────────────────────────┘
```

Platform handles all documentation. Going off-platform means back to manual tracking.

#### 7. Group Benefits (Future)

```
┌─────────────────────────────────────────────────────────────┐
│  🏥 PROPERTYMASTER VENDOR BENEFITS                         │
│                                                             │
│  Available to vendors with 20+ jobs/month:                 │
│                                                             │
│  HEALTH INSURANCE                                           │
│  Access to group rates through our partner network         │
│  Average savings: $200-400/month vs. individual plans      │
│                                                             │
│  SUPPLY DISCOUNTS                                           │
│  10% off at participating suppliers                         │
│  Home Depot Pro, Ferguson, Grainger                        │
│                                                             │
│  VEHICLE PROGRAM                                            │
│  Discounted rates on work vehicles and insurance           │
│                                                             │
│  [View All Benefits]                                        │
└─────────────────────────────────────────────────────────────┘
```

This is the dream for independent tradespeople. Only platform-active vendors qualify.

---

### Financial Products (The Real Lock-In)

#### For Landlords: Repair Financing

```
┌─────────────────────────────────────────────────────────────┐
│  HVAC REPLACEMENT - $4,200                                 │
│                                                             │
│  PAYMENT OPTIONS:                                           │
│                                                             │
│  ○ Pay now: $4,200                                         │
│                                                             │
│  ○ Pay over 6 months: $720/mo                              │
│    (4.9% fee = $206 total interest)                        │
│                                                             │
│  ○ Pay over 12 months: $378/mo                             │
│    (8.9% fee = $374 total interest)                        │
│                                                             │
│  Vendor gets paid in full immediately.                     │
│  You pay us back over time.                                │
│                                                             │
│  [Select Payment Plan]                                      │
└─────────────────────────────────────────────────────────────┘
```

Landlords who finance through the platform won't go off-platform for that job or future jobs - the financing relationship keeps them engaged.

#### For Vendors: Working Capital

When vendors need to buy equipment, hire help, or bridge cash flow gaps, platform-based financing (auto-repaid from earnings) is far easier than traditional bank loans.

---

### The Subscription Model (Alternative)

Instead of per-transaction fees, offer a subscription that makes per-job fees minimal:

```
┌─────────────────────────────────────────────────────────────┐
│  PROPERTYMASTER PRO - $49/month                            │
│                                                             │
│  INCLUDES:                                                  │
│  ✓ Unlimited dispatch to verified vendors                  │
│  ✓ All transactions protected (72-hour escrow)             │
│  ✓ Priority dispute resolution                             │
│  ✓ Real-time pricing intelligence                          │
│  ✓ Property health scores                                  │
│  ✓ Compliance documentation                                │
│  ✓ Priority emergency dispatch                             │
│  ✓ Tax-ready maintenance reports                           │
│  ✓ Preventive maintenance alerts                           │
│                                                             │
│  Platform fee on jobs: 3% (just covers payment processing) │
│                                                             │
│  NON-SUBSCRIBERS:                                           │
│  Platform fee: 12% per job                                 │
│  No guarantee, no priority, limited features               │
│                                                             │
│  Break-even: ~4 jobs/month at average $150                 │
└─────────────────────────────────────────────────────────────┘
```

**Why subscription works for retention:**
- Landlord is paying $49/month regardless
- Taking jobs off-platform doesn't save them money
- The 3% is basically just Stripe fees
- All the value is baked into the subscription

---

### Retention Summary

| Mechanism | Keeps Landlords | Keeps Vendors |
|-----------|----------------|---------------|
| Competitive bidding | ✓ Always get best price | |
| Pricing intelligence | ✓ Know if quotes are fair | |
| Property health score | ✓ Insurance/sale value | |
| Budget tracking | ✓ Tax docs, predictions | |
| Emergency priority | ✓ When it matters most | |
| Volume discounts | ✓ Incentive to stay | |
| Guaranteed payment | | ✓ No more collections |
| Fast/instant payout | | ✓ Cash flow |
| Certification | | ✓ Marketing value |
| Revenue financing | | ✓ Capital access |
| Business intelligence | | ✓ Run business better |
| Tax documentation | | ✓ Simplify admin |
| Group benefits | | ✓ Health insurance, discounts |
| Repair financing | ✓ Spread large costs | ✓ Get paid immediately |
| Subscription model | ✓ Already paying, no savings going off | ✓ Steady job flow |

**The goal:** Make the platform so valuable that leaving feels like a downgrade, not a savings.

---

## Part 9: Payment & Transaction Model (FINAL)

> **Note:** This section represents the finalized payment model and supersedes any conflicting information in earlier sections. Earlier mentions of "90-day workmanship guarantee" are deprecated - we are a marketplace, not an insurance company.

### Core Philosophy

We facilitate transactions and guarantee payment. We do NOT guarantee workmanship quality after payment is released. Quality accountability comes through ratings, reviews, and market consequences - not platform insurance.

**Why this approach:**
- Keeps the model simple and scalable
- Avoids complex holdback/strike/reserve systems
- Reduces platform liability
- Matches how every other marketplace works (Uber doesn't guarantee your driver is a good conversationalist)

---

### Pricing Model: Dynamic All-In Pricing

**What the landlord sees:** One price. No breakdown. No line items.

```
┌─────────────────────────────────────────────────────────────┐
│  TOILET REPAIR                                              │
│                                                             │
│  When do you need this done?                               │
│  ○ Within 24 hours                                         │
│  ○ Within 3 days                                           │
│  ● Next week (5+ days)                                     │
│                                                             │
│  Estimated cost: $107.50                                   │
│                                                             │
│  [Confirm & Pay]                                            │
└─────────────────────────────────────────────────────────────┘
```

Change the timeline → price changes. No explanation needed.

Like Uber: you see a price. Wait an hour, different price. No "surge fee" line item.

---

### Fee Structure (Internal)

**What we charge (not shown to landlord):**

| Component | Rate | On $100 job |
|-----------|------|-------------|
| Platform fee (landlord) | 7.5% | $7.50 |
| Platform fee (vendor) | 2.5% | $2.50 |
| **Platform revenue** | **10%** | **$10.00** |

**Payment processing (baked into price):**

| Job Type | Payment Method | Processing Cost | Platform Keeps |
|----------|---------------|-----------------|----------------|
| Scheduled (5+ days) | ACH | ~$0.50 | ~9.5% |
| Urgent (<5 days) | Card | ~3% | ~7% |

Urgent jobs cost slightly more (baked into the quote). Landlord doesn't see why.

**Why this works:**
- Landlord sees one simple price
- No confusing fee breakdowns
- Vendor only pays 2.5% - minimal incentive to go off-platform
- Platform margin protected regardless of payment method

---

### Quoting & Bidding Model

#### Remote-First Quoting

Most jobs can be quoted from photos and description alone. No free on-site visits.

```
QUOTE FLOW:

1. Landlord submits job request
   ├── Description: "Toilet won't stop running"
   ├── Photos: [upload]
   └── Urgency: Within 3 days

2. Job broadcast to qualified vendors

3. Vendors quote REMOTELY (from photos/description)
   ├── Vendor A: $160
   ├── Vendor B: $175
   └── Vendor C: $200

4. Landlord sees quotes with markup (all-in pricing)
   ├── Vendor A: $176
   ├── Vendor B: $193
   └── Vendor C: $220

5. Landlord picks one, PAYS UPFRONT

6. THEN vendor is dispatched
```

**For complex jobs requiring on-site assessment:**

```
1. Landlord: "HVAC not working, not sure what's wrong"
2. Vendors can't quote accurately without seeing it
3. Landlord pays ESTIMATED RANGE upfront: $200-500
4. Vendor dispatched, assesses, provides actual quote
5. If within range → job proceeds
6. If over range → landlord approves additional or cancels (partial refund)
```

---

#### What Landlords See in Quotes

**SHOW:**
| Element | Why |
|---------|-----|
| ★★★★☆ Rating + review count | Trust signal |
| Scope of work | What exactly they'll do |
| "Licensed & Insured" badges | Credibility |
| Response time, jobs completed | Track record |
| Profile photo / logo | Professionalism |
| All-in price | Simple, no breakdown |

**HIDE (until payment secured):**
| Element | Why |
|---------|-----|
| Full business name | Prevents off-platform contact |
| Phone number | Prevents off-platform contact |
| Email | Prevents off-platform contact |
| Business address | Prevents off-platform contact |
| Vendor's actual bid | Opacity protects margin |

```
QUOTE CARD EXAMPLE:
┌─────────────────────────────────────────────────────────────┐
│  ★★★★☆ (4.7) · 142 jobs · Licensed & Insured               │
│                                                             │
│  $176                                                       │
│                                                             │
│  Scope: Replace flapper valve and fill valve.              │
│  Parts included. 90-day warranty on work.                  │
│                                                             │
│  [View Reviews]  [Select & Pay]                             │
└─────────────────────────────────────────────────────────────┘
```

Vendor identity revealed ONLY after payment is secured.

---

#### Pricing: Simple 10% Markup

No complex spread capture. No fake "savings" calculations. Just a clean markup.

```
HOW IT WORKS:

Vendor bids: $160
Platform markup: 10%
Landlord sees: $176

Vendor gets: $160 - 2.5% fee = $156
Platform keeps: $176 - $156 = $20 (12.5% effective margin)
```

**Complete opacity between both sides (like Uber):**

| Party | Sees | Doesn't See |
|-------|------|-------------|
| Landlord | $176 all-in price | Vendor's $160 bid |
| Vendor | Their $160 bid, $156 payout | Landlord's $176 payment |

No awkward conversations. No fee line items. No comparing notes.

**Future: Savings messaging (once we have data)**

After 100+ similar jobs, we CAN honestly say:
- "Based on 500 toilet repairs in Chicago, average cost is $195"
- "This quote is 10% below average"

Until then: No fake savings claims. Just show prices.

---

#### Payment Before Dispatch (Anti-Leakage)

**The Problem:** If vendor meets landlord before payment is locked, they can pitch cash deals.

```
WITHOUT PRE-PAYMENT:

Vendor arrives for "free quote"
Vendor: "It'll be $176 through the app... or $140 cash right now"
Landlord: "Deal"

Platform gets: $0
```

**The Solution:** Landlord always pays estimated amount BEFORE vendor is dispatched.

```
WITH PRE-PAYMENT:

1. Landlord picks quote: $176
2. Landlord PAYS $176 (money secured)
3. Vendor dispatched
4. Vendor arrives, money already locked
5. No point pitching cash deal - landlord already paid

Platform gets: $20
```

**Why landlords won't go off-platform:**

```
"Vendor just offered $140 cash instead..."

But wait:
├── I already paid $176
├── Have to cancel the job
├── Wait 3-5 days for refund
├── Pay vendor cash separately
├── No payment protection
├── No reviews/accountability
└── Save $36?

"...not worth the hassle."
```

**Anti-leakage summary:**

| Friction Point | Effect |
|----------------|--------|
| Money already paid | Psychological commitment |
| Refund takes days | Hassle to cancel |
| Lose platform protections | Risk |
| Vendor identity hidden until paid | Can't contact directly |

**Key rule:** Vendor NEVER meets landlord with $0 committed.

---

### Payment Processing Strategy

**Two tracks based on timeline:**

```
SCHEDULED JOB (5+ days out):
┌─────────────────────────────────────────────────────────────┐
│  Day 0: Job requested, ACH initiated                       │
│  Day 3-5: ACH clears → money in platform account           │
│  Day 5+: Vendor dispatched (money already secured)         │
│  Job complete → 72hr window → Vendor paid                  │
└─────────────────────────────────────────────────────────────┘
Cost: ~$0.50 via Dwolla/Stripe ACH

URGENT JOB (<5 days):
┌─────────────────────────────────────────────────────────────┐
│  Day 0: Job requested, card authorized (hold)              │
│  Day 0: Vendor dispatched immediately                      │
│  Job complete → 72hr window → Card captured → Vendor paid  │
└─────────────────────────────────────────────────────────────┘
Cost: ~3% via Stripe

**Key rule:** Vendor is NEVER dispatched until payment is secured.
- Scheduled: ACH must clear first
- Urgent: Card must be successfully authorized
```

**Provider options:**
- ACH: Dwolla ($0.25/tx), Stripe ACH (0.8% max $5), Plaid + bank
- Cards: Stripe (2.9% + $0.30)

**Why not cards for everything?**
- 3% of every transaction = 30% of our gross revenue to Stripe
- ACH at $0.50 flat = ~0.5% on a $100 job
- Scheduled jobs (most maintenance) can wait for ACH to clear

---

### Payment Flow

```
STEP 1: JOB CREATED
┌─────────────────────────────────────────────────────────────┐
│  Landlord approves job dispatch                             │
│  → Payment method authorized (funds held, not charged)      │
│  → Vendor sees: "Payment Secured ✓"                         │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
STEP 2: VENDOR DISPATCHED
┌─────────────────────────────────────────────────────────────┐
│  Vendor accepts job                                         │
│  → Vendor travels to property                               │
│  → Completes work                                           │
│  → Marks job complete in app (with photos if required)      │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
STEP 3: 72-HOUR CONFIRMATION WINDOW
┌─────────────────────────────────────────────────────────────┐
│  Landlord receives notification: "Job marked complete"      │
│                                                             │
│  OPTIONS:                                                   │
│  [✓ Confirm Complete] - Payment releases immediately        │
│  [✗ Dispute] - Opens completion dispute (see below)         │
│  [No action] - Auto-releases after 72 hours                 │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
STEP 4: PAYMENT RELEASED
┌─────────────────────────────────────────────────────────────┐
│  Payment captured from landlord                             │
│  Platform fees deducted                                     │
│  Vendor payout scheduled:                                   │
│  ├── Standard: 48 hours (free)                             │
│  ├── Next-day: 24 hours ($1 fee)                           │
│  └── Instant: Now (1.5% fee)                               │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
STEP 5: DONE
┌─────────────────────────────────────────────────────────────┐
│  Transaction complete                                       │
│  Landlord prompted to leave rating                          │
│  Vendor paid                                                │
│  Platform takes cut                                         │
│  Everyone happy                                             │
└─────────────────────────────────────────────────────────────┘
```

---

### Dispute Handling

#### What We Handle: Completion Disputes (Within 72 Hours)

These are disputes about whether the job was actually done:

| Dispute Type | Example | Resolution |
|--------------|---------|------------|
| No-show | "Vendor never arrived" | Full refund to landlord |
| Wrong work | "I ordered rekey, they replaced the lock" | Partial refund or redo |
| Incomplete | "They only did 2 of 3 locks" | Partial payment based on completion |
| Scope mismatch | "They said it would be $100, charged $300" | Review scope, adjust if needed |

**Process:**
1. Landlord files dispute within 72 hours
2. Platform reviews evidence (photos, messages, vendor response)
3. Decision made within 48 hours
4. Payment adjusted accordingly

**Dispute Fee:** We may charge a dispute fee ($15-25) to discourage frivolous disputes. Fee waived if dispute is valid.

#### What We DON'T Handle: Quality Issues After Payment

Once the 72-hour window closes and payment releases:

| Issue | Example | Our Response |
|-------|---------|--------------|
| Repair failed | "The toilet is leaking again after 2 weeks" | Contact vendor directly |
| Poor workmanship | "The lock is hard to turn" | Leave a bad review, contact vendor |
| Damage discovered later | "They scratched my door" | Contact vendor's insurance |

**Why we don't handle post-payment quality:**
- We didn't do the work
- We can't verify claims weeks later
- It creates complex liability and holdback systems
- Normal commerce works this way (you don't dispute your plumber bill with Yelp)

**What landlords CAN do:**
- Leave a 1-star review (affects vendor's future jobs)
- Contact vendor directly (we provide their info)
- Report repeated issues (we may investigate patterns)
- Not hire that vendor again

**What happens to bad vendors:**
- Bad reviews tank their rating
- Low-rated vendors get fewer jobs
- Pattern of complaints = investigation
- Severe/repeated issues = removal from platform

---

### Implementation: Stripe Connect

**Technical Flow:**

```javascript
// 1. When job is created - Authorize payment
const paymentIntent = await stripe.paymentIntents.create({
  amount: totalAmount, // job + landlord fee
  currency: 'usd',
  customer: landlord.stripeCustomerId,
  capture_method: 'manual', // Don't charge yet, just hold
  transfer_data: {
    destination: vendor.stripeAccountId,
  },
  application_fee_amount: platformFee, // 7.5% landlord + 2.5% vendor
  metadata: {
    job_id: job.id,
    work_order_id: workOrder.id,
  }
});

// 2. After 72 hours OR landlord confirms - Capture payment
await stripe.paymentIntents.capture(paymentIntent.id);

// 3. If disputed within 72 hours - Cancel authorization
await stripe.paymentIntents.cancel(paymentIntent.id);
```

**Vendor Onboarding:**
- Vendors create Stripe Connect Express account
- We collect: Bank account, tax ID, basic business info
- Stripe handles identity verification
- Vendors can be paid out same-day if they want

---

### Auto-Release Logic

```
IF (job.status === 'completed' AND
    currentTime > job.completedAt + 72 hours AND
    job.disputeStatus === null)
THEN
    capturePayment(job.paymentIntentId)
    scheduleVendorPayout(job.vendorId, job.vendorAmount)
    job.status = 'paid'
```

**Why 72 hours (not 24, not 7 days):**
- 24 hours: Too short - landlord might not check the work immediately
- 7 days: Too long - vendors need faster cash flow
- 72 hours: Enough time to verify, fast enough to be attractive to vendors

---

### Edge Cases

#### Scope Changes During Job

```
SCENARIO: Vendor arrives, finds additional work needed

Example: "Came to rekey 3 locks, found one lock is broken and needs replacement"

PROCESS:
1. Vendor documents with photos
2. Vendor submits scope change request with new quote
3. Landlord receives notification:
   ┌─────────────────────────────────────────────────────────────┐
   │  SCOPE CHANGE REQUEST                                       │
   │                                                             │
   │  Original: Rekey 3 locks - $60                             │
   │  Vendor found: Lock #2 is broken, needs replacement         │
   │                                                             │
   │  New quote: Rekey 2 locks + Replace 1 lock - $155          │
   │                                                             │
   │  [Approve New Scope] [Decline - Complete Original Only]    │
   └─────────────────────────────────────────────────────────────┘
4. If approved: New authorization for difference
5. If declined: Vendor completes original scope only
```

#### Vendor No-Shows

```
SCENARIO: Vendor accepts job but doesn't show up

PROCESS:
1. Landlord marks "Vendor didn't arrive"
2. System checks:
   - Did vendor check in? (GPS/app confirmation)
   - Did vendor communicate delay?
3. If no-show confirmed:
   - Payment authorization cancelled
   - Vendor receives strike
   - Job automatically re-dispatched to next vendor
   - 3 no-shows = vendor suspended
```

#### Landlord Goes Silent

```
SCENARIO: Vendor completes job, landlord never confirms or disputes

PROCESS:
1. Job completed → 72 hours pass
2. No landlord action
3. Payment auto-releases
4. Vendor gets paid
5. Landlord can still leave review

Note: The auto-release protects vendors from unresponsive landlords
```

---

### What We Explicitly Do NOT Do

| Feature | Why Not |
|---------|---------|
| 90-day workmanship guarantee | We're a marketplace, not an insurance company |
| Holdbacks on vendor payments | Creates adversarial dynamics, scales poorly on large jobs |
| Quality claim fund | Liability we can't control |
| Strike system for quality | Ratings and reviews handle this naturally |
| Post-payment dispute arbitration | Not our job - that's between landlord and vendor |
| Refunds for "quality issues" weeks later | We didn't do the work |

**The simple rule:** Once payment releases, the transaction is complete. Quality issues are between landlord and vendor.

---

### Summary: The Transaction Model

| Step | What Happens | Who's Protected |
|------|--------------|-----------------|
| Job created | Payment authorized (held) | Vendor knows funds exist |
| Vendor dispatched | Vendor accepts, travels | Landlord has committed |
| Work completed | Vendor marks done | Work is documented |
| 72-hour window | Landlord can confirm or dispute | Landlord can verify |
| Payment releases | Auto after 72h or on confirm | Vendor gets paid |
| Post-payment | Normal business relationship | Both can leave reviews |

**For vendors:** You WILL get paid. Fast. No chasing invoices.

**For landlords:** You have 72 hours to verify work was done. After that, rate honestly. Bad vendors get filtered out by the market.

**For us:** Simple, scalable, no insurance liability.

---

## Part 9.5: Future Financial Products (Phase 2+)

> **Status:** Not for MVP. Requires working capital and scale.

### Payment Plans for Large Repairs

When we have sufficient cash flow, offer landlords the ability to split large repair costs:

```
┌─────────────────────────────────────────────────────────────┐
│  HVAC REPLACEMENT - $3,000                                 │
│                                                             │
│  PAYMENT OPTIONS:                                           │
│                                                             │
│  ○ Pay now: $3,000                                         │
│                                                             │
│  ○ Split in 3: $1,035 x 3 months                           │
│    ($105 convenience fee = 3.5%)                           │
│                                                             │
│  ○ Split in 6: $530 x 6 months                             │
│    ($180 convenience fee = 6%)                             │
│                                                             │
│  Vendor paid in full within 72 hours regardless.           │
└─────────────────────────────────────────────────────────────┘
```

**Key decisions:**
- **Flat fee, not APR** - Simpler, feels fairer, avoids predatory lending optics
- **In-house, not Affirm** - We control rates, keep them reasonable (3-6% not 15%+)
- **B2B focused** - Landlords are businesses, lower regulatory burden
- **Requires capital** - We front the vendor payment, collect from landlord over time

**When to implement:**
- After we have consistent transaction volume
- When we have ~$50K+ in reserve to float payments
- When we've proven core model works

### Vendor Working Capital (Phase 3+)

Cash advances for vendors based on platform earnings history:

```
┌─────────────────────────────────────────────────────────────┐
│  CAPITAL ADVANCE                                           │
│                                                             │
│  Based on your last 90 days: $12,400 earned               │
│                                                             │
│  You qualify for:                                          │
│  Up to $2,500 advance                                      │
│  5% flat fee ($125)                                        │
│  Repayment: 10% of each payout until repaid               │
│                                                             │
│  No credit check. Based on platform performance.           │
└─────────────────────────────────────────────────────────────┘
```

**Why this creates lock-in:**
- Vendor with outstanding advance won't leave platform
- Repayment is automatic (deducted from earnings)
- Lower default risk (we control their income stream)

**When to implement:**
- After 100+ active vendors
- When we have capital to lend
- When we've proven vendor retention

---

## Part 10: The Chicago Lock Service MVP

### Why Start Here

**Lock/Rekey Services in Chicago:**

| Factor | Why It's Perfect |
|--------|------------------|
| Demand predictability | Every tenant turnover = rekey (required by law in IL) |
| Pricing standardization | Industry standard: $15-25/lock rekey |
| Low complexity | Hard to mess up, low damage potential |
| Quick jobs | 30 min - 2 hours, fast feedback loop |
| Low dollar amount | Low risk while we learn |
| Your location | You can meet vendors, visit properties, handle issues |

### Standard Pricing We Can Guarantee

```
CHICAGO LOCK SERVICES - FAIR PRICE GUIDE

Rekeying:
  Per lock (standard residential)      $20
  Per lock (high-security)             $35
  Full apartment rekey (avg 3 locks)   $60

Replacement:
  Deadbolt (standard, includes lock)   $95
  Deadbolt (high-security)             $150
  Doorknob/lever                       $85
  Electronic keypad lock               $200 + lock cost

Lockouts:
  Business hours (8am-6pm M-F)         $75
  After hours                          $110
  Emergency (midnight-6am)             $150

Master Key Systems:
  Per lock (retrofit existing)         $25
  Setup fee                            $50
```

These prices include:
- Trip charge
- Standard hardware (where applicable)
- 72-hour completion guarantee (see Part 9 for payment model)

### Launch Plan

**Month 1: Vendor Recruitment**
- Goal: 5-10 locksmiths committed
- Approach: In-person meetings, explain the guaranteed payment model
- Pitch: "Get paid in 48 hours, not 30 days. We handle the billing."

**Month 2: Landlord Pilot**
- Goal: 10 landlords using the system
- Approach: Start with your network, offer first 3 jobs free (we pay vendor)
- Focus: Test the entire flow, find friction points

**Month 3: Iterate**
- Analyze every transaction
- Interview every participant
- Fix what's broken
- Expand if working

**Success Metrics:**
- 50 transactions in first 90 days
- <5% dispute rate
- >80% of landlords repeat order
- >80% of vendors accept next job

---

## Part 9: Technical Foundation

### What We Need to Build

**Phase 0 (MVP) - Lock Services Only:**

```
DATABASE MODELS:

MarketplaceVendor
├── vendor_id (FK to Vendor)
├── services_offered: ["rekey", "lockout", "replacement"]
├── service_areas: ["60601", "60602", ...]  // zip codes
├── pricing: {rekey: 20, lockout: 75, ...}
├── response_time_guarantee: "same_day" | "next_day"
├── accepts_card: boolean
├── verified: boolean
├── stripe_account_id: string
└── status: "active" | "paused" | "pending"

ServiceCatalog
├── service_id
├── category: "lock_services"
├── service_type: "rekey" | "lockout" | "replacement"
├── display_name: "Rekey Lock"
├── description
├── typical_duration: 45  // minutes
├── base_price_range: {min: 15, max: 25}
└── requires_quote: boolean

MarketplaceJob
├── job_id
├── work_order_id (FK)
├── service_type: "rekey"
├── status: "pending" | "assigned" | "accepted" | "in_progress" | "completed" | "disputed"
├── vendor_id (nullable)
├── quoted_price
├── final_price
├── payment_intent_id (Stripe)
├── payment_status: "authorized" | "captured" | "refunded"
├── platform_fee
├── vendor_payout
├── dispatched_at
├── accepted_at
├── completed_at
└── rated_at

VendorRating
├── rating_id
├── job_id (FK)
├── vendor_id (FK)
├── landlord_id (FK)
├── rating: 1-5
├── on_time: boolean
├── would_hire_again: boolean
├── comment
└── created_at
```

**Payment Flow (Stripe Connect):**

```
1. DISPATCH INITIATED
   └── Landlord authorizes payment (PaymentIntent with capture_method: manual)
   └── Funds held, not captured

2. VENDOR ACCEPTS
   └── Job confirmed, vendor sees "Payment Secured ✓"

3. JOB COMPLETED
   └── Landlord confirms completion
   └── Payment captured
   └── Platform fee deducted
   └── Vendor payout scheduled (next day)

4. DISPUTE (if any)
   └── Payment held in escrow
   └── Resolution within 5 days
   └── Either: refund landlord, pay vendor, or split
```

**API Endpoints:**

```
# Vendor Management
POST   /api/marketplace/vendors                    # Vendor signup
GET    /api/marketplace/vendors/:id               # Vendor profile
PATCH  /api/marketplace/vendors/:id               # Update profile/pricing
GET    /api/marketplace/vendors/available         # Find vendors for job

# Service Catalog
GET    /api/marketplace/services                  # List all services
GET    /api/marketplace/services/:type/pricing    # Get pricing info

# Jobs
POST   /api/marketplace/jobs                      # Create from work order
GET    /api/marketplace/jobs/:id                  # Job details
POST   /api/marketplace/jobs/:id/assign           # Assign to vendor
POST   /api/marketplace/jobs/:id/accept           # Vendor accepts
POST   /api/marketplace/jobs/:id/decline          # Vendor declines
POST   /api/marketplace/jobs/:id/complete         # Mark complete
POST   /api/marketplace/jobs/:id/dispute          # Raise dispute

# Payments
POST   /api/marketplace/jobs/:id/authorize        # Hold funds
POST   /api/marketplace/jobs/:id/capture          # Capture after completion
POST   /api/marketplace/jobs/:id/refund           # Refund if needed

# Ratings
POST   /api/marketplace/jobs/:id/rate             # Landlord rates vendor
GET    /api/marketplace/vendors/:id/ratings       # Vendor rating history
```

---

## Part 10: Go-To-Market

### Chicago Lock Services Launch

**Week 1-2: Vendor Outreach**
- Research: Find 30 locksmiths in Chicago metro
- Qualify: Licensed, insured, good reviews elsewhere
- Reach out: Email + phone, offer to meet in person
- Pitch: "Guaranteed payment in 48 hours. We send you jobs. You just show up and work."

**Week 3-4: Landlord Pilot**
- Your network: Anyone you know with rentals
- Property manager associations: Chicago NARPM chapter
- Local landlord groups: BiggerPockets Chicago meetups
- Pitch: "Free property management software + one-click dispatch to vetted locksmiths with guaranteed pricing."

**Month 2: Closed Beta**
- 10-20 landlords
- 5-10 locksmiths
- ~50 transactions
- Intensive feedback collection
- Fix everything that breaks

**Month 3: Open Beta**
- Remove invite-only restriction
- Light marketing: Reddit (r/ChicagoLandlords), local FB groups
- Goal: 100 transactions/month
- Prove the model works

**Month 4+: Expansion**
- If working: Add appliance repair
- If not working: Figure out why, iterate

### Vendor Conversation Script

"Hi, I'm [name] from PropertyMaster. We're building a platform that sends guaranteed work orders to locksmiths. Here's why I think you'd be interested:

1. **Guaranteed payment** - The landlord's card is charged before you're even dispatched. You never chase an invoice again.

2. **Paid in 48 hours** - Not net-30, not when they feel like it. 48 hours after job completion, money is in your account.

3. **No bidding wars** - We don't make you compete on price against 10 other locksmiths. Fair pricing, steady work.

4. **Quality matters** - Good ratings = more jobs. We're building a system where being good at your job actually helps you.

We're starting small in Chicago with locksmith services. We take 10% of each job. In exchange, you get guaranteed payment, fast payout, and steady work.

Interested in trying it out?"

---

## Part 11: Long-Term Vision

### Year 1: Prove the Model
- Chicago lock services working
- 500+ transactions/month
- <2% dispute rate
- Clear unit economics
- Playbook documented

### Year 2: Scale Services
- 5+ service categories in Chicago
- 3+ cities (Milwaukee, Indianapolis, Detroit)
- 2,000+ transactions/month
- Pricing intelligence live
- Fair Price Index beta

### Year 3: Market Leadership
- 10+ cities
- 10,000+ transactions/month
- Public pricing database
- Vendor financial services pilot
- Series A / profitability

### Year 5: Industry Standard
- 50+ cities
- 100,000+ transactions/month
- The go-to source for repair pricing data
- Full vendor financial services
- Training/certification partnerships
- The "Zillow for repairs"

### Year 10: Essential Infrastructure
- National coverage
- 1M+ transactions/month
- Every landlord knows: "Check PropertyMaster for fair pricing"
- Every quality vendor wants our badge
- We've fundamentally changed how this market works
- Trade worker shortage meaningfully addressed through training pipeline
- Housing quality measurably improved

---

## Part 12: Why This Matters

### The World We're Building

Today, property maintenance is a market defined by:
- Information asymmetry (vendors know, landlords don't)
- Misaligned incentives (overcharging is rewarded)
- Trust deficits (everyone assumes the worst)
- Quality variance (no accountability)

We're building a world where:
- **Pricing is transparent** - Everyone can see what things should cost
- **Quality is verifiable** - Performance data is tracked and visible
- **Payment is guaranteed** - Neither side worries about getting screwed
- **Good actors win** - Honesty and reliability are competitive advantages

This isn't just a business opportunity. It's a chance to fix a broken market that affects millions of people - landlords, tenants, and tradespeople alike.

**For landlords:** No more getting ripped off. Predictable costs. Quality you can trust.

**For honest vendors:** Finally, a system that rewards doing good work at fair prices. Steady income. No more chasing payments.

**For tenants:** Faster repairs. Better quality. Landlords who actually maintain their properties because it's not painful anymore.

**For the trades:** A more attractive industry that draws and retains quality workers.

This is the vision. Let's build it.

---

*Document version: 3.1*
*Last updated: December 2025*
*Status: Strategic Foundation - Ready for Development*

---

## Changelog

**v3.1** - Dynamic Pricing & Payment Processing Strategy
- Dynamic all-in pricing: Landlord sees ONE price, no breakdown
- Price changes based on inputs (timeline, etc.) like Uber - no explanation needed
- Two-track payment processing:
  - Scheduled jobs (5+ days): ACH (~$0.50) - wait for clear, then dispatch
  - Urgent jobs (<5 days): Card (~3%) - immediate dispatch
- Vendor NEVER dispatched until payment secured
- Payment processing cost baked into quote, not shown separately
- Added provider options: Dwolla, Stripe ACH, Plaid

**v3.0** - Added Part 9: Payment & Transaction Model (FINAL)
- Finalized fee structure: 7.5% landlord service fee + 2.5% vendor platform fee
- 72-hour confirmation window for completion verification
- Clear separation: We handle completion disputes, NOT quality issues after payment
- "We're a marketplace, not an insurance company" - removed all 90-day workmanship guarantee references
- Detailed Stripe Connect implementation guide
- Edge case handling: scope changes, no-shows, silent landlords
- Explicit list of what we do NOT do (holdbacks, quality claims, post-payment arbitration)
- Added Part 9.5: Future Financial Products roadmap (payment plans, vendor capital)
- Updated subscription model to remove deprecated guarantee language

**v2.0** - Added Part 8: Platform Retention
- Comprehensive landlord retention mechanisms (bidding, pricing intelligence, property health scores, budget tracking, emergency priority, preventive maintenance, volume discounts)
- Comprehensive vendor retention mechanisms (guaranteed payment, instant pay, certification, revenue financing, business intelligence, tax documentation, group benefits)
- Financial products strategy (repair financing for landlords, working capital for vendors)
- Subscription model alternative
- Complete retention summary matrix
