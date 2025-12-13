# Tenant Portal Enhancement Plan

## Executive Summary

This plan outlines the transformation of the tenant portal from a basic functional application to an exceptional, best-in-class tenant experience. The implementation is organized into four phases, prioritized by impact and complexity.

---

## Phase 1: High-Impact Quick Wins (Foundation)

### 1.1 Document Center

**Goal:** Provide tenants with a central hub for all important documents.

**Database Changes:**
```prisma
model TenantDocument {
  id              String   @id @default(cuid())
  tenantId        String
  tenant          Tenant   @relation(fields: [tenantId], references: [id], onDelete: Cascade)

  name            String
  description     String?
  type            TenantDocumentType

  storageKey      String   @unique
  storageUrl      String
  mimeType        String
  size            Int

  uploadedBy      String   // "TENANT" or "MANAGEMENT"
  isVisibleToTenant Boolean @default(true)

  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  @@index([tenantId])
  @@index([type])
}

enum TenantDocumentType {
  LEASE_AGREEMENT
  LEASE_ADDENDUM
  MOVE_IN_CHECKLIST
  MOVE_OUT_CHECKLIST
  COMMUNITY_RULES
  INSURANCE_CERTIFICATE
  PET_DOCUMENTATION
  PAYMENT_RECEIPT
  ANNUAL_STATEMENT
  OTHER
}
```

**Backend Endpoints:**
- `GET /tenant-portal/documents` - List tenant documents
- `GET /tenant-portal/documents/:id/download` - Download document
- `POST /tenant-portal/documents` - Upload document (tenant-uploaded)

**Frontend Components:**
- `/app/documents/page.tsx` - Document center page
- Document list with filters by type
- Upload dialog for tenant documents
- Download functionality

**Files to Create/Modify:**
- `packages/database/prisma/schema.prisma` - Add TenantDocument model
- `packages/backend/src/tenant-portal/tenant-portal.controller.ts` - Add endpoints
- `packages/backend/src/tenant-portal/tenant-portal.service.ts` - Add service methods
- `packages/frontend-tenant/src/app/documents/page.tsx` - New page
- `packages/frontend-tenant/src/components/layouts/TenantLayout.tsx` - Add nav item

---

### 1.2 In-App Notification Center

**Goal:** Real-time notification system for important updates.

**Database Changes:**
```prisma
model TenantNotification {
  id              String   @id @default(cuid())
  tenantId        String
  tenant          Tenant   @relation(fields: [tenantId], references: [id], onDelete: Cascade)

  type            TenantNotificationType
  title           String
  message         String

  // Link to related entity
  referenceType   String?  // "PAYMENT", "MAINTENANCE", "LEASE", "MESSAGE"
  referenceId     String?
  actionUrl       String?  // Deep link within app

  isRead          Boolean  @default(false)
  readAt          DateTime?

  createdAt       DateTime @default(now())

  @@index([tenantId])
  @@index([isRead])
  @@index([createdAt])
}

enum TenantNotificationType {
  PAYMENT_RECEIVED
  PAYMENT_DUE
  PAYMENT_OVERDUE
  AUTOPAY_SCHEDULED
  AUTOPAY_PROCESSED
  AUTOPAY_FAILED
  MAINTENANCE_UPDATE
  MAINTENANCE_COMPLETED
  LEASE_EXPIRING
  LEASE_RENEWED
  NEW_MESSAGE
  DOCUMENT_ADDED
  ANNOUNCEMENT
}
```

**Backend Endpoints:**
- `GET /tenant-portal/notifications` - List notifications (paginated)
- `GET /tenant-portal/notifications/unread-count` - Get unread count
- `PUT /tenant-portal/notifications/:id/read` - Mark as read
- `PUT /tenant-portal/notifications/read-all` - Mark all as read
- `DELETE /tenant-portal/notifications/:id` - Delete notification

**Frontend Components:**
- Notification bell in header with badge
- Dropdown panel with notification list
- `/app/notifications/page.tsx` - Full notifications page
- Mark as read on click/view

**Files to Create/Modify:**
- `packages/database/prisma/schema.prisma` - Add TenantNotification model
- `packages/backend/src/tenant-portal/tenant-portal.controller.ts` - Add endpoints
- `packages/backend/src/tenant-portal/tenant-portal.service.ts` - Add methods
- `packages/backend/src/tenant-portal/notification.service.ts` - New service for creating notifications
- `packages/frontend-tenant/src/components/notifications/NotificationBell.tsx` - Bell component
- `packages/frontend-tenant/src/components/notifications/NotificationDropdown.tsx` - Dropdown
- `packages/frontend-tenant/src/app/notifications/page.tsx` - Full page

---

### 1.3 Payment Receipts & Exports

**Goal:** Allow tenants to download receipts and export payment history.

**Backend Endpoints:**
- `GET /tenant-portal/payments/:id/receipt` - Generate PDF receipt
- `GET /tenant-portal/payments/export` - Export to CSV
- `GET /tenant-portal/payments/annual-statement/:year` - Annual statement PDF

**Frontend Components:**
- Download receipt button on each payment
- Export dropdown (CSV, PDF statement)
- Annual statement generator

**Files to Create/Modify:**
- `packages/backend/src/tenant-portal/tenant-portal.controller.ts` - Add endpoints
- `packages/backend/src/tenant-portal/tenant-portal.service.ts` - Add methods
- `packages/backend/src/tenant-portal/pdf.service.ts` - PDF generation service
- `packages/frontend-tenant/src/app/payments/page.tsx` - Add download buttons

---

### 1.4 Maintenance Feedback System

**Goal:** Allow tenants to rate and provide feedback on completed work.

**Database Changes:**
```prisma
model MaintenanceFeedback {
  id                  String   @id @default(cuid())
  maintenanceRequestId String  @unique
  maintenanceRequest  MaintenanceRequest @relation(fields: [maintenanceRequestId], references: [id], onDelete: Cascade)

  overallRating       Int      // 1-5
  qualityRating       Int?     // 1-5
  timelinessRating    Int?     // 1-5
  communicationRating Int?     // 1-5

  comment             String?  @db.Text
  wouldRecommend      Boolean?

  issueResolved       Boolean  @default(true)
  followUpRequested   Boolean  @default(false)
  followUpReason      String?

  createdAt           DateTime @default(now())
  updatedAt           DateTime @updatedAt
}
```

**Backend Endpoints:**
- `POST /tenant-portal/maintenance/:id/feedback` - Submit feedback
- `GET /tenant-portal/maintenance/:id/feedback` - Get feedback (if exists)
- `PUT /tenant-portal/maintenance/:id/feedback` - Update feedback
- `POST /tenant-portal/maintenance/:id/follow-up` - Request follow-up

**Frontend Components:**
- Feedback prompt on completed maintenance
- Star rating component
- Feedback form with optional fields
- Follow-up request flow

**Files to Create/Modify:**
- `packages/database/prisma/schema.prisma` - Add MaintenanceFeedback model
- `packages/backend/src/tenant-portal/tenant-portal.controller.ts` - Add endpoints
- `packages/backend/src/tenant-portal/tenant-portal.service.ts` - Add methods
- `packages/frontend-tenant/src/components/maintenance/FeedbackForm.tsx` - Feedback form
- `packages/frontend-tenant/src/components/ui/star-rating.tsx` - Star rating component
- `packages/frontend-tenant/src/app/maintenance/detail/page.tsx` - Add feedback section

---

### 1.5 Lease Renewal Portal

**Goal:** Enable tenants to view and respond to lease renewal offers online.

**Database Changes:**
```prisma
model LeaseRenewalOffer {
  id              String   @id @default(cuid())
  leaseId         String
  lease           Lease    @relation(fields: [leaseId], references: [id], onDelete: Cascade)

  status          RenewalOfferStatus @default(PENDING)

  // New terms
  newMonthlyRent  Decimal  @db.Decimal(10, 2)
  newStartDate    DateTime
  newEndDate      DateTime?
  newLeaseType    LeaseType

  // Changes from current
  rentChangeAmount   Decimal? @db.Decimal(10, 2)
  rentChangePercent  Decimal? @db.Decimal(5, 2)

  // Response
  respondedAt     DateTime?
  tenantResponse  RenewalResponse?
  tenantNotes     String?  @db.Text

  // Counter offer
  counterOfferRent    Decimal? @db.Decimal(10, 2)
  counterOfferNotes   String?  @db.Text

  // Expiration
  expiresAt       DateTime

  // Resulting new lease
  newLeaseId      String?

  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  @@index([leaseId])
  @@index([status])
  @@index([expiresAt])
}

enum RenewalOfferStatus {
  PENDING
  ACCEPTED
  DECLINED
  COUNTER_OFFERED
  EXPIRED
  CANCELLED
}

enum RenewalResponse {
  ACCEPT
  DECLINE
  COUNTER
  MOVE_OUT
}
```

**Backend Endpoints:**
- `GET /tenant-portal/lease/renewal-offers` - Get active renewal offers
- `GET /tenant-portal/lease/renewal-offers/:id` - Get specific offer details
- `POST /tenant-portal/lease/renewal-offers/:id/respond` - Respond to offer

**Frontend Components:**
- Renewal offer banner on dashboard (when available)
- `/app/lease/renewal/page.tsx` - Renewal offer details page
- Response form with accept/decline/counter options

**Files to Create/Modify:**
- `packages/database/prisma/schema.prisma` - Add LeaseRenewalOffer model
- `packages/backend/src/tenant-portal/tenant-portal.controller.ts` - Add endpoints
- `packages/backend/src/tenant-portal/tenant-portal.service.ts` - Add methods
- `packages/frontend-tenant/src/app/lease/renewal/page.tsx` - Renewal page
- `packages/frontend-tenant/src/components/lease/RenewalBanner.tsx` - Dashboard banner
- `packages/frontend-tenant/src/app/dashboard/page.tsx` - Add renewal banner

---

## Phase 2: Differentiating Features

### 2.1 Amenity Reservations

**Database Changes:**
```prisma
model Amenity {
  id              String   @id @default(cuid())
  propertyId      String
  property        Property @relation(fields: [propertyId], references: [id], onDelete: Cascade)

  name            String   // "Clubhouse", "Pool", "BBQ Area"
  description     String?
  type            AmenityType

  // Availability
  isReservable    Boolean  @default(true)
  maxDurationMinutes Int?  // Max reservation duration
  advanceBookingDays Int   @default(14) // How far in advance

  // Rules
  rules           String?  @db.Text
  maxOccupancy    Int?
  requiresDeposit Boolean  @default(false)
  depositAmount   Decimal? @db.Decimal(10, 2)

  // Hours
  availableHours  Json     // { "monday": { "start": "06:00", "end": "22:00" }, ... }

  isActive        Boolean  @default(true)

  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  reservations    AmenityReservation[]

  @@index([propertyId])
  @@index([type])
}

enum AmenityType {
  CLUBHOUSE
  POOL
  GYM
  BBQ_AREA
  TENNIS_COURT
  BASKETBALL_COURT
  BUSINESS_CENTER
  THEATER
  ROOFTOP
  PARTY_ROOM
  OTHER
}

model AmenityReservation {
  id              String   @id @default(cuid())
  amenityId       String
  amenity         Amenity  @relation(fields: [amenityId], references: [id], onDelete: Cascade)

  tenantId        String
  tenant          Tenant   @relation(fields: [tenantId], references: [id], onDelete: Cascade)

  status          ReservationStatus @default(PENDING)

  startTime       DateTime
  endTime         DateTime

  guestCount      Int?
  notes           String?

  // Cancellation
  cancelledAt     DateTime?
  cancellationReason String?

  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  @@index([amenityId])
  @@index([tenantId])
  @@index([startTime])
  @@index([status])
}

enum ReservationStatus {
  PENDING
  CONFIRMED
  CANCELLED
  COMPLETED
  NO_SHOW
}
```

**Backend Endpoints:**
- `GET /tenant-portal/amenities` - List available amenities
- `GET /tenant-portal/amenities/:id/availability` - Get availability slots
- `POST /tenant-portal/amenities/:id/reserve` - Make reservation
- `GET /tenant-portal/reservations` - My reservations
- `DELETE /tenant-portal/reservations/:id` - Cancel reservation

**Frontend Components:**
- `/app/amenities/page.tsx` - Amenities listing
- `/app/amenities/[id]/page.tsx` - Amenity detail with calendar
- Calendar component for slot selection
- My reservations page

---

### 2.2 Package & Delivery Tracking

**Database Changes:**
```prisma
model Package {
  id              String   @id @default(cuid())
  tenantId        String
  tenant          Tenant   @relation(fields: [tenantId], references: [id], onDelete: Cascade)

  carrier         String   // "UPS", "FedEx", "USPS", "Amazon", etc.
  trackingNumber  String?
  description     String?

  status          PackageStatus @default(RECEIVED)

  // Locker info (if applicable)
  lockerNumber    String?
  lockerCode      String?

  // Timestamps
  receivedAt      DateTime @default(now())
  notifiedAt      DateTime?
  pickedUpAt      DateTime?

  receivedBy      String?  // Staff who received it
  notes           String?

  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  @@index([tenantId])
  @@index([status])
  @@index([receivedAt])
}

enum PackageStatus {
  RECEIVED
  NOTIFIED
  PICKED_UP
  RETURNED
}
```

**Backend Endpoints:**
- `GET /tenant-portal/packages` - List packages
- `GET /tenant-portal/packages/pending` - Pending pickup count

**Frontend Components:**
- Package notification in header
- `/app/packages/page.tsx` - Package history
- Package pickup instructions modal

---

### 2.3 Guest Parking Passes

**Database Changes:**
```prisma
model GuestParkingPass {
  id              String   @id @default(cuid())
  tenantId        String
  tenant          Tenant   @relation(fields: [tenantId], references: [id], onDelete: Cascade)

  guestName       String
  vehicleMake     String?
  vehicleModel    String?
  vehicleColor    String?
  licensePlate    String

  validFrom       DateTime
  validUntil      DateTime

  status          ParkingPassStatus @default(ACTIVE)
  passCode        String   @unique // For display/verification

  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  @@index([tenantId])
  @@index([validFrom])
  @@index([validUntil])
  @@index([passCode])
}

enum ParkingPassStatus {
  ACTIVE
  EXPIRED
  REVOKED
}
```

**Backend Endpoints:**
- `GET /tenant-portal/parking-passes` - List passes
- `POST /tenant-portal/parking-passes` - Create pass
- `DELETE /tenant-portal/parking-passes/:id` - Revoke pass

**Frontend Components:**
- `/app/parking/page.tsx` - Guest parking page
- Create pass form
- Active passes list with QR codes

---

### 2.4 Move-In/Move-Out Scheduling

**Database Changes:**
```prisma
model MoveSchedule {
  id              String   @id @default(cuid())
  tenantId        String
  tenant          Tenant   @relation(fields: [tenantId], references: [id], onDelete: Cascade)

  type            MoveType
  scheduledDate   DateTime
  timeSlot        String   // "8am-12pm", "12pm-4pm", "4pm-8pm"

  // Elevator reservation
  elevatorReserved Boolean @default(false)

  // Moving company (optional)
  movingCompany   String?
  companyPhone    String?

  // Vehicle info
  truckSize       String?  // "Small Van", "Medium Truck", "Large Truck"

  status          MoveScheduleStatus @default(PENDING)

  notes           String?

  confirmedAt     DateTime?
  completedAt     DateTime?

  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  @@index([tenantId])
  @@index([scheduledDate])
  @@index([type])
}

enum MoveType {
  MOVE_IN
  MOVE_OUT
}

enum MoveScheduleStatus {
  PENDING
  CONFIRMED
  COMPLETED
  CANCELLED
}
```

---

### 2.5 Pet Registration Portal

**Database Changes:**
```prisma
model Pet {
  id              String   @id @default(cuid())
  tenantId        String
  tenant          Tenant   @relation(fields: [tenantId], references: [id], onDelete: Cascade)

  name            String
  type            PetType
  breed           String?
  color           String?
  weight          Int?     // in pounds

  // Documents
  photoUrl        String?
  vaccinationRecordUrl String?
  veterinarianName     String?
  veterinarianPhone    String?

  // Registration
  registrationNumber   String?
  isServiceAnimal      Boolean @default(false)

  status          PetRegistrationStatus @default(PENDING)
  approvedAt      DateTime?

  notes           String?

  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  @@index([tenantId])
  @@index([status])
}

enum PetType {
  DOG
  CAT
  BIRD
  FISH
  SMALL_ANIMAL
  REPTILE
  OTHER
}

enum PetRegistrationStatus {
  PENDING
  APPROVED
  DENIED
  EXPIRED
}
```

---

## Phase 3: Community Features

### 3.1 Community Announcements

**Database Changes:**
```prisma
model CommunityAnnouncement {
  id              String   @id @default(cuid())
  propertyId      String
  property        Property @relation(fields: [propertyId], references: [id], onDelete: Cascade)

  title           String
  content         String   @db.Text
  type            AnnouncementType

  priority        AnnouncementPriority @default(NORMAL)

  // Display settings
  startsAt        DateTime @default(now())
  expiresAt       DateTime?
  isPinned        Boolean  @default(false)

  // Attachments
  imageUrl        String?
  attachments     String[] @default([])

  createdById     String

  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  @@index([propertyId])
  @@index([startsAt])
  @@index([expiresAt])
}

enum AnnouncementType {
  GENERAL
  MAINTENANCE_NOTICE
  EMERGENCY
  EVENT
  POLICY_UPDATE
  AMENITY_UPDATE
}

enum AnnouncementPriority {
  LOW
  NORMAL
  HIGH
  URGENT
}
```

### 3.2 Community Events Calendar

**Database Changes:**
```prisma
model CommunityEvent {
  id              String   @id @default(cuid())
  propertyId      String
  property        Property @relation(fields: [propertyId], references: [id], onDelete: Cascade)

  title           String
  description     String   @db.Text

  startTime       DateTime
  endTime         DateTime
  location        String?

  // RSVP
  maxAttendees    Int?
  requiresRsvp    Boolean  @default(false)

  imageUrl        String?

  createdById     String

  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  rsvps           EventRsvp[]

  @@index([propertyId])
  @@index([startTime])
}

model EventRsvp {
  id              String   @id @default(cuid())
  eventId         String
  event           CommunityEvent @relation(fields: [eventId], references: [id], onDelete: Cascade)

  tenantId        String
  tenant          Tenant   @relation(fields: [tenantId], references: [id], onDelete: Cascade)

  guestCount      Int      @default(0)
  notes           String?

  createdAt       DateTime @default(now())

  @@unique([eventId, tenantId])
  @@index([eventId])
  @@index([tenantId])
}
```

---

## Phase 4: Premium Experience

### 4.1 Referral Program

**Database Changes:**
```prisma
model Referral {
  id              String   @id @default(cuid())
  referrerId      String
  referrer        Tenant   @relation("ReferralsMade", fields: [referrerId], references: [id], onDelete: Cascade)

  referredEmail   String
  referredName    String?
  referredPhone   String?

  status          ReferralStatus @default(PENDING)

  // Reward tracking
  rewardType      ReferralRewardType?
  rewardAmount    Decimal? @db.Decimal(10, 2)
  rewardIssuedAt  DateTime?

  // Tracking
  applicationDate DateTime?
  moveInDate      DateTime?
  resultingTenantId String?

  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  @@index([referrerId])
  @@index([status])
  @@index([referredEmail])
}

enum ReferralStatus {
  PENDING
  APPLIED
  APPROVED
  MOVED_IN
  REWARD_ISSUED
  EXPIRED
  INVALID
}

enum ReferralRewardType {
  RENT_CREDIT
  GIFT_CARD
  CASH
}
```

### 4.2 Dark Mode

**Implementation:**
- Add theme toggle to profile settings
- Use CSS variables for theming
- Store preference in localStorage
- Respect system preference by default

### 4.3 Progressive Web App (PWA)

**Implementation:**
- Add manifest.json
- Implement service worker
- Add offline support for key pages
- Push notification capability

---

## Implementation Order

### Sprint 1 (Phase 1a): Core Enhancements
1. Document Center
2. In-App Notifications
3. Update TenantLayout with new nav items

### Sprint 2 (Phase 1b): Payments & Maintenance
4. Payment Receipts & Exports
5. Maintenance Feedback System

### Sprint 3 (Phase 1c): Lease Features
6. Lease Renewal Portal
7. Dashboard enhancements with renewal banner

### Sprint 4 (Phase 2a): Amenities & Packages
8. Amenity Reservations
9. Package Tracking

### Sprint 5 (Phase 2b): Convenience Features
10. Guest Parking Passes
11. Pet Registration

### Sprint 6 (Phase 3): Community
12. Community Announcements
13. Events Calendar

### Sprint 7 (Phase 4): Premium
14. Referral Program
15. Dark Mode
16. PWA Support

---

## Technical Notes

### State Management
- Continue using TanStack React Query for server state
- Add Zustand stores for UI state (notifications panel open, theme, etc.)

### Real-time Updates
- Consider WebSocket integration for notifications
- Use polling as fallback (current 30s for messages)

### File Storage
- Use existing document storage pattern
- Add PDF generation for receipts (pdfkit or puppeteer)

### Testing
- Add Cypress E2E tests for critical flows
- Unit tests for new service methods

---

## Success Metrics

- Tenant portal login frequency
- Feature adoption rates
- Maintenance request satisfaction scores
- Online payment adoption
- Lease renewal acceptance rate
- App store ratings (for PWA)
