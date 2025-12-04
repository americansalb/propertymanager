# Vendor Onboarding Form - Verification-First Redesign

## Philosophy: "Trust, but Verify"

Every field serves ONE PURPOSE: Can we verify this automatically?

---

## STEP 1: BUSINESS IDENTITY (5 minutes)
**Goal**: Prove they're a real, registered business

### Section A: Legal Information
```
┌─────────────────────────────────────────────────────────────┐
│ 🏢 Business Identity                                        │
│ We'll verify your business with government databases        │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│ Legal Business Name *                                       │
│ [____________________________________________________]       │
│ Must match your state registration exactly                  │
│                                                              │
│ DBA/Trade Name (if different)                               │
│ [____________________________________________________]       │
│                                                              │
│ Business Entity Type *                                      │
│ [Dropdown: LLC, Corporation, Partnership, Sole Proprietor] │
│                                                              │
│ EIN (Employer ID Number) *                                  │
│ [__-_______] (9 digits)                          🔄 Verifying│
│ ✅ Verified with IRS - Matches "ABC Locksmith LLC"          │
│                                                              │
│ State of Incorporation/Registration *                       │
│ [Dropdown: 50 states]                                       │
│                                                              │
│ State Business Registration Number                          │
│ [____________________________________________________]       │
│ (e.g., California SOS# C1234567)                  🔄 Verifying│
│ ✅ Verified - Business Active since 2018                    │
│                                                              │
│ Years in Business *                                         │
│ [Dropdown: <1, 1-3, 3-5, 5-10, 10+]                        │
│ ℹ️ We'll cross-check with your state filing date           │
└─────────────────────────────────────────────────────────────┘
```

**Verification Strategy**:
- EIN: IRS TIN Match API (real-time)
- Business Name: Secretary of State business search (real-time)
- Registration Number: State SOS API lookup
- Cross-check: Years in business vs. actual filing date

---

### Section B: Contact Information
```
┌─────────────────────────────────────────────────────────────┐
│ 📞 Contact Information                                      │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│ Business Address *                                          │
│ Street: [_____________________________________________]      │
│ City:   [_____________________________________________]      │
│ State:  [__________]  ZIP: [_________]           🔄 Verifying│
│ ✅ Address verified with USPS                               │
│ ⚠️ Cannot use PO Box - physical address required           │
│                                                              │
│ Business Phone *                                            │
│ [(__) ___-____]                                  🔄 Verifying│
│ ✅ Verified as business landline                            │
│ ⚠️ Mobile numbers are flagged for review                   │
│                                                              │
│ Email *                                                     │
│ [____________________________________________________]       │
│                                                              │
│ Website (optional but recommended)                          │
│ [____________________________________________________]       │
│ ✅ Domain registered in 2018 - matches business age        │
└─────────────────────────────────────────────────────────────┘
```

**Verification Strategy**:
- Address: USPS Address Validation API (real-time)
- Phone: Twilio Lookup API - verify it's a business line, not mobile
- Website: WHOIS domain age check - scammers use new domains
- Cross-check: Domain age should roughly match "years in business"

---

## STEP 2: LICENSING (3 minutes)
**Goal**: Prove they're qualified to do the work

```
┌─────────────────────────────────────────────────────────────┐
│ 🎓 Contractor License                                       │
│ We verify all licenses with state contractor boards         │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│ License State *                                             │
│ [Dropdown: 50 states]                                       │
│                                                              │
│ License Number *                                            │
│ [____________________________________________________]       │
│ Enter exactly as shown on your license        🔄 Verifying  │
│ ✅ License C-10 #123456 ACTIVE - No disciplinary actions   │
│                                                              │
│ License Type *                                              │
│ [Dropdown: Master, Journeyman, Apprentice, Registered]     │
│                                                              │
│ License Classification *                                    │
│ [Dropdown varies by state - e.g., C-10 Electrical (CA)]    │
│                                                              │
│ License Holder Name *                                       │
│ [____________________________________________________]       │
│ Must match business owner or designated supervisor          │
│ ⚠️ Name mismatch: License shows "John Smith" but business  │
│    is registered to "Jane Doe" - needs explanation         │
│                                                              │
│ Expiration Date *                                           │
│ [MM/DD/YYYY]                                                │
│ ⚠️ Expires in 45 days - please renew soon                  │
│                                                              │
│ 📸 Upload License Photo *                                   │
│ [Upload button]                                             │
│ ✅ Uploaded - OCR extracted: #123456 matches typed number  │
└─────────────────────────────────────────────────────────────┘
```

**Verification Strategy**:
- License Lookup: State contractor board API (real-time search)
- Status Check: Active, Inactive, Suspended, Disciplinary actions
- Expiration Alert: Flag if <60 days from expiration
- OCR License Photo: Extract number, compare to typed value
- Cross-check: License holder name vs. business owner name
- Cross-check: License issue date vs. "years in business"

**Trade-Specific Additions**:
```
┌─────────────────────────────────────────────────────────────┐
│ 🔐 [If Locksmith] Additional Certifications                │
├─────────────────────────────────────────────────────────────┤
│ ALOA Member Number (optional)                               │
│ [____________________________________________________]       │
│ We'll verify with Associated Locksmiths of America          │
│                                                              │
│ Surety Bond (optional but recommended)                      │
│ Bond Company: [_______________________________________]      │
│ Bond Amount:  [$_____________]                              │
│ Expiration:   [MM/DD/YYYY]                                  │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ ❄️ [If HVAC] EPA Certification                              │
├─────────────────────────────────────────────────────────────┤
│ EPA Section 608 Certification Number *                      │
│ [____________________________________________________]       │
│ Required for refrigerant handling                🔄 Verifying│
│ ✅ Verified - Type II Universal certified                   │
└─────────────────────────────────────────────────────────────┘
```

---

## STEP 3: INSURANCE (3 minutes)
**Goal**: Prove they have adequate coverage

```
┌─────────────────────────────────────────────────────────────┐
│ 🛡️ Insurance Coverage                                       │
│ Upload your Certificate of Insurance - we'll read it for you│
├─────────────────────────────────────────────────────────────┤
│                                                              │
│ 📄 Certificate of Insurance (COI) *                         │
│ [Drag & Drop or Click to Upload PDF]                       │
│                                                              │
│ ✅ COI uploaded and parsed successfully                     │
│                                                              │
│ Auto-extracted from your COI:                               │
│ ├─ Carrier: State Farm                                     │
│ ├─ Policy #: GL-987654321                                  │
│ ├─ Coverage: $1,000,000 General Liability                  │
│ ├─ Effective: 01/15/2024                                   │
│ └─ Expires: 01/15/2025                                     │
│                                                              │
│ Does this look correct?                                     │
│ [✓] Yes, this is correct                                   │
│ [ ] No, let me edit manually                               │
│                                                              │
│ [If manual edit:]                                           │
│ Insurance Carrier *                                         │
│ [Dropdown: Major carriers OR "Other"]                      │
│                                                              │
│ Policy Number *                                             │
│ [____________________________________________________]       │
│                                                              │
│ Coverage Amount *                                           │
│ [Dropdown: $300k, $500k, $1M, $2M+]                        │
│ ⚠️ Minimum $500k required for platform                     │
│                                                              │
│ Expiration Date *                                           │
│ [MM/DD/YYYY]                                                │
│ ⚠️ Expires in 25 days - needs renewal soon                 │
│                                                              │
│ Insurance Agent Contact (for verification)                  │
│ Agent Name:  [_______________________________________]      │
│ Agent Phone: [(__) ___-____]                               │
│ ℹ️ We may call to verify coverage if needed                │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ 👷 Workers' Compensation Insurance                          │
│ Required if you have employees                              │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│ Do you have employees? *                                    │
│ ( ) Yes, I have W-2 employees                              │
│ (•) No, owner-operator only                                │
│                                                              │
│ [If Yes → require Workers Comp details]                    │
└─────────────────────────────────────────────────────────────┘
```

**Verification Strategy**:
- COI Upload: OCR/parse PDF automatically (using COI verification APIs)
- Data Extraction: Pull carrier, policy #, dates, coverage amounts
- Pre-fill Fields: Use extracted data, let vendor confirm
- Cross-check: Extracted data vs. manually typed (if different → flag)
- Carrier Verification: API call to insurance carrier (if available)
- Agent Call: Manual verification option if API unavailable
- Red Flags:
  - COI missing required fields → "Incomplete COI, please reupload"
  - Business address on COI doesn't match registration → "Address mismatch"
  - Coverage below minimum → "Must have $500k minimum"
  - Expiring soon → "Please provide updated COI"

---

## STEP 4: TAX & PAYMENT (2 minutes)
**Goal**: Set up for 1099s and fast payment

```
┌─────────────────────────────────────────────────────────────┐
│ 📄 Tax Information (for 1099 reporting)                    │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│ 📎 Upload W-9 Form *                                        │
│ [Drag & Drop or Click to Upload PDF]                       │
│                                                              │
│ ✅ W-9 uploaded and validated                               │
│                                                              │
│ Auto-extracted from your W-9:                               │
│ ├─ Legal Name: ABC Locksmith LLC                           │
│ ├─ EIN: 12-3456789                                         │
│ ├─ Entity Type: LLC                                        │
│ └─ Address: 123 Main St, Anytown, CA 90210                │
│                                                              │
│ ✅ All fields match your business registration             │
│ ⚠️ Name mismatch detected - needs review                   │
│                                                              │
│ OR complete manually:                                       │
│ [Fields for legal name, EIN, entity type, address]         │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ 💳 Payment Setup (for fast payouts)                        │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│ How would you like to receive payment?                      │
│                                                              │
│ Option 1: Instant Verification (Recommended)                │
│ [Connect Bank Account with Plaid]                          │
│ ✓ Instant verification                                     │
│ ✓ Faster payouts                                           │
│ ✓ Most secure                                              │
│                                                              │
│ Option 2: Manual Entry                                      │
│ Bank Name:      [_______________________________________]   │
│ Routing Number: [_________]                                │
│ Account Number: [_________________]                        │
│ Account Type:   [Checking / Savings]                       │
│ ⚠️ Requires micro-deposit verification (2-3 days)          │
└─────────────────────────────────────────────────────────────┘
```

**Verification Strategy**:
- W-9 Upload: OCR to extract legal name, EIN, entity type, address
- Cross-check: W-9 data vs. business registration (all must match)
- IRS Verification: TIN Match to confirm EIN is valid
- Bank Verification: Plaid instant verification OR micro-deposits
- Cross-check: Bank account name must match business legal name

---

## STEP 5: BACKGROUND CHECK (1 minute)
**Goal**: Get consent for background verification

```
┌─────────────────────────────────────────────────────────────┐
│ ✅ Background Check Authorization                           │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│ For platform safety, all vendors must authorize a          │
│ background check. We use [Checkr/GoodHire] to verify:      │
│                                                              │
│ ✓ Criminal history (7 years)                               │
│ ✓ Sex offender registry                                    │
│ ✓ SSN verification                                         │
│                                                              │
│ This check will be run on:                                  │
│ • You (business owner)                                     │
│ • Any technicians who will enter properties                │
│                                                              │
│ Owner Information (for background check)                    │
│ Legal First Name: [_______________________________________] │
│ Middle Name:      [_______________________________________] │
│ Legal Last Name:  [_______________________________________] │
│ Date of Birth:    [MM/DD/YYYY]                             │
│ SSN (Last 4):     [____]                                   │
│ Driver License #: [_______________________________________] │
│ License State:    [__]                                     │
│                                                              │
│ [✓] I authorize PropertyMaster to conduct a background     │
│     check as described above *                              │
│                                                              │
│ [✓] I will ensure all technicians pass background checks   │
│     before they perform services *                          │
└─────────────────────────────────────────────────────────────┘
```

**Verification Strategy**:
- Run background check via Checkr/GoodHire API
- SSN verification
- County criminal records (7 years)
- Sex offender registry check
- Re-run annually
- Auto-suspend if flags appear

---

## STEP 6: SERVICES & COVERAGE (3 minutes)
**Goal**: Define what they offer and where

```
┌─────────────────────────────────────────────────────────────┐
│ 🔧 Services You Offer                                       │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│ Select all services you can provide:                        │
│                                                              │
│ EMERGENCY SERVICES                                          │
│ [✓] Residential Lockout          $75-150                   │
│ [✓] Commercial Lockout           $100-200                  │
│ [ ] Automotive Lockout           $75-175                   │
│                                                              │
│ RESIDENTIAL                                                 │
│ [✓] Rekey Locks                  $20-30/lock               │
│ [✓] Lock Replacement             $75-250                   │
│ [✓] Deadbolt Installation        $100-200                  │
│                                                              │
│ [Show more services...]                                     │
│                                                              │
│ ⚠️ You must select at least 3 services                     │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ 📍 Service Area                                             │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│ Where do you serve?                                         │
│                                                              │
│ Base Location: 123 Main St, Anytown, CA 90210              │
│ (from your business address)                                │
│                                                              │
│ Service Radius: [25] miles                                  │
│ [Visual map showing coverage area]                          │
│                                                              │
│ OR specify ZIP codes:                                       │
│ [90210, 90211, 90212, ...]                                 │
│                                                              │
│ Emergency Availability                                      │
│ [✓] Available 24/7 for emergencies                         │
│ [ ] Business hours only (9am-5pm)                          │
│                                                              │
│ Typical Response Time for Emergencies                       │
│ [Dropdown: <30min, 30-60min, 1-2hrs, Same day]            │
└─────────────────────────────────────────────────────────────┘
```

---

## STEP 7: TRUST & EXPERIENCE (2 minutes - OPTIONAL)
**Goal**: Build credibility (helps with approval)

```
┌─────────────────────────────────────────────────────────────┐
│ ⭐ Build Your Credibility (Optional but Recommended)        │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│ Professional Associations                                   │
│ [ ] ALOA Member #: [__________]                            │
│ [ ] PHCC Member #: [__________]                            │
│ [ ] NECA Member #: [__________]                            │
│ [ ] ACCA Member #: [__________]                            │
│ ✅ We verify all memberships                                │
│                                                              │
│ Better Business Bureau                                      │
│ BBB Profile URL: [_______________________________________]  │
│ ✅ We'll pull your BBB rating automatically                 │
│                                                              │
│ Google Business Profile                                     │
│ Google Business URL: [___________________________________]  │
│ ✅ We'll pull your reviews and rating                       │
│                                                              │
│ Property Manager References                                 │
│ Provide 2-3 references from property management companies:  │
│                                                              │
│ Reference 1                                                 │
│ Company:  [_____________________________________________]   │
│ Contact:  [_____________________________________________]   │
│ Phone:    [(__) ___-____]                                  │
│ Email:    [_____________________________________________]   │
│                                                              │
│ Reference 2                                                 │
│ [Same fields...]                                            │
│                                                              │
│ Portfolio (Optional)                                        │
│ Upload 3-5 photos of recent work:                          │
│ [Upload button]                                             │
└─────────────────────────────────────────────────────────────┘
```

**Verification Strategy**:
- Professional Associations: API lookup to verify membership
- BBB: Pull rating and complaint history from BBB API
- Google Business: Pull reviews and rating from Google Places API
- References: We'll call them during approval process
- Portfolio: Shows experience and quality

---

## STEP 8: REVIEW & SUBMIT
**Goal**: Show verification status, get final confirmation

```
┌─────────────────────────────────────────────────────────────┐
│ 📋 Application Review                                       │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│ VERIFICATION STATUS                                         │
│                                                              │
│ ✅ Business Identity Verified                               │
│    └─ ABC Locksmith LLC - Active since 2018                │
│                                                              │
│ ✅ License Verified                                         │
│    └─ CA License C-10 #123456 - Active, No actions         │
│                                                              │
│ ✅ Insurance Verified                                       │
│    └─ $1M General Liability - Expires 01/15/2025           │
│                                                              │
│ 🔄 Background Check Pending                                │
│    └─ Will be completed within 48 hours                    │
│                                                              │
│ ✅ Bank Account Verified                                    │
│    └─ Wells Fargo ****1234                                 │
│                                                              │
│ ⚠️ NEEDS ATTENTION                                          │
│ └─ Workers Comp Insurance missing                          │
│    You indicated you have employees but didn't provide     │
│    Workers Comp details. Please add this before approval.  │
│                                                              │
│ [Edit] [Continue to Submit]                                 │
│                                                              │
│ Once submitted, we'll review your application within        │
│ 24-48 hours. You'll receive an email when approved.        │
│                                                              │
│ [Submit for Approval]                                       │
└─────────────────────────────────────────────────────────────┘
```

---

## POST-SUBMISSION: Admin Verification Dashboard

```
┌─────────────────────────────────────────────────────────────┐
│ ADMIN VIEW: Vendor Approval Queue                          │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│ ABC Locksmith LLC - Submitted 12/03/2024                   │
│                                                              │
│ AUTO-VERIFICATION RESULTS:                                  │
│ ✅ EIN verified with IRS                                    │
│ ✅ Business registered in CA (active)                       │
│ ✅ Address verified with USPS                               │
│ ✅ Phone is business landline                               │
│ ✅ License C-10 #123456 active, no actions                  │
│ ⚠️ License holder "John Smith" ≠ Business owner "Jane Doe" │
│ ✅ Insurance COI validated, $1M coverage                    │
│ 🔄 Background check in progress (24-48hrs)                 │
│ ✅ Bank account verified                                    │
│ ⚠️ Workers Comp missing (has employees)                    │
│                                                              │
│ TRUST SIGNALS:                                              │
│ ✅ BBB Rating: A+ (No complaints)                           │
│ ✅ Google: 4.8 stars (127 reviews)                          │
│ ✅ ALOA Member since 2019                                   │
│ ✅ Domain registered 2018 (matches years in business)       │
│                                                              │
│ RED FLAGS:                                                  │
│ ⚠️ License holder name mismatch - needs explanation        │
│ ⚠️ Workers Comp missing - requested follow-up              │
│                                                              │
│ [Request More Info] [Approve] [Reject]                     │
└─────────────────────────────────────────────────────────────┘
```

---

## TECHNICAL IMPLEMENTATION NOTES

### APIs to Integrate:
1. **IRS TIN Match** - Verify EIN is real
2. **Secretary of State APIs** (50 states) - Business registration lookup
3. **USPS Address Validation** - Verify address is real
4. **Twilio Lookup** - Verify phone number type
5. **State Contractor Board APIs** - License verification
6. **COI Verification APIs** (Verify, TrustLayer) - Insurance verification
7. **Insurance Carrier APIs** - Policy status verification
8. **Checkr/GoodHire** - Background checks
9. **Plaid** - Bank account verification
10. **WHOIS APIs** - Domain age lookup
11. **BBB API** - Business rating lookup
12. **Google Places API** - Review/rating lookup
13. **Professional Association APIs** (ALOA, PHCC, etc.) - Membership verification

### Document Processing:
- **COI Parser**: Extract carrier, policy #, dates, coverage, insured name
- **License OCR**: Extract license number from photo
- **W-9 Parser**: Extract legal name, EIN, entity type, address

### Cross-Reference Checks:
1. License holder name vs. Business owner name
2. W-9 legal name vs. Business registration name
3. COI business address vs. Registration address
4. Domain age vs. Years in business claim
5. License issue date vs. Years in business claim
6. EIN format validation and check digit

### Real-Time Validation:
- As user types EIN → validate format → IRS lookup
- As user types license # → state board lookup
- As user uploads COI → parse → pre-fill fields
- As user uploads W-9 → parse → cross-check

---

This redesign focuses on VERIFICATION at every step, making it nearly impossible for fraudulent vendors to pass while making it easy for legitimate vendors to prove themselves quickly.
