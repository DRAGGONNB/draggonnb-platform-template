# Recurring Billing Workflow - PayFast Implementation

## Overview

PayFast natively supports recurring subscriptions through their subscription billing feature. This implementation uses PayFast's built-in subscription system with ITN (Instant Transaction Notification) webhooks for payment confirmations.

**Key Features:**
1. **Initial Payment**: Customer subscribes via PayFast checkout → PayFast handles recurring billing automatically
2. **Recurring Payments**: PayFast automatically charges customer monthly → sends ITN webhook on each transaction
3. **Subscription Management**: PayFast manages payment retries, cancellations, and customer notifications

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│              PayFast Recurring Subscription Flow                │
│                                                                  │
│  1. Customer Checkout                                            │
│     ├─ User clicks "Get Started" on pricing page               │
│     ├─ API creates PayFast subscription form data              │
│     ├─ User redirected to PayFast checkout                     │
│     └─ PayFast captures payment + creates subscription         │
│                                                                  │
│  2. Initial Payment ITN (Instant Transaction Notification)      │
│     ├─ PayFast sends POST to /api/webhooks/payfast            │
│     ├─ Webhook validates signature (MD5 hash)                  │
│     ├─ Webhook verifies payment with PayFast server            │
│     ├─ Update organization: subscription_status = 'active'     │
│     ├─ Log transaction to subscription_history                 │
│     └─ Trigger client provisioning workflow (if new)           │
│                                                                  │
│  3. Recurring Monthly Billing (Automated by PayFast)            │
│     ├─ PayFast automatically charges customer on billing_date  │
│     ├─ PayFast sends ITN webhook for each payment              │
│     ├─ Webhook updates subscription_history                    │
│     ├─ If successful: Reset usage metrics                      │
│     └─ If failed: PayFast retries automatically (3 attempts)   │
│                                                                  │
│  4. Subscription Cancellation                                   │
│     ├─ Customer cancels via PayFast dashboard OR              │
│     ├─ Admin cancels via PayFast API                           │
│     ├─ PayFast sends ITN webhook with status = 'CANCELLED'    │
│     └─ Update organization: subscription_status = 'cancelled'  │
└─────────────────────────────────────────────────────────────────┘
```

## Database Schema

### Required Tables

#### `subscription_history`
```sql
CREATE TABLE IF NOT EXISTS subscription_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  transaction_id TEXT NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  amount_fee DECIMAL(10, 2),
  amount_net DECIMAL(10, 2),
  status TEXT NOT NULL, -- 'completed', 'failed', 'pending', 'cancelled', 'refunded'
  payment_method TEXT NOT NULL, -- 'payfast'
  created_at TIMESTAMP DEFAULT NOW(),
  notes TEXT,
  payfast_response JSONB -- Raw PayFast ITN data for debugging
);

CREATE INDEX idx_subscription_history_org_id ON subscription_history(organization_id);
CREATE INDEX idx_subscription_history_created_at ON subscription_history(created_at);
CREATE INDEX idx_subscription_history_status ON subscription_history(status);
```

#### Update `organizations` Table
```sql
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS
  next_billing_date DATE;

ALTER TABLE organizations ADD COLUMN IF NOT EXISTS
  payfast_subscription_token TEXT; -- PayFast subscription ID (pf_payment_id)

ALTER TABLE organizations ADD COLUMN IF NOT EXISTS
  last_payment_date DATE;

ALTER TABLE organizations ADD COLUMN IF NOT EXISTS
  subscription_status TEXT DEFAULT 'pending'; -- 'pending', 'active', 'payment_failed', 'cancelled', 'suspended'

ALTER TABLE organizations ADD COLUMN IF NOT EXISTS
  activated_at TIMESTAMP;
```

#### `client_usage_metrics` (Existing - for reset on billing)
- Reset `monthly_posts_used`, `monthly_ai_generations_used` on successful billing
- Compare against subscription limits
- Block features if over limit

## PayFast Subscription Setup

### Step 1: Create Subscription Request

When user clicks "Get Started" on pricing page:

```typescript
// In /api/payments/checkout/route.ts
import { createPayFastSubscription, PRICING_TIERS } from '@/lib/payments/payfast'

const formData = createPayFastSubscription({
  organizationId: 'org-123',
  organizationName: 'Example Business',
  email: 'customer@example.com',
  amount: 1500, // R1,500 initial payment
  description: 'DraggonnB CRMM - Starter Plan',
  subscriptionType: '1', // 1 = monthly
  billingDate: '2025-12-27', // Next billing date
  recurringAmount: 1500, // R1,500 monthly recurring
  cycles: '0', // 0 = until cancelled
  metadata: {
    planTier: 'starter',
    billingCycle: 'monthly'
  }
})

// Return form data to frontend
return { paymentUrl: 'https://sandbox.payfast.co.za/eng/process', formData }
```

### Step 2: Redirect to PayFast

Frontend automatically submits form to PayFast:

```typescript
// Create form element
const form = document.createElement('form')
form.method = 'POST'
form.action = paymentUrl

// Add all form fields (merchant_id, amount, signature, etc.)
Object.entries(formData).forEach(([key, value]) => {
  const input = document.createElement('input')
  input.type = 'hidden'
  input.name = key
  input.value = value
  form.appendChild(input)
})

document.body.appendChild(form)
form.submit() // Redirects to PayFast
```

### Step 3: PayFast Processes Payment

PayFast:
1. Displays payment form to customer
2. Captures payment details (card, EFT, etc.)
3. Creates subscription in PayFast system
4. Charges initial payment
5. Sends ITN webhook to `/api/webhooks/payfast`
6. Redirects customer to `return_url` (success page)

## ITN Webhook Processing

### Security Validation (Required by PayFast)

```typescript
// /app/api/webhooks/payfast/route.ts

// Step 1: Validate signature
const isValidSignature = validatePayFastSignature(itnData, passphrase)
if (!isValidSignature) {
  return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
}

// Step 2: Verify payment with PayFast server (server-to-server)
const isValidPayment = await verifyPayFastPayment(itnData)
if (!isValidPayment) {
  return NextResponse.json({ error: 'Payment verification failed' }, { status: 400 })
}

// Step 3: Validate payment amount (prevent tampering)
const expectedAmount = PRICING_TIERS[planTier].price
const isValidAmount = validatePaymentAmount(amount_gross, expectedAmount)
if (!isValidAmount) {
  return NextResponse.json({ error: 'Amount mismatch' }, { status: 400 })
}
```

### Payment Status Handling

#### COMPLETE (Payment Successful)
```typescript
if (payment_status === 'COMPLETE') {
  // Update organization
  await supabase
    .from('organizations')
    .update({
      subscription_status: 'active',
      payfast_subscription_token: pf_payment_id,
      activated_at: new Date().toISOString(),
      next_billing_date: getNextBillingDate(),
    })
    .eq('id', organizationId)

  // Log transaction
  await supabase
    .from('subscription_history')
    .insert({
      organization_id: organizationId,
      transaction_id: pf_payment_id,
      amount: parseFloat(amount_gross),
      amount_fee: parseFloat(amount_fee),
      amount_net: parseFloat(amount_net),
      status: 'completed',
      payment_method: 'payfast',
      payfast_response: itnData,
    })

  // Reset usage metrics
  await supabase
    .from('client_usage_metrics')
    .update({
      monthly_posts_used: 0,
      monthly_ai_generations_used: 0,
      reset_date: new Date().toISOString(),
    })
    .eq('organization_id', organizationId)

  // TODO: Send welcome email
  // TODO: Trigger client provisioning (if first payment)
}
```

#### FAILED (Payment Failed)
```typescript
if (payment_status === 'FAILED') {
  await supabase
    .from('organizations')
    .update({ subscription_status: 'payment_failed' })
    .eq('id', organizationId)

  await supabase
    .from('subscription_history')
    .insert({
      organization_id: organizationId,
      transaction_id: pf_payment_id,
      amount: parseFloat(amount_gross),
      status: 'failed',
      payment_method: 'payfast',
      payfast_response: itnData,
    })

  // TODO: Send payment failure notification
}
```

#### PENDING (Awaiting Confirmation)
```typescript
if (payment_status === 'PENDING') {
  await supabase
    .from('organizations')
    .update({ subscription_status: 'payment_pending' })
    .eq('id', organizationId)

  // Common for EFT payments - PayFast will send another ITN when cleared
}
```

#### CANCELLED (Subscription Cancelled)
```typescript
if (payment_status === 'CANCELLED') {
  await supabase
    .from('organizations')
    .update({ subscription_status: 'cancelled' })
    .eq('id', organizationId)

  await supabase
    .from('subscription_history')
    .insert({
      organization_id: organizationId,
      transaction_id: pf_payment_id,
      amount: parseFloat(amount_gross),
      status: 'cancelled',
      payment_method: 'payfast',
      payfast_response: itnData,
    })

  // TODO: Send cancellation confirmation email
}
```

## Recurring Billing (Automated by PayFast)

PayFast handles all recurring billing automatically:

1. **Billing Date Arrives**: PayFast charges customer's stored payment method
2. **Payment Successful**: PayFast sends ITN with `payment_status: 'COMPLETE'`
3. **Payment Failed**: PayFast retries automatically (3 attempts over 7 days)
4. **All Retries Failed**: PayFast sends ITN with `payment_status: 'FAILED'`

**No N8N Workflow Needed** - PayFast manages the entire recurring cycle.

## Subscription Management

### Cancel Subscription

**Option 1: Customer Cancels via PayFast**
- Customer logs into PayFast account
- Navigates to subscriptions
- Clicks "Cancel Subscription"
- PayFast sends ITN webhook with `payment_status: 'CANCELLED'`

**Option 2: Admin Cancels via API**
```typescript
// Use PayFast API to cancel subscription
POST https://api.payfast.co.za/subscriptions/{subscription_token}/cancel
Authorization: merchant_id:merchant_key
```

### Pause Subscription

PayFast supports pausing subscriptions:
```typescript
POST https://api.payfast.co.za/subscriptions/{subscription_token}/pause
```

### Update Subscription Amount

To change plan tier (e.g., Starter → Professional):
```typescript
POST https://api.payfast.co.za/subscriptions/{subscription_token}/update
{
  "amount": 3500, // New recurring amount
  "frequency": 3 // 3 = monthly
}
```

## Monitoring & Alerts

### Track Subscription Health

Query for organizations with failed payments:
```sql
SELECT
  o.id,
  o.organization_name,
  o.subscription_status,
  o.next_billing_date,
  sh.created_at AS last_payment_attempt,
  sh.status AS last_payment_status
FROM organizations o
LEFT JOIN subscription_history sh ON sh.organization_id = o.id
WHERE o.subscription_status = 'payment_failed'
ORDER BY sh.created_at DESC
```

### Alert Triggers

1. **Payment Failed**: Send email to customer with payment update link
2. **Subscription Cancelled**: Send confirmation + exit survey
3. **Multiple Failures**: Suspend account access after 3 failed payments
4. **Approaching Limits**: Notify customer when 80% of usage limit reached

## Testing

### Test with PayFast Sandbox

**Sandbox Credentials:**
- Merchant ID: `10000100`
- Merchant Key: `46f0cd694581a`
- Passphrase: (optional, set in PayFast dashboard)
- Base URL: `https://sandbox.payfast.co.za/eng/process`

**Test Cards:**
- Successful Payment: `4000000000000002`
- Failed Payment: `4000000000000010`

### Test Cases

#### Test Case 1: Successful Initial Payment
```
1. Select "Starter" plan (R1,500)
2. Click "Get Started"
3. Redirected to PayFast sandbox
4. Use test card 4000000000000002
5. Complete payment
6. Verify: ITN received, subscription_status = 'active'
7. Verify: subscription_history logged
```

#### Test Case 2: Failed Payment
```
1. Use test card 4000000000000010
2. Verify: ITN received with payment_status = 'FAILED'
3. Verify: subscription_status = 'payment_failed'
```

#### Test Case 3: Recurring Payment Simulation
```
1. Create test subscription
2. Wait for billing_date (or manually trigger in PayFast dashboard)
3. Verify: ITN received for recurring payment
4. Verify: subscription_history updated
5. Verify: usage_metrics reset
```

## Deployment Checklist

- [ ] Create PayFast merchant account (https://www.payfast.co.za)
- [ ] Get production credentials (Merchant ID, Merchant Key)
- [ ] Set passphrase in PayFast dashboard (Settings → Integration)
- [ ] Configure ITN URL in PayFast dashboard: `https://yourdomain.com/api/webhooks/payfast`
- [ ] Add credentials to `.env.local` (PAYFAST_MERCHANT_ID, PAYFAST_MERCHANT_KEY, PAYFAST_PASSPHRASE)
- [ ] Set PAYFAST_MODE=production
- [ ] Update PAYFAST_RETURN_URL to production domain
- [ ] Test with sandbox first (PAYFAST_MODE=sandbox)
- [ ] Verify ITN webhook receives and validates signatures
- [ ] Test subscription creation end-to-end
- [ ] Monitor first 5 live subscriptions closely
- [ ] Set up email notifications for payment events
- [ ] Document cancellation/refund procedures

## FAQ

**Q: How do I refund a payment?**
A: Log into PayFast dashboard → Transactions → Find transaction → Click "Refund". Refunds are processed to customer's original payment method.

**Q: Can customers upgrade mid-cycle?**
A: Yes, use PayFast API to update subscription amount. Customer is charged prorated difference immediately.

**Q: What happens if a recurring payment fails?**
A: PayFast automatically retries 3 times over 7 days. If all fail, PayFast sends ITN with `payment_status: 'FAILED'`. You should suspend account access and notify customer.

**Q: How do I test recurring billing?**
A: Use PayFast sandbox. After initial payment, manually trigger recurring payment via PayFast dashboard (Testing Tools → Trigger Subscription Payment).

**Q: Does PayFast support annual billing?**
A: Yes, set `frequency: '6'` (6 = annual) and `billing_date` 1 year from today.

**Q: How do I handle disputes/chargebacks?**
A: PayFast handles disputes. You'll receive email notification. Respond via PayFast dashboard with evidence (service logs, etc.).

## Resources

- **PayFast Subscriptions Docs**: https://developers.payfast.co.za/docs#subscriptions
- **PayFast ITN Docs**: https://developers.payfast.co.za/docs#instant_transaction_notification
- **PayFast API Reference**: https://developers.payfast.co.za/api
- **PayFast Dashboard**: https://www.payfast.co.za/dashboard
- **Support**: support@payfast.co.za
