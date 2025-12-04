# Marketplace Vendor Data Requirements

## OUR ACTUAL LIABILITY AS A MARKETPLACE PLATFORM

We're a PLATFORM, not the employer. Our liability is:
1. **Negligent Verification** - Did we verify their credentials before listing?
2. **Fraud Prevention** - Did we verify they're a real business?
3. **Platform Liability** - Did we do due diligence?

We DON'T need to be "additional insured" - we need to VERIFY they are who they say they are.

---

## Priority 1: IDENTITY & BUSINESS VERIFICATION

### Prove They're a Real Business
**Why**: Prevent fraud, prove we did due diligence
**Auto-verify via**: Secretary of State APIs, IRS TIN Match, USPS Address Validation

Required Fields:
- [ ] Legal business name (exact, for state records)
- [ ] DBA/Trade name (if different)
- [ ] Business entity type (LLC, Corp, Sole Prop, Partnership)
- [ ] EIN (9-digit tax ID for 1099 and IRS verification)
- [ ] State of incorporation/registration
- [ ] Business registration number (state filing ID)
- [ ] Physical business address (NOT PO Box - must be verifiable)
- [ ] Business phone (landline preferred - we verify it's a business line)
- [ ] Years in business (verify against state filing date)
- [ ] Website (optional but helps verify legitimacy)

**Automated Checks**:
- Query Secretary of State for "Active" status
- IRS TIN Match to verify EIN is real and name matches
- USPS API to verify address is real
- Phone validation to confirm it's a business line (not mobile)
- Cross-reference: filing date should match "years in business"

---

## Priority 2: LICENSE VERIFICATION (CRITICAL)

### Prove They're Qualified to Do the Work
**Why**: Platform liability - we listed an unlicensed contractor
**Auto-verify via**: State contractor board APIs (all 50 states have searchable databases)

Required Fields:
- [ ] License number (exact format - varies by state)
- [ ] State issued (determines which board to query)
- [ ] License type (Master/Journeyman/Apprentice/etc.)
- [ ] License classification (e.g., C-10 Electrical, C-36 Plumbing in CA)
- [ ] License holder name (must match business owner or designated responsible person)
- [ ] Issue date
- [ ] Expiration date
- [ ] Photo of license (upload - for manual verification if API fails)

**Automated Checks**:
- Query state contractor license board API
- Verify status is "Active" or "Current"
- Verify no disciplinary actions or suspensions
- Verify expiration date is >60 days from now
- Cross-reference: license holder name matches business registration
- Alert us 60 days before expiration
- Auto-suspend vendor if expired or disciplined

---

## Priority 3: INSURANCE VERIFICATION

### Prove They Have Coverage (For THEIR Liability, Not Ours)
**Why**: If they damage property, their insurance pays - not ours
**Auto-verify via**: Carrier APIs, COI verification services (Verify, TrustLayer)

Required Fields:
- [ ] Insurance carrier name (dropdown of major carriers)
- [ ] Policy number (for API verification)
- [ ] Coverage amount (minimum $500k general liability)
- [ ] Policy issue date
- [ ] Policy expiration date
- [ ] Insurance agent name & phone (for manual verification)
- [ ] Certificate of Insurance (PDF upload - required)

**Automated Checks**:
- Parse COI PDF automatically (extract carrier, policy #, dates, coverage)
- Query carrier API to verify policy is active (if available)
- Verify coverage amount meets minimum
- Verify expiration date is >30 days from now
- Alert us 30 days before expiration
- Auto-suspend vendor if expired
- Flag if COI looks fake (missing required fields, wrong format)

---

### License Verification (CRITICAL)
**Why**: Unlicensed work creates liability
**Auto-verify via**: State contractor board APIs, professional association databases

Required Fields:
- [ ] License number (exact format per state)
- [ ] State issued (determines which API to query)
- [ ] License type (Master/Journeyman/etc.)
- [ ] License classification (Electrical C-10, Plumbing C-36, etc.)
- [ ] Expiration date
- [ ] License holder name (must match business owner)
- [ ] Copy of license (photo upload)

**Automated Checks**:
- Query state contractor license board API
- Verify status is "Active"
- Check for disciplinary actions
- Alert 60 days before expiration
- Auto-suspend if expired or disciplined

---

### Background Check (CRITICAL)
**Why**: Property access, tenant safety, liability
**Auto-verify via**: Checkr, GoodHire, Sterling APIs

Required Fields:
- [ ] Full legal name (first, middle, last)
- [ ] Date of birth
- [ ] SSN (last 4 for initial, full for background check)
- [ ] Driver's license number & state
- [ ] Home address (for county criminal checks)
- [ ] Background check consent signature
- [ ] Drug testing consent (for insurance requirements)

**Automated Checks**:
- Run 7-year criminal background check
- Sex offender registry check
- SSN verification
- Re-run annually
- Flag: felonies, theft, violence, sex crimes

---

## Priority 2: TAX COMPLIANCE

### W-9 & 1099 Requirements
**Why**: IRS requires 1099 for contractors over $600/year
**Auto-verify via**: IRS TIN Matching API

Required Fields:
- [ ] Legal business name (exact, for 1099)
- [ ] Business entity type (Sole Prop, LLC, Corp, Partnership)
- [ ] EIN or SSN (for 1099s)
- [ ] W-9 form (PDF upload, required before first payment)
- [ ] Mailing address (for 1099 delivery)

**Automated Checks**:
- Verify EIN via IRS TIN Matching
- Validate business name matches IRS records
- Auto-generate 1099s at year-end
- Track $600 threshold per vendor

---

## Priority 3: BUSINESS VERIFICATION

### Entity Verification
**Why**: Verify they're a real, registered business
**Auto-verify via**: Secretary of State APIs, Dun & Bradstreet

Required Fields:
- [ ] Legal business name
- [ ] DBA/Trade name (if different)
- [ ] Business registration number (state filing number)
- [ ] State of incorporation
- [ ] Years in business
- [ ] Business address (physical, not PO Box)
- [ ] Business phone
- [ ] Website
- [ ] BBB rating (if available)

**Automated Checks**:
- Query Secretary of State for active status
- Verify business address via USPS API
- Check BBB for complaints
- Verify phone number is business line (not mobile)

---

## Priority 4: PAYMENT SETUP

### Banking for Fast Payouts
**Why**: Vendors want fast payment
**Auto-verify via**: Stripe Connect, Plaid

Required Fields:
- [ ] Bank account holder name
- [ ] Bank routing number
- [ ] Bank account number
- [ ] Account type (checking/savings)
- [ ] Void check upload OR Plaid bank login

**Automated Checks**:
- Verify account via micro-deposits OR Plaid instant verification
- Confirm account holder name matches business
- Set up ACH direct deposit

---

## Priority 5: SERVICE DETAILS

### What & Where
Required Fields:
- [ ] Primary service category (Locksmith, Plumber, Electrician, HVAC)
- [ ] Specific services offered (checkboxes from master list)
- [ ] Service ZIP codes (collect ZIP codes, not radius - more accurate)
- [ ] Emergency availability (24/7 yes/no)
- [ ] Standard response time (within 2 hours, 4 hours, same day, next day)
- [ ] Hourly rate range (for property manager budgeting)
- [ ] Trip/service call fee
- [ ] Payment terms accepted (Cash, Check, Card, NET 30)

---

## Priority 6: REFERENCES

### Proof of Experience
Required Fields:
- [ ] Years in this business
- [ ] Number of technicians
- [ ] Professional associations (ALOA, PHCC, NECA, ACCA)
- [ ] 2-3 property management references (optional but encouraged)

---

## FORM FLOW - WHAT TO ASK WHEN

### Step 1: Basic Info (1 minute)
- Business name
- Primary contact name
- Email
- Phone
- Service category

### Step 2: Insurance (CRITICAL - 2 minutes)
- Insurance carrier
- Policy number
- Coverage amount
- Expiration date
- COI upload
- Additional Insured confirmation
- Workers Comp (if employees)

### Step 3: License (CRITICAL - 2 minutes)
- License number
- State
- Type
- Expiration date
- License upload

### Step 4: Background Check Consent (30 seconds)
- Full name
- DOB
- SSN (last 4)
- Consent signature

### Step 5: Tax/Payment (2 minutes)
- Legal name
- Business entity type
- EIN
- W-9 upload
- Bank account info OR Plaid connection

### Step 6: Service Details (2 minutes)
- Services offered
- Service areas (ZIP codes)
- Response times
- Rate information

### Step 7: Review & Submit

---

## WHAT TO VERIFY AUTOMATICALLY

Priority order:
1. ✅ Insurance active status (API check)
2. ✅ License active status (state board API)
3. ✅ Background check (Checkr/GoodHire API)
4. ✅ Bank account (Plaid/micro-deposits)
5. ✅ EIN verification (IRS TIN Match)
6. ✅ Business entity active (Secretary of State API)

## COLOR SCHEME - MATCH PROPERTYMASTER THEME

Use existing PropertyMaster colors:
- Primary: Indigo (#4F46E5)
- Success: Green (#10B981)
- Warning: Amber (#F59E0B)
- Error: Red (#EF4444)
- Gray scale for backgrounds
- Clean white cards with subtle borders
- No gradients, no cartoonish elements
