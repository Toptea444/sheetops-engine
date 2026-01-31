

# Implementation Plan: Worker PIN System with Privacy Explanation

## Overview
This plan implements a secure PIN authentication system that protects worker accounts across all devices and browsers. When a worker logs in for the first time, they set a 4-6 digit PIN that must be entered on any future login, from any device.

---

## User Experience Flow

### First-Time User (No PIN Set Yet)
1. Enter Worker ID → Validate ID exists in sheets
2. Show PIN setup screen with:
   - Clear warning: "Once you set your PIN and confirm, you won't be able to log out and use a different ID"
   - "Why am I setting a PIN?" expandable explanation
   - PIN input (4-6 digits)
   - Confirm PIN input (must match)
3. Submit → PIN stored in database → Identity confirmed → Dashboard unlocked

### Returning User (PIN Already Set)
1. Enter Worker ID → System detects PIN exists
2. Show PIN entry screen: "Enter your PIN"
3. Verify PIN → If correct, access granted

**********IMPORTANT***********
Some users are currently logged in, there should be a way they are shown the pin stuff and prompt for verification while they're logged in. In all, the prompt to ask if the logged in ID is theirs should come first and the pin after.


Also create a page for admin to reset pin for any worker id. Make the workflow easy
**********IMPORTANT***********

### Someone Trying to Use Another Person's ID
1. Enter the other person's Worker ID
2. System prompts: "Enter your PIN"
3. They don't know the PIN → Blocked

---

## "Why Am I Setting a PIN?" Explanation

When users click this link, they see:

> **Your privacy matters!**
>
> While everyone has access to the shared Google Sheet, manually tracking someone else's progress there is tedious and time-consuming.
>
> However, this app makes viewing bonus data very easy and convenient. Without a PIN, someone could simply enter your Worker ID on their device and monitor your bonuses, goals, and performance trends.
>
> Your PIN ensures that only YOU can access your personal dashboard, no matter which device or browser someone tries to use.

---

## Technical Implementation

### 1. Database: New Table `worker_pins`

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| worker_id | TEXT | Unique - the worker's ID |
| pin_hash | TEXT | Hashed PIN (never plain text) |
| created_at | TIMESTAMP | When PIN was set |

**RLS Policies:**
- SELECT: Anyone can check if a PIN exists for a worker ID (returns true/false, never the hash)
- INSERT: Anyone can insert (first-time setup)
- No UPDATE or DELETE (prevents tampering; admin reset would be manual)

### 2. Edge Function: `verify-worker-pin`

A secure server-side function that:
1. Receives `worker_id` and `pin`
2. Fetches the stored hash from database
3. Hashes the provided PIN and compares
4. Returns `{ valid: true/false }` - never exposes the hash

This prevents any client-side PIN comparison which could be bypassed.

### 3. Edge Function: `set-worker-pin`

For first-time PIN setup:
1. Receives `worker_id` and `pin`
2. Checks if PIN already exists (reject if so)
3. Hashes the PIN
4. Stores in database
5. Returns success/failure

### 4. New Hook: `useWorkerPin.ts`

```typescript
interface UseWorkerPinResult {
  checkPinExists: (workerId: string) => Promise<boolean>;
  setPin: (workerId: string, pin: string) => Promise<{ success: boolean; error?: string }>;
  verifyPin: (workerId: string, pin: string) => Promise<{ valid: boolean; error?: string }>;
}
```

### 5. Updated Flow Components

**WelcomeModal.tsx Changes:**
- After ID validation, check if PIN exists
- If no PIN: Show PIN setup step
- If PIN exists: Show PIN entry step

**New Component: PinSetupStep**
- Warning about permanent identity lock (prominent, not dismissible)
- "Why am I setting a PIN?" collapsible/expandable section
- PIN input (4-6 digits, masked)
- Confirm PIN input
- Validation: PINs must match, 4-6 digits only
- Submit button

**New Component: PinEntryStep**
- PIN input field
- "Enter your 4-6 digit PIN"
- Submit button
- Error display for wrong PIN

### 6. Header User ID Display (Smaller/Subtler)

Current display is quite prominent. Update to:
- Smaller avatar (h-5 w-5 instead of h-7 w-7)
- Smaller text (text-xs instead of text-sm)
- More muted styling
- Remove border, use subtle background only

---

## File Changes Summary

| File | Change |
|------|--------|
| **Database Migration** | Create `worker_pins` table with RLS |
| `supabase/functions/verify-worker-pin/index.ts` | New edge function for secure PIN verification |
| `supabase/functions/set-worker-pin/index.ts` | New edge function for PIN setup |
| `src/hooks/useWorkerPin.ts` | New hook for PIN operations |
| `src/components/dashboard/WelcomeModal.tsx` | Add multi-step flow (ID → PIN setup/entry) |
| `src/components/dashboard/PinSetupStep.tsx` | New component for first-time PIN setup |
| `src/components/dashboard/PinEntryStep.tsx` | New component for PIN verification |
| `src/components/dashboard/Header.tsx` | Make user ID display smaller/subtler |
| `src/pages/Index.tsx` | Integrate PIN flow before identity confirmation |

---

## Security Considerations

1. **PIN Hashing**: PINs are hashed server-side before storage using a secure algorithm
2. **Server-Side Verification**: All PIN checks happen via edge functions, not client-side
3. **No Hash Exposure**: The PIN hash is never sent to the client
4. **First-Come-First-Served**: First person to set PIN owns the ID
5. **Dispute Mechanism**: If someone's ID is claimed by another, an admin can manually delete the PIN record in the database to allow reset

---

## Validation Rules

- PIN must be 4-6 digits (numbers only)
- Confirm PIN must exactly match the original PIN
- Both fields required before submission
- Clear error messages for mismatches

---

## Visual Layout for PIN Setup

```text
┌─────────────────────────────────────────────────────────┐
│                    🛡️ Secure Your Account              │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ⚠️ IMPORTANT                                          │
│  Once you set your PIN, this ID will be permanently    │
│  linked to you. You won't be able to log out and       │
│  use a different Worker ID.                            │
│                                                         │
│  ────────────────────────────────────────────────────  │
│                                                         │
│  Create your PIN (4-6 digits)                          │
│  ┌────────────────────────────────────────────┐        │
│  │ ● ● ● ●                                    │        │
│  └────────────────────────────────────────────┘        │
│                                                         │
│  Confirm your PIN                                       │
│  ┌────────────────────────────────────────────┐        │
│  │ ● ● ● ●                                    │        │
│  └────────────────────────────────────────────┘        │
│                                                         │
│  ❓ Why am I setting a PIN?                [expand ▼]  │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │                 Set PIN & Continue               │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## Expanded "Why am I setting a PIN?" Section

```text
┌─────────────────────────────────────────────────────────┐
│ ❓ Why am I setting a PIN?                  [collapse ▲]│
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Your privacy matters!                                  │
│                                                         │
│  While everyone has access to the shared Google Sheet,  │
│  manually tracking someone's progress there is tedious  │
│  and time-consuming.                                    │
│                                                         │
│  However, this app makes viewing bonus data very easy.  │
│  Without a PIN, someone could enter your Worker ID on   │
│  their device and monitor your bonuses, goals, and      │
│  performance trends without your knowledge.             │
│                                                         │
│  Your PIN ensures that only YOU can access your         │
│  personal dashboard, no matter which device or browser  │
│  someone tries to use.                                  │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## Updated Header Display (Smaller)

**Before:**
```text
[NG] NGDS0001     (h-7 w-7 avatar, text-sm, bordered)
```

**After:**
```text
NG·0001           (h-5 w-5 avatar, text-xs, subtle bg only)
```

Or just initials on mobile with full ID on hover/tooltip.

