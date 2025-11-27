# PropertyMaster - AI Browser Agent Testing Guide

## Overview

This guide is for an AI browser agent to systematically test the PropertyMaster application. Follow these test scenarios in order to verify core functionality.

---

## Environment

- **Admin Portal**: http://localhost:3000 (or deployed URL)
- **Tenant Portal**: http://localhost:3002 (or deployed URL)
- **API**: http://localhost:3001/api/v1

---

## Test Credentials

```
Admin User:
  Email: admin@example.com
  Password: Admin123!

Tenant User:
  Email: tenant@example.com
  Password: Tenant123!
```

---

## Test Scenarios

### 1. Authentication Flow

#### 1.1 Login (Admin Portal)

1. Navigate to `/login`
2. Enter admin credentials
3. Click "Sign In"
4. **Expected**: Redirect to dashboard, see welcome message or dashboard widgets

#### 1.2 Login Failure

1. Navigate to `/login`
2. Enter wrong password
3. Click "Sign In"
4. **Expected**: Error message displayed, remain on login page

#### 1.3 Logout

1. While logged in, click user menu/avatar
2. Click "Logout"
3. **Expected**: Redirect to login page, cannot access protected routes

---

### 2. Properties Management

#### 2.1 View Properties List

1. Login as admin
2. Navigate to `/properties`
3. **Expected**: See list/grid of properties with name, address, unit count

#### 2.2 Create Property

1. Navigate to `/properties`
2. Click "Add Property" or "+" button
3. Fill form:
   - Name: "Test Apartments"
   - Type: "Multifamily"
   - Address: "123 Test Street"
   - City: "Austin"
   - State: "TX"
   - Zip: "78701"
4. Submit form
5. **Expected**: Property created, appears in list, success toast

#### 2.3 Edit Property

1. Navigate to `/properties`
2. Click on a property or its edit button
3. Change name to "Updated Apartments"
4. Save changes
5. **Expected**: Property updated, see new name in list

#### 2.4 Delete Property (without units)

1. Create a new property with no units
2. Click delete button
3. Confirm deletion
4. **Expected**: Property removed from list

---

### 3. Units Management

#### 3.1 View Units for Property

1. Navigate to `/properties`
2. Click on a property
3. **Expected**: See units table/list with unit number, type, rent, status

#### 3.2 Create Unit

1. From property detail page
2. Click "Add Unit"
3. Fill form:
   - Unit Number: "101"
   - Type: "One Bedroom"
   - Bedrooms: 1
   - Bathrooms: 1
   - Square Feet: 750
   - Market Rent: 1500
4. Submit
5. **Expected**: Unit created, appears in list, status "Vacant"

#### 3.3 Update Unit Status

1. Find a unit in the list
2. Change status dropdown to "Maintenance"
3. **Expected**: Status updates immediately, badge color changes

---

### 4. Leases Management

#### 4.1 View Leases List

1. Navigate to `/leases`
2. **Expected**: See table with property, unit, tenant, dates, rent, status

#### 4.2 Create Lease

1. Navigate to `/leases`
2. Click "New Lease" or "+" button
3. Step 1 - Select Unit:
   - Choose property
   - Choose vacant unit
4. Step 2 - Lease Terms:
   - Start Date: (today)
   - End Date: (1 year from today)
   - Monthly Rent: 1500
   - Security Deposit: 1500
5. Step 3 - Add Tenant:
   - First Name: "John"
   - Last Name: "Doe"
   - Email: "john.doe@example.com"
   - Phone: "512-555-1234"
   - Mark as Primary: Yes
6. Step 4 - Review and Submit
7. **Expected**: Lease created with "Draft" status

#### 4.3 Activate Lease

1. Find a Draft lease
2. Click "Activate" button
3. Confirm activation
4. **Expected**: Status changes to "Active", unit status changes to "Occupied"

#### 4.4 Filter Leases

1. On leases page, use status filter
2. Select "Active"
3. **Expected**: Only active leases shown

#### 4.5 Terminate Lease

1. Find an Active lease
2. Click "Terminate" button
3. Enter reason: "Lease violation"
4. Confirm
5. **Expected**: Status changes to "Terminated"

---

### 5. Financial - Charges

#### 5.1 View Charges

1. Navigate to `/financial/charges` or financial section
2. **Expected**: See list of charges with lease, type, amount, due date, status

#### 5.2 Create Manual Charge

1. Click "Add Charge"
2. Fill form:
   - Select Lease
   - Type: "Pet Fee"
   - Amount: 250
   - Description: "Monthly pet fee"
   - Due Date: (select date)
3. Submit
4. **Expected**: Charge created with "Pending" status

#### 5.3 Post Charge

1. Find a Pending charge
2. Click "Post" button
3. **Expected**: Status changes to "Posted"

#### 5.4 Void Charge

1. Find a Posted charge (with no payments)
2. Click "Void" button
3. Confirm
4. **Expected**: Status changes to "Void"

---

### 6. Financial - Payments

#### 6.1 View Payments

1. Navigate to `/financial/payments` or payments section
2. **Expected**: See list of payments with date, tenant, amount, method, status

#### 6.2 Record Manual Payment

1. Click "Record Payment"
2. Fill form:
   - Select Tenant/Lease
   - Amount: 1500
   - Method: "Check"
   - Check Number: "1234"
   - Payment Date: (today)
3. Submit
4. **Expected**: Payment recorded, allocated to oldest charges

#### 6.3 View Tenant Ledger

1. Navigate to a lease detail
2. Click "View Ledger" or go to ledger tab
3. **Expected**: See chronological list of charges and payments with running balance

---

### 7. Financial Dashboard

#### 7.1 View Dashboard Widgets

1. Navigate to main dashboard or `/financial/dashboard`
2. **Expected**: See widgets for:
   - Total Outstanding
   - Monthly Revenue
   - Overdue Accounts
   - Collection Rate

#### 7.2 View Aging Report

1. Navigate to `/financial/aging-report` or click aging widget
2. **Expected**: See breakdown by Current, 1-30, 31-60, 61-90, 90+ days

#### 7.3 View Rent Roll

1. Navigate to `/financial/rent-roll`
2. **Expected**: See all active leases with monthly rent, balance

---

### 8. Work Orders (if implemented)

#### 8.1 View Work Orders

1. Navigate to `/work-orders`
2. **Expected**: See list with property, unit, title, priority, status

#### 8.2 Create Work Order

1. Click "New Work Order"
2. Fill form:
   - Select Property/Unit
   - Title: "Leaky faucet"
   - Description: "Kitchen sink is dripping"
   - Category: "Plumbing"
   - Priority: "Medium"
3. Submit
4. **Expected**: Work order created with "Submitted" status

#### 8.3 Update Work Order Status

1. Find a work order
2. Change status to "In Progress"
3. **Expected**: Status updates, timestamp recorded

---

### 9. API Health Checks

#### 9.1 Health Endpoint

1. Make GET request to `/api/v1/health`
2. **Expected**: HTTP 200, response body with status "ok"

#### 9.2 Unauthorized Access

1. Make GET request to `/api/v1/properties` without auth token
2. **Expected**: HTTP 401 Unauthorized

---

### 10. Error Handling

#### 10.1 404 Page

1. Navigate to `/nonexistent-page`
2. **Expected**: See 404 error page with link to home

#### 10.2 Form Validation

1. Try to create property with empty name
2. **Expected**: Validation error shown, form not submitted

#### 10.3 Delete Protected Resource

1. Try to delete a property that has units
2. **Expected**: Error message explaining cannot delete

---

## Reporting Issues

When reporting bugs, include:

1. Steps to reproduce
2. Expected behavior
3. Actual behavior
4. Screenshots if applicable
5. Browser console errors
6. Network request/response (if API error)

---

## Test Data Cleanup

After testing, consider cleaning up test data:

1. Delete test leases (terminate first if active)
2. Delete test units
3. Delete test properties
4. This keeps the database clean for future tests

---

## Checklist Summary

| Area           | Tests                                     | Status |
| -------------- | ----------------------------------------- | ------ |
| Authentication | Login, Logout, Failed Login               | ⬜     |
| Properties     | List, Create, Edit, Delete                | ⬜     |
| Units          | List, Create, Status Update               | ⬜     |
| Leases         | List, Create, Activate, Terminate, Filter | ⬜     |
| Charges        | List, Create, Post, Void                  | ⬜     |
| Payments       | List, Record, Ledger View                 | ⬜     |
| Dashboard      | Widgets, Aging, Rent Roll                 | ⬜     |
| Work Orders    | List, Create, Status Update               | ⬜     |
| Error Handling | 404, Validation, Protected Delete         | ⬜     |

Mark each ⬜ as ✅ when passing or ❌ when failing.
