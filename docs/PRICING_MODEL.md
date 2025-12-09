# PropertyMaster Pricing Model

**Version:** 1.0
**Last Updated:** December 2024

---

## Subscription Tiers

| Tier | Units | Monthly | Annual | ACH Fee | Card Markup |
|------|-------|---------|--------|---------|-------------|
| **Free** | 1-4 | $0 | $0 | $2.95 | 0.5% |
| **Starter** | 5-15 | $18 | $180 | $2.50 | 0.35% |
| **Pro** | 16-50 | $29 | $290 | $2.00 | 0.1% |
| **Business** | 51-150 | $49 | $490 | $2.00 | 0.1% |
| **Scale** | 151+ | $99 | $990 | $2.00 | 0.1% |

---

## Payment Processing Details

### ACH Payments (Bank Transfers)
- **Processor:** Dwolla
- **Our Cost:** ~$0.25 per transaction
- **Fee Charged:** $2.00 - $2.95 depending on tier
- **Margin:** $1.75 - $2.70 per transaction

### Card Payments (Credit/Debit)
- **Processor:** Stripe
- **Stripe Fee:** 2.9% + $0.30
- **Our Markup:** 0.1% - 0.5% depending on tier
- **Total to Tenant:** 3.0% - 3.4% + $0.30

### Fee Structure
- **Landlord configures** whether tenant pays processing fees
- **Tenant sees total amount** at checkout (rent + fees)
- **Legal compliance:** Fee is platform service charge, not landlord-to-tenant fee

---

## Revenue Model

### Primary Revenue Streams

1. **Subscription Revenue** - Monthly/annual SaaS fees
2. **Payment Processing Margin** - Spread between cost and fee charged
3. **Marketplace Take Rate** - 12% on maintenance vendor transactions

### Unit Economics (Per Tier)

#### Free Tier (1-4 units)
- Subscription: $0
- Average rent: $6,000/month (4 units x $1,500)
- If 100% pay via platform:
  - ACH revenue: $2.70 margin x 4 = $10.80/month
  - Card revenue: 0.5% x $6,000 = $30/month (if all cards)
- **Breakeven acquisition cost:** ~$100

#### Starter Tier (5-15 units)
- Subscription: $18/month
- Average rent: $15,000/month (10 units x $1,500)
- Payment margin: ~$20-40/month
- **Monthly revenue per customer:** $38-58

#### Pro Tier (16-50 units)
- Subscription: $29/month
- Average rent: $49,500/month (33 units x $1,500)
- Payment margin: ~$55-80/month
- **Monthly revenue per customer:** $84-109

#### Business Tier (51-150 units)
- Subscription: $49/month
- Average rent: $150,000/month (100 units x $1,500)
- Payment margin: ~$175-200/month
- **Monthly revenue per customer:** $224-249

#### Scale Tier (151+ units)
- Subscription: $99/month
- Average rent: $300,000/month (200 units x $1,500)
- Payment margin: ~$350-400/month
- **Monthly revenue per customer:** $449-499

---

## Competitive Positioning

### vs. AppFolio
- AppFolio: $1.40/ACH, $280/mo minimum, 2.99% eCheck
- **We're cheaper at all tiers**

### vs. Buildium
- Buildium: $1.25/ACH, starts at $58/mo for 20 units
- **We're cheaper, especially for small PMs**

### vs. RentRedi
- RentRedi: $12/mo flat, but charges 2.9% + $0.30 all cards
- **We have better card rates at paid tiers**

### vs. Baselane
- Baselane: Free, monetizes banking + payments
- **Similar model, we add marketplace differentiation**

### vs. Innago
- Innago: Free, monetizes payment fees only
- **We have subscription + marketplace for sustainability**

---

## Why Large PMs Won't Build In-House

For a PM with 151+ units considering in-house payments:

**Our Cost:**
- $99/mo subscription
- 0.1% card markup on $226,500 rent = $226.50/mo
- **Total: $325.50/month**

**In-House Cost:**
- PCI compliance audit: $1,250-4,166/month (amortized)
- Developer to build/maintain: $8,000+/month
- Integration work: 200+ hours initial
- Ongoing security, compliance, support
- **Total: $10,000+/month**

**Conclusion:** In-house makes zero economic sense below 500+ units with existing technical staff.

---

## Marketplace Revenue (Future)

- **Take Rate:** 12% on vendor transactions
- **Average Work Order:** $275
- **Revenue per WO:** $33
- **Target:** 5% of landlords use marketplace annually

### Example (100 Landlords)
- 5% active = 5 landlords using marketplace
- Average 3 work orders/year = 15 transactions
- Revenue: 15 x $33 = $495/year from marketplace
- **Scales with landlord count and trust**

---

## Implementation Notes

### Dwolla ACH Integration
- Use Dwolla for all ACH ($0.25/transaction)
- Maintain $2+ minimum fee for fallback margin
- If Dwolla fails, can switch to Stripe ACH ($5/transaction) and remain profitable

### Stripe Card Processing
- Stripe for all card payments (2.9% + $0.30)
- Add tier-based markup (0.1% - 0.5%)
- Total tenant sees: 3.0% - 3.4% + $0.30

### Fee Display
- Show fees transparently at checkout
- "Service fee: $2.95" for ACH
- "Processing fee: 3.15%" for cards
- Landlord cannot hide fees (compliance)

---

## Pricing Philosophy

1. **Free tier for acquisition** - Get small landlords in the door
2. **Payment margins for sustainability** - Cover costs at free tier
3. **Subscriptions for scale** - Predictable revenue at higher tiers
4. **Marketplace for profit** - The actual money is in vendor transactions
5. **Never compete on price alone** - Compete on product quality and marketplace value
