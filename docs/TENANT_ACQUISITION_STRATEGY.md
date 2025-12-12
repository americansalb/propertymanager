# Tenant Acquisition Marketplace Strategy

**Last Updated:** December 12, 2025
**Owner:** Product + Engineering
**Status:** Strategic Priority

---

## Executive Summary

PropertyMaster's current strategy focuses on financial management, rent collection, and vendor marketplace. This document outlines the **missing critical capability**: helping landlords **FIND tenants**, not just manage them.

**Key Insight:** We're solving problems #2-4 but not #1:

1. **Finding quality tenants** - #1 pain point (NOT ADDRESSED)
2. Collecting rent on time - ✅ Addressed
3. Handling maintenance - ✅ Vendor marketplace
4. Financial tracking - ✅ Full GL

**Strategic Gap:** No competitor serves the mid-market (100-2,000 units) with both professional-grade PMS AND tenant acquisition at a reasonable price.

---

## Competitive Landscape

### Current Market Segmentation

| Segment | Players | Tenant Finding? | PMS Quality | Price |
|---------|---------|-----------------|-------------|-------|
| **Small DIY (1-50 units)** | TurboTenant, Avail | ✅ | Basic | Free-$99/yr |
| **Mid-Market (100-2,000)** | ??? GAP ??? | ❌ | ??? | ??? |
| **Enterprise (2,000+)** | AppFolio, Yardi | ✅ | Full | $$$$ |
| **Full-Service** | Belong, Nomad | ✅ | N/A | 8-10% of rent |

### TurboTenant Analysis (Primary Tenant-Finding Competitor)

**What They Do Well:**
- Free core PMS
- Listing syndication to 25+ sites (Zillow, Apartments.com, etc.)
- 850,000 landlords, $7.8M revenue (2024)
- Tenant-paid screening model

**Their Limitations (Our Opportunity):**
- **<100 units only** - Can't serve professional PMs
- **No real accounting** - Just "expense tracking"
- **No vendor marketplace** - Basic maintenance requests
- **No API** - Closed ecosystem
- **Poor support** - 1.6 stars on PissedConsumer
- **Slow payments** - 3+ days even on paid tier

### Our Position

> **"TurboTenant for serious landlords"** - Tenant acquisition + professional PMS + vendor marketplace for the 100-2,000 unit mid-market.

---

## Tenant Acquisition Stack

### Phase 1: Listing Management & Syndication

#### Listing Module

Create listings from vacant units with:
- Title, description, price, availability date
- Photo gallery (drag-drop upload, S3 storage)
- Amenities and features checklist
- Pet policy, parking, utilities included
- Virtual tour links
- Syndication toggles (per-platform opt-in)

#### Syndication Partners (FREE via Feed Partnerships)

| Platform | Reach | Integration | Cost |
|----------|-------|-------------|------|
| **Zillow/Trulia/HotPads** | #1 rental search | XML Feed + Real-Time API | FREE (partner) |
| **Apartments.com Network** | ForRent, ApartmentFinder | API Integration | FREE (partner) |
| **Zumper/PadMapper** | Millennial-focused | API | FREE |
| **Realtor.com** | MLS integration | Feed | FREE |
| **Facebook Marketplace** | Social reach | API | FREE |
| **Craigslist** | Still relevant | Automated posting | FREE |

**Technical Approach:**
1. Apply to [Zillow Rentals Feed Integration](https://www.zillowgroup.com/developers/api/rentals/rentals-feed-integrations/) - FREE, 4-6 week approval
2. Build XML feed conforming to Zillow Rental Listings Feed Guide
3. Implement Real-Time API for instant updates
4. Replicate for Apartments.com, Zumper, etc.

**One-Time Engineering Cost:** ~$15,000-30,000 (6-8 weeks)
**Ongoing Cost:** $0 (feed partnerships are free)

---

### Phase 2: Lead Management Pipeline

#### Centralized Lead Inbox

All inquiries from all platforms flow into one inbox:
- Source tracking (which platform)
- Lead scoring (response time, engagement)
- Auto-response templates
- Assignment to team members
- Activity timeline

#### Self-Service Showing Scheduler

Reduce phone tag with tenant self-booking:
- Calendar availability sync
- Automatic confirmation/reminders
- Rescheduling flow
- No-show tracking
- Virtual tour option

#### Applicant Pipeline

```
Lead → Inquiry → Showing → Application → Screening → Approved → Lease
  ↓        ↓         ↓           ↓            ↓           ↓         ↓
[Status tracking with notes and timeline at each stage]
```

---

### Phase 3: Best-in-Class Tenant Screening

#### Screening Stack (Differentiator)

| Component | Provider | Why | Cost |
|-----------|----------|-----|------|
| **Credit + ResidentScore** | TransUnion SmartMove | 15% better eviction prediction than FICO | ~$25-35 |
| **Criminal Records** | TransUnion | 500M+ records (federal + state + county) | Included |
| **Eviction History** | TransUnion | 27M records - largest FCRA-compliant DB | Included |
| **Income Verification** | Plaid | Instant, fraud-proof (bank/payroll verified) | ~$3-5 |
| **Employment Verification** | Plaid Payroll | 85% US workforce coverage | Included |

**Total Cost:** ~$30-40 per screening
**Charge Tenant:** $45-55
**Our Margin:** $10-20 per applicant

#### Why This Wins

| Feature | TurboTenant | Buildium | PropertyMaster |
|---------|-------------|----------|----------------|
| Credit Report | ✅ | ✅ | ✅ |
| ResidentScore | ✅ | ❌ | ✅ |
| Criminal | ✅ | ✅ | ✅ |
| Eviction | ✅ | ✅ | ✅ |
| **Income Verification** | ❌ Manual | ❌ Manual | ✅ **Plaid instant** |
| **Employment Verification** | ❌ | ❌ | ✅ **Plaid Payroll** |
| **Fraud Detection** | ❌ | ❌ | ✅ **Bank-verified** |

**Our Differentiator:** *"The only screening that verifies income instantly from your bank—not fake pay stubs."*

#### Integration Partners

1. **TransUnion SmartMove** - [Partner Program](https://www.mysmartmove.com/partner-with-us)
   - Credit, Criminal, Eviction, ResidentScore
   - Partner API available
   - Tenant-paid model supported

2. **Plaid Income** - [API Documentation](https://plaid.com/products/income/)
   - Payroll Income: Instant from ADP, Workday, etc.
   - Bank Income: Net income from bank deposits
   - 11-second verification vs 24-hour manual process

3. **Future: Direct Bureau Access**
   - At 5,000+ screenings/year, apply for direct TransUnion/Experian access
   - Reduce per-screening cost by 40-50%
   - Requires FCRA compliance infrastructure

---

### Phase 4: Digital Lease Execution

#### E-Signature Integration

| Provider | Cost | API Quality | Notes |
|----------|------|-------------|-------|
| **HelloSign** | $15-25/mo | Excellent | Dropbox-owned, simple |
| **BoldSign** | $10/mo | Good | Developer-friendly, budget |
| **DocuSign** | $25+/mo | Industry standard | Expensive at scale |

**Recommendation:** Start with HelloSign or BoldSign for cost-effectiveness.

#### Lease Workflow

```
Applicant Approved
        ↓
Generate Lease from Template (state-specific)
        ↓
Send for E-Signature (HelloSign API)
        ↓
Track Signing Status
        ↓
Store Executed Lease (S3)
        ↓
Create Tenant Record + Lease in System
        ↓
Trigger Move-In Workflow
```

---

## Implementation Roadmap

### Phase A: Applicant Tracking + E-Signatures (Weeks 1-6)

| Week | Deliverable |
|------|-------------|
| 1-2 | Application form (online, mobile-friendly) |
| 2-3 | Applicant status workflow + pipeline UI |
| 3-4 | E-signature integration (HelloSign/BoldSign) |
| 4-5 | Lease template management |
| 5-6 | Testing + polish |

**Outcome:** Complete apply-to-lease digital workflow

### Phase B: Tenant Screening (Weeks 7-10)

| Week | Deliverable |
|------|-------------|
| 7 | TransUnion SmartMove API integration |
| 8 | Plaid Income/Employment verification |
| 9 | Screening UI (request, view reports, decide) |
| 10 | Tenant-paid payment flow (Stripe) |

**Outcome:** Best-in-class screening with income verification

### Phase C: Listing & Syndication (Weeks 11-18)

| Week | Deliverable |
|------|-------------|
| 11-12 | Listing CRUD (create from vacant unit) |
| 12-13 | Photo upload + management |
| 13-14 | Apply for Zillow Feed Partnership |
| 14-15 | Build Zillow XML feed integration |
| 15-16 | Apartments.com API integration |
| 16-17 | Lead inbox + auto-response |
| 17-18 | Showing scheduler |

**Outcome:** One-click syndication to 25+ platforms

### Phase D: Advanced Features (Weeks 19-24)

| Week | Deliverable |
|------|-------------|
| 19-20 | Pricing intelligence ("Your listing is 12% above market") |
| 21-22 | Lead scoring + analytics |
| 23-24 | SMS notifications (Twilio) |

**Outcome:** Complete tenant acquisition platform

---

## Business Model

### Revenue Streams

| Source | Model | Est. Revenue |
|--------|-------|--------------|
| **Screening Fees** | $10-20 margin per screening | $50K-200K/yr at scale |
| **Listing Boost** | Premium placement fee | $5-20 per listing |
| **Application Fees** | Pass-through + margin | Variable |
| **Lead Generation** | Referral fees from partners | Future |

### Unit Economics

**Per Vacancy Filled:**
- Screening revenue: $15 margin
- Application fee: $25-50 (tenant pays)
- Time saved: 10+ hours (value to PM)
- Vacancy reduced: 14 days → $1,000+ saved rent loss

---

## Success Metrics

### Phase 1-2 (MVP)

| Metric | Target | Industry Avg |
|--------|--------|--------------|
| Time to publish listing | <5 minutes | 30+ minutes |
| Screening turnaround | <1 hour | 24-48 hours |
| Income verification time | 11 seconds | 24 hours (manual) |

### Phase 3-4 (Scale)

| Metric | Target | Industry Avg |
|--------|--------|--------------|
| Average vacancy duration | <14 days | 30+ days |
| Lead-to-lease conversion | >15% | 5-10% |
| Tenant quality (eviction rate) | <2% | 5-7% |

---

## Competitive Positioning

### vs. TurboTenant

> "Outgrown TurboTenant? PropertyMaster gives you the same tenant-finding tools plus professional-grade financials, a verified vendor marketplace, and an open API—built for serious property managers."

### vs. Buildium/AppFolio

> "Same features. Better price. Plus instant income verification they don't have."

### Marketing Messages

1. **"Find tenants. Verify income. Sign leases. All in one place."**

2. **"The only screening that verifies income instantly—not fake pay stubs."**

3. **"Stop paying 8-10% to find tenants. Do it yourself for $10/unit."**

---

## Technical Architecture

### Database Models (New)

```prisma
model Listing {
  id              String   @id @default(cuid())
  unitId          String
  unit            Unit     @relation(fields: [unitId], references: [id])
  title           String
  description     String
  price           Decimal
  availableDate   DateTime
  status          ListingStatus // DRAFT, ACTIVE, LEASED, EXPIRED
  photos          ListingPhoto[]
  amenities       String[] // Array of amenity codes
  petPolicy       String?
  syndications    Syndication[]
  leads           Lead[]
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}

model Lead {
  id              String   @id @default(cuid())
  listingId       String
  listing         Listing  @relation(fields: [listingId], references: [id])
  source          String   // ZILLOW, APARTMENTS_COM, DIRECT, etc.
  name            String
  email           String
  phone           String?
  message         String?
  status          LeadStatus // NEW, CONTACTED, SHOWING_SCHEDULED, APPLIED, CLOSED
  applicantId     String?
  applicant       Applicant? @relation(fields: [applicantId], references: [id])
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}

model Applicant {
  id              String   @id @default(cuid())
  listingId       String
  leadId          String?
  firstName       String
  lastName        String
  email           String
  phone           String
  status          ApplicantStatus // PENDING, SCREENING, APPROVED, DENIED, LEASE_SENT, SIGNED
  screeningReport ScreeningReport?
  incomeVerification IncomeVerification?
  leaseId         String?
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}

model ScreeningReport {
  id              String   @id @default(cuid())
  applicantId     String   @unique
  applicant       Applicant @relation(fields: [applicantId], references: [id])
  provider        String   // TRANSUNION, EXPERIAN
  creditScore     Int?
  residentScore   Int?
  criminalStatus  String?  // CLEAR, RECORDS_FOUND
  evictionStatus  String?  // CLEAR, RECORDS_FOUND
  reportUrl       String?
  rawData         Json?
  createdAt       DateTime @default(now())
}

model IncomeVerification {
  id              String   @id @default(cuid())
  applicantId     String   @unique
  applicant       Applicant @relation(fields: [applicantId], references: [id])
  provider        String   // PLAID
  verifiedIncome  Decimal?
  employerName    String?
  employmentStatus String?
  verificationMethod String // PAYROLL, BANK, DOCUMENT
  rawData         Json?
  createdAt       DateTime @default(now())
}
```

### API Integrations Required

| Integration | Purpose | Priority |
|-------------|---------|----------|
| TransUnion SmartMove | Credit/Criminal/Eviction | P0 |
| Plaid Income | Income verification | P0 |
| HelloSign/BoldSign | E-signatures | P0 |
| Zillow Feed | Listing syndication | P1 |
| Apartments.com | Listing syndication | P1 |
| Twilio | SMS notifications | P2 |

---

## Appendix: Syndication Partner Requirements

### Zillow Feed Partnership

**Process:**
1. Email: rentalfeedinquiries@zillowgroup.com
2. Submit integration request
3. 4-6 week testing with production data
4. Go live

**Requirements:**
- USPS-verified addresses
- Valid rental price
- At least 1 high-quality photo
- Bed/bath information
- No phone/email in descriptions

**Cost:** FREE for approved feed partners

### Apartments.com Integration

**Process:**
1. Visit: apartments.com/grow/integrations
2. Apply for vendor integration
3. Technical implementation
4. Testing and approval

**Cost:** FREE for <5 units, API partnership for larger

---

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2025-12-12 | Product | Initial strategy document |

---

**Next Steps:**
1. Add tenant acquisition phases to ROADMAP.md
2. Update COMPETITIVE_STRATEGY.md with TurboTenant positioning
3. Begin Phase A implementation (Applicant Tracking + E-Signatures)
