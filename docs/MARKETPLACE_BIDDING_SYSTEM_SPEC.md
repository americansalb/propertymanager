# Marketplace Competitive Bidding System - Technical Specification

## Executive Summary

Transform the current single-vendor dispatch model into a competitive bidding system where multiple contractors bid on jobs, owners compare bids anonymously, and contact information is only revealed after award. This creates anti-decoupling through information asymmetry while driving better prices through competition.

---

## Table of Contents

1. [Design Principles](#1-design-principles)
2. [Database Schema Changes](#2-database-schema-changes)
3. [New Job Lifecycle](#3-new-job-lifecycle)
4. [API Endpoints](#4-api-endpoints)
5. [Information Hiding Strategy](#5-information-hiding-strategy)
6. [Bid Accountability System](#6-bid-accountability-system)
7. [Notification System](#7-notification-system)
8. [Matching Algorithm](#8-matching-algorithm)
9. [Fee Structure](#9-fee-structure)
10. [Frontend Changes](#10-frontend-changes)
11. [Migration Strategy](#11-migration-strategy)

---

## 1. Design Principles

### 1.1 Anti-Decoupling Through Information Asymmetry

**The Uber Model**: Users cannot see driver phone numbers. The platform IS the connection layer.

**Our Implementation**:
- Contractor identity hidden until job awarded
- Owner sees: Rating, tier, jobs completed, bid amount
- Owner does NOT see: Name, company, phone, email
- Contact info revealed ONLY after:
  1. Owner selects winning bid
  2. Payment is escrowed
  3. Contractor confirms acceptance

### 1.2 Transparency for Fair Pricing

**For Owners**:
- See market rate ranges from ServiceCatalog before posting
- Compare multiple bids side-by-side
- Understand labor vs materials breakdown

**For Contractors**:
- See job details before bidding
- Know the market rate range (what owners expect)
- Compete on quality AND price (rating matters)

### 1.3 Accountability Through Binding Bids

- Labor hours/rate are BINDING
- Materials have 20% buffer for variance
- Overages require change order approval
- Completion cost vs bid tracked for contractor reputation

---

## 2. Database Schema Changes

### 2.1 New Enums

```prisma
enum BidStatus {
  DRAFT           // Contractor started but not submitted
  SUBMITTED       // Bid submitted, awaiting owner decision
  AWARDED         // Owner selected this bid
  ACCEPTED        // Contractor confirmed after award
  REJECTED        // Owner chose different bid
  WITHDRAWN       // Contractor withdrew bid
  EXPIRED         // Bidding round ended without award
}

enum BiddingRoundStatus {
  OPEN            // Accepting bids
  CLOSED          // No more bids, awaiting owner decision
  AWARDED         // Winner selected
  CANCELLED       // Job cancelled during bidding
  EXPIRED         // No bids received or owner didn't select
}

enum ChangeOrderStatus {
  PENDING         // Awaiting owner approval
  APPROVED        // Owner approved additional cost
  REJECTED        // Owner rejected, contractor must proceed at bid price
}
```

### 2.2 New Models

```prisma
// Competitive bid submitted by a vendor for a marketplace job
model Bid {
  id                  String    @id @default(cuid())

  // Relationships
  marketplaceJobId    String
  marketplaceJob      MarketplaceJob @relation(fields: [marketplaceJobId], references: [id], onDelete: Cascade)

  vendorProfileId     String
  vendorProfile       VendorMarketplaceProfile @relation(fields: [vendorProfileId], references: [id])

  biddingRoundId      String
  biddingRound        BiddingRound @relation(fields: [biddingRoundId], references: [id])

  // Labor (BINDING)
  laborHours          Decimal   @db.Decimal(5, 2)
  laborRate           Decimal   @db.Decimal(10, 2)   // Per hour
  laborTotal          Decimal   @db.Decimal(10, 2)   // laborHours * laborRate

  // Materials (ESTIMATED with buffer)
  materialsEstimate   Decimal   @db.Decimal(10, 2)
  materialsBuffer     Decimal   @default(0.20) @db.Decimal(3, 2)  // 20% variance allowed
  materialsMax        Decimal   @db.Decimal(10, 2)   // materialsEstimate * (1 + buffer)

  // Total
  totalBid            Decimal   @db.Decimal(10, 2)   // laborTotal + materialsEstimate
  maxTotal            Decimal   @db.Decimal(10, 2)   // laborTotal + materialsMax

  // Scheduling
  availableDate       DateTime                       // Earliest start date
  estimatedDuration   Int                            // Minutes

  // Bid Details
  notes               String?   @db.Text             // Contractor's notes/approach

  // Status
  status              BidStatus @default(SUBMITTED)
  submittedAt         DateTime  @default(now())

  // Award tracking
  awardedAt           DateTime?
  acceptedAt          DateTime?                      // Contractor confirmed after award
  rejectedAt          DateTime?
  withdrawnAt         DateTime?

  // Decline tracking (if contractor declines after award)
  declinedAfterAward  Boolean   @default(false)
  declineReason       String?

  createdAt           DateTime  @default(now())
  updatedAt           DateTime  @updatedAt

  // Change orders for this bid (if awarded)
  changeOrders        ChangeOrder[]

  @@unique([marketplaceJobId, vendorProfileId, biddingRoundId])  // One bid per vendor per round
  @@index([marketplaceJobId])
  @@index([vendorProfileId])
  @@index([biddingRoundId])
  @@index([status])
  @@index([totalBid])
}

// A bidding round for a marketplace job (can have multiple if first fails)
model BiddingRound {
  id                  String    @id @default(cuid())

  marketplaceJobId    String
  marketplaceJob      MarketplaceJob @relation(fields: [marketplaceJobId], references: [id], onDelete: Cascade)

  roundNumber         Int       @default(1)          // 1, 2, 3... if rebidding

  // Timing
  startedAt           DateTime  @default(now())
  expiresAt           DateTime                       // When bidding closes
  closedAt            DateTime?                      // Actual close time

  // Configuration
  maxBids             Int       @default(10)         // Max vendors invited
  minBids             Int       @default(1)          // Min bids to proceed

  // Status
  status              BiddingRoundStatus @default(OPEN)

  // Results
  totalBidsReceived   Int       @default(0)
  winningBidId        String?   @unique

  // Notifications sent
  vendorsNotified     String[]  @default([])         // Vendor profile IDs notified

  createdAt           DateTime  @default(now())
  updatedAt           DateTime  @updatedAt

  // Relations
  bids                Bid[]

  @@unique([marketplaceJobId, roundNumber])
  @@index([marketplaceJobId])
  @@index([status])
  @@index([expiresAt])
}

// Change order when actual costs exceed bid
model ChangeOrder {
  id                  String    @id @default(cuid())

  bidId               String
  bid                 Bid       @relation(fields: [bidId], references: [id], onDelete: Cascade)

  // What's changing
  reason              String    @db.Text

  // Additional costs
  additionalLabor     Decimal?  @db.Decimal(10, 2)
  additionalMaterials Decimal?  @db.Decimal(10, 2)
  additionalTotal     Decimal   @db.Decimal(10, 2)

  // New totals if approved
  newLaborTotal       Decimal   @db.Decimal(10, 2)
  newMaterialsTotal   Decimal   @db.Decimal(10, 2)
  newTotal            Decimal   @db.Decimal(10, 2)

  // Evidence
  photos              String[]  @default([])

  // Status
  status              ChangeOrderStatus @default(PENDING)

  // Approval tracking
  requestedAt         DateTime  @default(now())
  respondedAt         DateTime?
  respondedBy         String?                        // userId who approved/rejected
  responseNotes       String?

  createdAt           DateTime  @default(now())
  updatedAt           DateTime  @updatedAt

  @@index([bidId])
  @@index([status])
}
```

### 2.3 Modified Models

```prisma
// Add to MarketplaceJob
model MarketplaceJob {
  // ... existing fields ...

  // NEW: Bidding mode
  biddingEnabled      Boolean   @default(true)       // false = direct dispatch (legacy)

  // NEW: Relations
  biddingRounds       BiddingRound[]
  bids                Bid[]

  // NEW: Winning bid reference
  winningBidId        String?   @unique

  // NEW: Tracking bid vs actual
  bidLaborTotal       Decimal?  @db.Decimal(10, 2)   // From winning bid
  bidMaterialsEstimate Decimal? @db.Decimal(10, 2)
  bidTotal            Decimal?  @db.Decimal(10, 2)
  actualLaborTotal    Decimal?  @db.Decimal(10, 2)   // After completion
  actualMaterialsTotal Decimal? @db.Decimal(10, 2)
  bidVariancePercent  Decimal?  @db.Decimal(5, 2)    // (actual - bid) / bid * 100
}

// Add to VendorMarketplaceProfile
model VendorMarketplaceProfile {
  // ... existing fields ...

  // NEW: Bidding metrics
  totalBidsSubmitted  Int       @default(0)
  totalBidsWon        Int       @default(0)
  bidWinRate          Decimal?  @db.Decimal(5, 2)    // (won / submitted) * 100
  avgBidVariance      Decimal?  @db.Decimal(5, 2)    // Avg (actual - bid) / bid

  // NEW: Relations
  bids                Bid[]
}
```

### 2.4 New Indexes for Performance

```prisma
// On Bid
@@index([status, submittedAt])                       // Active bids sorted by time
@@index([vendorProfileId, status])                   // Vendor's active bids
@@index([marketplaceJobId, totalBid])                // Sort bids by price

// On BiddingRound
@@index([status, expiresAt])                         // Expiring rounds
@@index([marketplaceJobId, roundNumber])             // Round history
```

---

## 3. New Job Lifecycle

### 3.1 Status Transitions

```
                                    ┌─────────────────────────────────────────────────────────────┐
                                    │                     NEW BIDDING FLOW                        │
                                    └─────────────────────────────────────────────────────────────┘

PENDING_DISPATCH
       │
       ▼
┌──────────────────┐
│ BIDDING_OPEN     │ ←─── New status: Bidding round active
│                  │      - Matching algorithm notifies vendors
│                  │      - Vendors submit bids
│                  │      - Timer running (24-48 hours default)
└────────┬─────────┘
         │
         │ (round expires OR owner closes early)
         ▼
┌──────────────────┐
│ BIDDING_CLOSED   │ ←─── New status: No more bids accepted
│                  │      - Owner reviews bids
│                  │      - Can award or start new round
└────────┬─────────┘
         │
         │ (owner selects winning bid)
         ▼
┌──────────────────┐
│ BID_AWARDED      │ ←─── New status: Winner notified
│                  │      - Payment escrowed
│                  │      - Contact info revealed to BOTH parties
│                  │      - Contractor has 4 hours to accept
└────────┬─────────┘
         │
         │ (contractor accepts)
         ▼
┌──────────────────┐
│ IN_PROGRESS      │      Existing status: Work underway
│                  │      - Bound to bid price (labor locked)
│                  │      - Materials have 20% buffer
│                  │      - Change orders if needed
└────────┬─────────┘
         │
         │ (contractor completes)
         ▼
┌──────────────────┐
│ COMPLETED        │      Existing status: Pending confirmation
│                  │      - Actual costs recorded
│                  │      - Bid variance calculated
└────────┬─────────┘
         │
         │ (owner confirms)
         ▼
┌──────────────────┐
│ CONFIRMED        │      Existing status: Payment released
│                  │      - Vendor paid (actual cost - platform fee)
│                  │      - Variance affects vendor's avgBidVariance
└──────────────────┘
```

### 3.2 New MarketplaceJobStatus Enum

```prisma
enum MarketplaceJobStatus {
  // Existing
  PENDING_DISPATCH
  DISPATCHED          // Keep for legacy/direct dispatch
  ACCEPTED            // Keep for legacy/direct dispatch
  QUOTE_SUBMITTED     // Keep for legacy
  QUOTE_APPROVED      // Keep for legacy
  QUOTE_DECLINED      // Keep for legacy
  IN_PROGRESS
  COMPLETED
  CONFIRMED
  DISPUTED
  CANCELLED

  // NEW for bidding
  BIDDING_OPEN        // Accepting bids
  BIDDING_CLOSED      // Review period
  BID_AWARDED         // Winner selected, pending acceptance
  BID_DECLINED        // Winner declined, need new round or rebid
}
```

### 3.3 Edge Cases

| Scenario | Handling |
|----------|----------|
| No bids received | Auto-extend 24h once, then notify owner to adjust or cancel |
| Only 1 bid | Allow owner to accept or request more time |
| Winner declines after award | Offer to #2 bidder, or start new round |
| Owner doesn't select winner | Auto-close after 48h, refund any holds |
| Tie in bid amount | Higher-rated vendor wins |
| Contractor's labor exceeds bid | Contractor absorbs cost (labor is binding) |
| Materials exceed buffer | Change order required |

---

## 4. API Endpoints

### 4.1 Bidding Round Management

```typescript
// Start a bidding round for a job
POST /marketplace/jobs/:jobId/bidding/start
Body: {
  expiresIn?: number;         // Hours until bidding closes (default: 24)
  maxBids?: number;           // Max vendors to notify (default: 10)
  minBids?: number;           // Min bids required (default: 1)
}
Response: {
  biddingRound: BiddingRound;
  vendorsNotified: number;
}

// Close bidding early (move to review)
POST /marketplace/jobs/:jobId/bidding/close
Response: {
  biddingRound: BiddingRound;
  bids: AnonymizedBid[];
}

// Extend bidding deadline
POST /marketplace/jobs/:jobId/bidding/extend
Body: {
  additionalHours: number;
}
Response: {
  biddingRound: BiddingRound;
}

// Get current bidding status
GET /marketplace/jobs/:jobId/bidding
Response: {
  biddingRound: BiddingRound;
  bids: AnonymizedBid[];       // No vendor identity
  stats: {
    totalBids: number;
    lowestBid: number;
    highestBid: number;
    averageBid: number;
    timeRemaining: number;    // Seconds
  }
}
```

### 4.2 Vendor Bidding

```typescript
// Get available jobs to bid on (vendor portal)
GET /marketplace/bidding/available
Query: {
  category?: ServiceCategory;
  zipCode?: string;
  minValue?: number;
  maxValue?: number;
}
Response: {
  jobs: AnonymizedJob[];       // No owner identity
  total: number;
}

// Submit a bid (vendor endpoint)
POST /marketplace/jobs/:jobId/bids
Body: {
  laborHours: number;
  laborRate: number;
  materialsEstimate: number;
  availableDate: string;      // ISO date
  estimatedDuration: number;  // Minutes
  notes?: string;
}
Response: {
  bid: Bid;
  rank: number;               // Current position (1 = lowest)
  totalBids: number;
}

// Update a bid (before round closes)
PUT /marketplace/bids/:bidId
Body: {
  laborHours?: number;
  laborRate?: number;
  materialsEstimate?: number;
  availableDate?: string;
  estimatedDuration?: number;
  notes?: string;
}
Response: {
  bid: Bid;
  rank: number;
}

// Withdraw a bid
DELETE /marketplace/bids/:bidId
Response: {
  success: true;
}

// Get my bids (vendor portal)
GET /marketplace/bids/mine
Query: {
  status?: BidStatus;
  page?: number;
  limit?: number;
}
Response: {
  bids: Bid[];                // Includes job details
  total: number;
}
```

### 4.3 Bid Award

```typescript
// Award bid to winner (owner endpoint)
POST /marketplace/jobs/:jobId/bids/:bidId/award
Body: {
  notes?: string;             // Message to winning contractor
}
Response: {
  job: MarketplaceJob;
  bid: Bid;
  vendor: RevealedVendorInfo; // NOW includes contact info
  escrowAmount: number;
}

// Accept awarded bid (vendor endpoint)
POST /marketplace/bids/:bidId/accept
Response: {
  bid: Bid;
  job: MarketplaceJob;
  owner: RevealedOwnerInfo;   // NOW includes property details
}

// Decline awarded bid (vendor endpoint)
POST /marketplace/bids/:bidId/decline
Body: {
  reason: string;
}
Response: {
  bid: Bid;
  // System auto-offers to next best bidder if available
}
```

### 4.4 Change Orders

```typescript
// Request change order (vendor endpoint)
POST /marketplace/jobs/:jobId/change-order
Body: {
  reason: string;
  additionalLabor?: number;
  additionalMaterials?: number;
  photos?: string[];
}
Response: {
  changeOrder: ChangeOrder;
}

// Approve/reject change order (owner endpoint)
POST /marketplace/change-orders/:id/respond
Body: {
  approved: boolean;
  notes?: string;
}
Response: {
  changeOrder: ChangeOrder;
  newJobTotal: number;
}

// Get change orders for a job
GET /marketplace/jobs/:jobId/change-orders
Response: {
  changeOrders: ChangeOrder[];
  originalBid: number;
  currentTotal: number;
}
```

---

## 5. Information Hiding Strategy

### 5.1 What Each Party Sees

#### Owner View of Bids (Before Award)

```typescript
interface AnonymizedBid {
  bidId: string;

  // Pricing (VISIBLE)
  laborHours: number;
  laborRate: number;
  laborTotal: number;
  materialsEstimate: number;
  totalBid: number;

  // Scheduling (VISIBLE)
  availableDate: string;
  estimatedDuration: number;

  // Quality indicators (VISIBLE)
  vendorTier: 'STANDARD' | 'VERIFIED_PRICING' | 'PREMIUM';
  averageRating: number;
  totalJobsCompleted: number;
  onTimePercentage: number;
  avgBidVariance: number;      // How accurate are their bids?

  // HIDDEN
  vendorId: null;
  companyName: null;
  contactName: null;
  phone: null;
  email: null;
}
```

#### Vendor View of Jobs (Before Bidding)

```typescript
interface AnonymizedJob {
  jobId: string;

  // Job details (VISIBLE)
  serviceCatalog: ServiceCatalog;
  description: string;
  photos: string[];

  // Location (PARTIAL)
  zipCode: string;            // General area
  propertyType: string;       // "Apartment", "Single Family", etc.

  // Timing (VISIBLE)
  urgency: 'STANDARD' | 'URGENT' | 'EMERGENCY';
  preferredSchedule: string;

  // Market context (VISIBLE)
  catalogPriceMin: number;
  catalogPriceMax: number;
  currentBidCount: number;
  lowestCurrentBid: number;   // Optional: show competition

  // HIDDEN
  propertyId: null;
  address: null;
  unitNumber: null;
  ownerName: null;
  ownerPhone: null;
  ownerEmail: null;
  organizationId: null;
}
```

### 5.2 Information Reveal Triggers

| Event | Owner Learns | Vendor Learns |
|-------|--------------|---------------|
| Bid submitted | Anonymous bid details | Nothing new |
| Bidding closes | All bids with rankings | Their rank |
| Bid awarded | Vendor name, company, phone, email | Nothing (awaiting acceptance) |
| Vendor accepts | Confirmation | Full property address, owner contact |
| Vendor declines | Notified, offered to #2 | N/A |

### 5.3 Implementation: API Response Filtering

```typescript
// In marketplace.service.ts

private anonymizeBidForOwner(bid: Bid): AnonymizedBid {
  return {
    bidId: bid.id,
    laborHours: bid.laborHours,
    laborRate: bid.laborRate,
    laborTotal: bid.laborTotal,
    materialsEstimate: bid.materialsEstimate,
    totalBid: bid.totalBid,
    availableDate: bid.availableDate,
    estimatedDuration: bid.estimatedDuration,

    // From vendor profile (aggregated, not identifying)
    vendorTier: bid.vendorProfile.tier,
    averageRating: bid.vendorProfile.averageRating,
    totalJobsCompleted: bid.vendorProfile.totalJobsCompleted,
    onTimePercentage: bid.vendorProfile.onTimePercentage,
    avgBidVariance: bid.vendorProfile.avgBidVariance,

    // Explicitly null
    vendorId: null,
    companyName: null,
    contactName: null,
    phone: null,
    email: null,
  };
}

private revealVendorToOwner(bid: Bid): RevealedVendorInfo {
  // Only called after award AND payment escrowed
  return {
    vendorId: bid.vendorProfile.vendorId,
    companyName: bid.vendorProfile.vendor.companyName,
    contactName: bid.vendorProfile.vendor.contactName,
    phone: bid.vendorProfile.vendor.phone,
    email: bid.vendorProfile.vendor.email,
    // ... other details
  };
}
```

---

## 6. Bid Accountability System

### 6.1 Binding vs Flexible Components

| Component | Binding? | Variance Allowed | If Exceeded |
|-----------|----------|------------------|-------------|
| Labor Hours | YES | 0% | Contractor absorbs cost |
| Labor Rate | YES | 0% | Contractor absorbs cost |
| Materials | NO | 20% buffer | Change order required |

### 6.2 Completion Cost Tracking

```typescript
// When contractor completes job
async completeJob(jobId: string, dto: CompleteJobDto) {
  const job = await this.findJob(jobId);
  const winningBid = await this.findBid(job.winningBidId);

  // Calculate actuals
  const actualLaborTotal = dto.actualLaborHours * winningBid.laborRate;
  const actualMaterialsTotal = dto.actualMaterialsCost;
  const actualTotal = actualLaborTotal + actualMaterialsTotal;

  // Labor variance (should be 0 if contractor honors bid)
  const laborVariance = actualLaborTotal - winningBid.laborTotal;

  // Materials variance (allowed up to buffer)
  const materialsVariance = actualMaterialsTotal - winningBid.materialsEstimate;
  const materialsVariancePercent = materialsVariance / winningBid.materialsEstimate;

  // Check if change order needed
  if (materialsVariancePercent > winningBid.materialsBuffer) {
    throw new BadRequestException(
      'Materials exceed buffer. Submit a change order for approval.'
    );
  }

  // Total variance for vendor tracking
  const bidVariancePercent = ((actualTotal - winningBid.totalBid) / winningBid.totalBid) * 100;

  // Update job
  await this.prisma.marketplaceJob.update({
    where: { id: jobId },
    data: {
      actualLaborTotal,
      actualMaterialsTotal,
      actualTotal,
      bidVariancePercent,
      status: 'COMPLETED',
    },
  });

  // Update vendor's average bid variance
  await this.updateVendorBidVariance(winningBid.vendorProfileId);
}
```

### 6.3 Vendor Reputation Impact

```typescript
// Called after job confirmation
async updateVendorBidVariance(vendorProfileId: string) {
  // Get all completed jobs for this vendor
  const completedJobs = await this.prisma.marketplaceJob.findMany({
    where: {
      vendorProfileId,
      status: 'CONFIRMED',
      bidVariancePercent: { not: null },
    },
    select: { bidVariancePercent: true },
  });

  // Calculate average variance
  const avgVariance = completedJobs.reduce(
    (sum, job) => sum + Number(job.bidVariancePercent),
    0
  ) / completedJobs.length;

  // Update profile
  await this.prisma.vendorMarketplaceProfile.update({
    where: { id: vendorProfileId },
    data: { avgBidVariance: avgVariance },
  });
}
```

### 6.4 Displayed to Owners When Comparing Bids

```
┌─────────────────────────────────────────────────────────────────────────┐
│  BID COMPARISON                                                         │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  Bid A (VERIFIED)           Bid B (PREMIUM)          Bid C (STANDARD)   │
│  ────────────────           ─────────────────        ─────────────────  │
│  Total: $127                Total: $145              Total: $98         │
│  Rating: 4.6 ★              Rating: 4.9 ★            Rating: 4.2 ★      │
│  Jobs: 47                   Jobs: 124                Jobs: 12           │
│  On-time: 94%               On-time: 98%             On-time: 83%       │
│  Bid Accuracy: +2%          Bid Accuracy: -1%        Bid Accuracy: +18% │
│               ↑                          ↑                        ↑     │
│        Usually accurate         Very accurate         Often over-budget │
│                                                                         │
│  [Award Bid A]              [Award Bid B] ⭐         [Award Bid C]      │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 7. Notification System

### 7.1 New Notification Types

```typescript
enum NotificationType {
  // ... existing types ...

  // Bidding notifications
  BID_INVITATION,           // Vendor: "New job in your area"
  BID_RECEIVED,             // Owner: "New bid received"
  BIDDING_CLOSING_SOON,     // Both: "Bidding closes in 2 hours"
  BIDDING_CLOSED,           // Both: "Bidding round ended"
  BID_AWARDED,              // Vendor: "You won the bid!"
  BID_NOT_SELECTED,         // Vendor: "Another bid was selected"
  BID_ACCEPTANCE_NEEDED,    // Vendor: "Please confirm job acceptance"
  BID_ACCEPTED,             // Owner: "Contractor confirmed"
  BID_DECLINED_BY_VENDOR,   // Owner: "Winner declined, offering to #2"
  CHANGE_ORDER_REQUESTED,   // Owner: "Contractor requests approval"
  CHANGE_ORDER_RESPONDED,   // Vendor: "Change order approved/rejected"
}
```

### 7.2 Notification Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│ BIDDING ROUND STARTED                                               │
│                                                                     │
│ → Vendor Notification (up to maxBids vendors):                      │
│   "New electrical job in 60614 - Outlet replacement"                │
│   "Market rate: $85-150 | Bid now →"                                │
│                                                                     │
├─────────────────────────────────────────────────────────────────────┤
│ BID SUBMITTED                                                       │
│                                                                     │
│ → Owner Notification:                                               │
│   "New bid received: $127 from VERIFIED contractor (4.6★)"          │
│   "You now have 3 bids | View all →"                                │
│                                                                     │
├─────────────────────────────────────────────────────────────────────┤
│ BIDDING CLOSING SOON (2 hours before)                               │
│                                                                     │
│ → Owner Notification:                                               │
│   "Bidding closes in 2 hours | 4 bids received"                     │
│   "Review and select winner →"                                      │
│                                                                     │
│ → Vendor Notification (who haven't bid):                            │
│   "Last chance to bid on outlet replacement job"                    │
│   "Lowest bid: $98 | 2 hours remaining"                             │
│                                                                     │
├─────────────────────────────────────────────────────────────────────┤
│ BID AWARDED                                                         │
│                                                                     │
│ → Winner Notification:                                              │
│   "Congratulations! Your $127 bid was selected"                     │
│   "Contact: John Smith | 123 Main St, Unit 4B"                      │
│   "Please confirm within 4 hours →"                                 │
│                                                                     │
│ → Non-winner Notification:                                          │
│   "Another contractor was selected for this job"                    │
│   "Your bid: $145 | Winning bid: $127"                              │
│                                                                     │
├─────────────────────────────────────────────────────────────────────┤
│ BID ACCEPTED BY VENDOR                                              │
│                                                                     │
│ → Owner Notification:                                               │
│   "ABC Electric confirmed the job"                                  │
│   "Scheduled: Tomorrow 9am-12pm"                                    │
│   "Contact: (555) 123-4567"                                         │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 7.3 Implementation

```typescript
// notifications.service.ts additions

async sendBidInvitation(vendorProfileId: string, job: AnonymizedJob) {
  const vendor = await this.getVendorWithContact(vendorProfileId);

  await this.createNotification({
    type: 'BID_INVITATION',
    channel: ['EMAIL', 'PUSH', 'IN_APP'],
    recipientEmail: vendor.email,
    recipientUserId: vendor.userId,
    subject: `New ${job.serviceCatalog.category} job in ${job.zipCode}`,
    body: this.templates.bidInvitation(job),
    referenceType: 'MarketplaceJob',
    referenceId: job.jobId,
    metadata: {
      jobId: job.jobId,
      category: job.serviceCatalog.category,
      priceRange: `$${job.catalogPriceMin}-${job.catalogPriceMax}`,
    },
  });
}

async sendBidAwarded(bid: Bid, revealedOwnerInfo: RevealedOwnerInfo) {
  const vendor = await this.getVendorWithContact(bid.vendorProfileId);

  await this.createNotification({
    type: 'BID_AWARDED',
    channel: ['EMAIL', 'PUSH', 'SMS', 'IN_APP'],  // All channels for important event
    recipientEmail: vendor.email,
    recipientPhone: vendor.phone,
    recipientUserId: vendor.userId,
    subject: `You won the bid! $${bid.totalBid} job ready`,
    body: this.templates.bidAwarded(bid, revealedOwnerInfo),
    referenceType: 'Bid',
    referenceId: bid.id,
    metadata: {
      bidId: bid.id,
      jobId: bid.marketplaceJobId,
      amount: bid.totalBid,
      acceptanceDeadline: new Date(Date.now() + 4 * 60 * 60 * 1000), // 4 hours
    },
  });
}
```

---

## 8. Matching Algorithm

### 8.1 Vendor Selection for Bid Invitations

```typescript
async findVendorsForBidding(
  jobId: string,
  maxVendors: number = 10,
): Promise<VendorMarketplaceProfile[]> {
  const job = await this.prisma.marketplaceJob.findUnique({
    where: { id: jobId },
    include: {
      serviceCatalog: true,
      workOrder: { include: { property: true } },
    },
  });

  const zipCode = job.workOrder.property.zipCode;
  const serviceCatalogId = job.serviceCatalogId;

  // Base query: active vendors in service area
  const vendors = await this.prisma.vendorMarketplaceProfile.findMany({
    where: {
      isMarketplaceActive: true,
      acceptingJobs: true,
      serviceZipCodes: { has: zipCode },
      currentActiveJobs: { lt: this.prisma.vendorMarketplaceProfile.fields.maxConcurrentJobs },

      // Must offer this service
      services: {
        some: {
          serviceCatalogId,
          isActive: true,
        },
      },
    },
    include: {
      vendor: true,
      services: {
        where: { serviceCatalogId },
      },
    },
    orderBy: [
      // Priority ordering for invitation
      { tier: 'desc' },                    // PREMIUM > VERIFIED > STANDARD
      { averageRating: 'desc' },           // Higher rated first
      { avgBidVariance: 'asc' },           // More accurate bidders first
      { totalJobsCompleted: 'desc' },      // More experienced first
      { averageResponseMinutes: 'asc' },   // Faster responders first
    ],
    take: maxVendors,
  });

  return vendors;
}
```

### 8.2 Scoring for Bid Comparison (Owner View)

```typescript
interface BidScore {
  bidId: string;
  totalScore: number;       // 0-100
  priceScore: number;       // 0-25 (lower is better)
  ratingScore: number;      // 0-25 (higher is better)
  reliabilityScore: number; // 0-25 (lower variance is better)
  experienceScore: number;  // 0-25 (more jobs is better)
}

calculateBidScores(bids: AnonymizedBid[]): BidScore[] {
  const prices = bids.map(b => b.totalBid);
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);

  return bids.map(bid => {
    // Price score: 25 points, lowest bid gets 25
    const priceScore = maxPrice === minPrice
      ? 25
      : 25 * (1 - (bid.totalBid - minPrice) / (maxPrice - minPrice));

    // Rating score: 25 points, 5.0 rating gets 25
    const ratingScore = (bid.averageRating / 5) * 25;

    // Reliability score: 25 points, 0% variance gets 25
    const varianceAbs = Math.abs(bid.avgBidVariance || 0);
    const reliabilityScore = Math.max(0, 25 - varianceAbs);

    // Experience score: 25 points, logarithmic scale
    const experienceScore = Math.min(25, Math.log10(bid.totalJobsCompleted + 1) * 10);

    return {
      bidId: bid.bidId,
      priceScore: Math.round(priceScore * 10) / 10,
      ratingScore: Math.round(ratingScore * 10) / 10,
      reliabilityScore: Math.round(reliabilityScore * 10) / 10,
      experienceScore: Math.round(experienceScore * 10) / 10,
      totalScore: Math.round((priceScore + ratingScore + reliabilityScore + experienceScore) * 10) / 10,
    };
  }).sort((a, b) => b.totalScore - a.totalScore);
}
```

---

## 9. Fee Structure

### 9.1 Proposed Model

| Who Pays | Fee | Trigger |
|----------|-----|---------|
| Owner | 8% | On job completion |
| Contractor | 0% | N/A |

**Why 0% for contractors:**
- Incentive to join platform (free leads)
- Removes decoupling motivation
- Differentiator vs Thumbtack's lead fees

**Why 8% for owners:**
- Covers Stripe processing (~3%)
- Leaves ~5% margin
- Competitive with TaskRabbit (15%+)
- Value proposition: escrow + dispute resolution + guarantee

### 9.2 Premium Tier (Optional)

| Tier | Owner Fee | Includes |
|------|-----------|----------|
| BASIC | 5% | Escrow + payment processing only |
| STANDARD | 8% | + Dispute resolution |
| PROTECTED | 12% | + 90-day workmanship guarantee |

### 9.3 Revenue Calculation

```typescript
async calculateFees(job: MarketplaceJob, actualTotal: number) {
  const feePercent = this.getFeePercent(job.protectionTier);
  const platformFee = actualTotal * (feePercent / 100);
  const stripeFee = actualTotal * 0.029 + 0.30;  // Stripe's cut
  const netRevenue = platformFee - stripeFee;
  const vendorPayout = actualTotal - platformFee;

  return {
    actualTotal,
    platformFeePercent: feePercent,
    platformFeeAmount: platformFee,
    stripeFeeAmount: stripeFee,
    netRevenue,
    vendorPayoutAmount: vendorPayout,
  };
}

private getFeePercent(tier: ProtectionTier): number {
  switch (tier) {
    case 'BASIC': return 5;
    case 'STANDARD': return 8;
    case 'PROTECTED': return 12;
    default: return 8;
  }
}
```

---

## 10. Frontend Changes

### 10.1 New Components Needed

#### Owner Side

```
/marketplace
├── /jobs/:id/bidding          # Bidding dashboard for a job
│   ├── BiddingStatus          # Timer, bid count, status
│   ├── BidList                # Anonymous bid cards
│   ├── BidComparison          # Side-by-side comparison
│   ├── BidScoreChart          # Visual scoring breakdown
│   └── AwardBidModal          # Confirm award + escrow
│
├── /jobs/:id/change-orders    # Change order review
│   ├── ChangeOrderList
│   └── ChangeOrderDetail
│
└── /jobs/:id/contractor       # Post-award contractor view
    ├── ContractorContact      # Revealed contact info
    ├── JobProgress            # Status updates
    └── CompletionReview       # Approve work
```

#### Vendor Side

```
/vendor-portal
├── /bidding                   # Available jobs to bid
│   ├── JobList                # Anonymous job cards
│   ├── JobDetail              # Full job info (no owner identity)
│   └── SubmitBidModal         # Bid form
│
├── /my-bids                   # Bid tracking
│   ├── ActiveBids             # Pending, submitted
│   ├── WonBids                # Awarded, accepted
│   └── BidHistory             # Past bids
│
├── /jobs/:id                  # Awarded job management
│   ├── OwnerContact           # Revealed after acceptance
│   ├── JobProgress            # Mark start, complete
│   └── ChangeOrderForm        # Request additional budget
│
└── /earnings                  # Payment tracking
    ├── PendingPayouts
    └── PayoutHistory
```

### 10.2 Key UI Patterns

#### Anonymous Bid Card (Owner View)

```
┌─────────────────────────────────────────────────────────────┐
│  ⭐ PREMIUM CONTRACTOR                           Score: 87  │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  Total Bid: $127.00                                         │
│  ├─ Labor: 1.5 hrs × $50/hr = $75.00                        │
│  └─ Materials: ~$52.00 (±20%)                               │
│                                                             │
│  📅 Available: Tomorrow                                     │
│  ⏱️ Estimated: 2 hours                                      │
│                                                             │
│  ────────────────────────────────────────────────────────   │
│  Rating: 4.8 ★ (124 jobs)                                   │
│  On-time: 97%                                               │
│  Bid accuracy: -1% (very accurate)                          │
│                                                             │
│  [View Details]                      [Award This Bid]       │
└─────────────────────────────────────────────────────────────┘
```

#### Anonymous Job Card (Vendor View)

```
┌─────────────────────────────────────────────────────────────┐
│  ELECTRICAL - Outlet Replacement                            │
│  60614 · Apartment                                          │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  "Replace non-functioning outlet in bedroom.                │
│   Outlet sparks when plugging in devices."                  │
│                                                             │
│  📸 2 photos attached                                       │
│                                                             │
│  ────────────────────────────────────────────────────────   │
│  Market rate: $85 - $150                                    │
│  Current bids: 3                                            │
│  Lowest bid: $98                                            │
│  ⏱️ Bidding ends: 18 hours                                  │
│                                                             │
│  [View Details]                         [Submit Bid]        │
└─────────────────────────────────────────────────────────────┘
```

---

## 11. Migration Strategy

### 11.1 Database Migration Steps

```typescript
// Migration 1: Add new enums and models
// packages/database/prisma/migrations/[timestamp]_add_bidding_system

// Step 1: Add new enums
// Step 2: Create BiddingRound table
// Step 3: Create Bid table
// Step 4: Create ChangeOrder table
// Step 5: Add new fields to MarketplaceJob
// Step 6: Add new fields to VendorMarketplaceProfile
// Step 7: Add new notification types
```

### 11.2 Backward Compatibility

```typescript
// Keep legacy flow working
// biddingEnabled: false → use old dispatch flow

async createMarketplaceJob(dto: CreateMarketplaceJobDto) {
  const job = await this.prisma.marketplaceJob.create({
    data: {
      ...dto,
      biddingEnabled: dto.useBidding ?? true,  // Default to new flow
    },
  });

  if (job.biddingEnabled) {
    // New bidding flow
    await this.startBiddingRound(job.id);
  } else {
    // Legacy direct dispatch flow
    // Existing code continues to work
  }

  return job;
}
```

### 11.3 Rollout Plan

| Phase | Scope | Duration |
|-------|-------|----------|
| 1 | Internal testing (staff only) | 2 weeks |
| 2 | Beta users (opt-in) | 2 weeks |
| 3 | New users default | 2 weeks |
| 4 | All users (legacy available) | Ongoing |
| 5 | Deprecate legacy dispatch | 3 months |

---

## 12. Success Metrics

### 12.1 Platform Health

| Metric | Target | Measurement |
|--------|--------|-------------|
| Avg bids per job | 3+ | Count bids / count jobs |
| Bid response rate | 40%+ | Bids submitted / invitations sent |
| Owner selection rate | 80%+ | Jobs awarded / jobs with bids |
| Vendor acceptance rate | 95%+ | Awards accepted / awards made |
| Job completion rate | 98%+ | Confirmed / awarded |

### 12.2 Anti-Decoupling

| Metric | Target | Measurement |
|--------|--------|-------------|
| Repeat job rate | 60%+ | Owners who post again within 90 days |
| Platform-only contact | 100% | No off-platform contact before award |
| Decoupling reports | <1% | Manual review of suspicious patterns |

### 12.3 Quality & Pricing

| Metric | Target | Measurement |
|--------|--------|-------------|
| Avg bid vs catalog | ±15% | Bid amount vs ServiceCatalog range |
| Bid accuracy | ±10% | Actual cost vs bid |
| Owner satisfaction | 4.5+ | Post-completion survey |
| Vendor satisfaction | 4.5+ | Quarterly survey |

---

## Appendix A: API Reference

[Full OpenAPI spec would go here]

## Appendix B: Notification Templates

[Email/SMS templates would go here]

## Appendix C: Database Indexes

[Full index strategy would go here]
