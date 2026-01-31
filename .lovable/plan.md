
# Implementation Plan: Permanent Device-Identity Binding & User ID Display

## Overview
This plan implements two features:
1. **Permanent device-to-ID binding**: Once a user confirms their identity, their device (browser) is permanently linked to that specific ID and cannot be used to log in to any other ID
2. **Display user ID in dashboard**: Show the user ID prominently in the interface

---

## How It Will Work

### Device Binding Flow
```text
User A confirms identity on Browser 1
         |
         v
[Database records: device_fingerprint_1 = NGDS2001]
         |
         v
Later, User A opens Browser 2 and tries to log in as GHAS1001
         |
         v
System checks: "Has this browser confirmed any ID before?"
         |
    Yes (if cleared cookies) -> No record found -> Allow login attempt
    No -> "Is it the same ID?" 
              |
         Yes -> Allow
         No  -> BLOCK with error: "This browser is already linked to another ID"
```

### Important Consideration
The binding is per-browser (using localStorage fingerprint). If a user clears their browser data, the fingerprint is regenerated and they could potentially log in as someone else. To make this stricter:
- Store the confirmed worker ID in localStorage as well
- Check both database AND localStorage before allowing login

---

## Technical Changes

### 1. Database: New Table `confirmed_identities`

Create a table to store permanent device-to-worker bindings:

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| device_fingerprint | TEXT | Unique - the browser's fingerprint |
| worker_id | TEXT | The confirmed worker ID |
| confirmed_at | TIMESTAMP | When the identity was confirmed |

**RLS Policies:**
- Anyone can read (to check if a fingerprint is already bound)
- Anyone can insert (when confirming identity)
- No updates or deletes (permanent binding)

### 2. Update `useSessionLock.ts`

Add new functions:
- `checkDeviceBinding(fingerprint)`: Check if this device is already permanently bound to a worker ID
- `bindDeviceToWorker(fingerprint, workerId)`: Create permanent binding when identity is confirmed

Modify `claimSession()`:
- Before allowing login, check if the device fingerprint already has a confirmed binding
- If bound to a different worker ID, reject with error

### 3. Update `useUserIdentity.ts`

Store the confirmed worker ID in localStorage:
- New key: `performanceTracker_confirmedWorkerId`
- Set this when identity is confirmed
- Check this on app load to prevent manipulation

### 4. Update `Index.tsx`

- When confirming identity, call `bindDeviceToWorker()`
- Pass the binding check to `WelcomeModal` for error display

### 5. Update `WelcomeModal.tsx`

- Display a new error type for device-already-bound scenario
- Error message: "This browser is already linked to ID [XXX]. Please use your original browser or contact support."

### 6. Display User ID in Dashboard

Update the `Header.tsx` or create a visible user badge that:
- Always shows the user ID (not hidden behind a dropdown)
- Shows prominently even on mobile
- Displays the ID when identity is confirmed

---

## File Changes Summary

| File | Change |
|------|--------|
| **Database Migration** | Create `confirmed_identities` table with RLS |
| `src/hooks/useSessionLock.ts` | Add device binding check and creation functions |
| `src/hooks/useUserIdentity.ts` | Store confirmed worker ID in localStorage |
| `src/components/dashboard/WelcomeModal.tsx` | Add device-bound error message |
| `src/components/dashboard/Header.tsx` | Display user ID badge prominently |
| `src/pages/Index.tsx` | Integrate binding on identity confirmation |

---

## Edge Cases Handled

1. **User clears cookies**: The localStorage confirmedWorkerId is also cleared, but database still has the binding. However, a new fingerprint is generated, so they could log in as someone else. To mitigate:
   - The localStorage `confirmedWorkerId` acts as a local safeguard
   - The database binding catches cases where the fingerprint hasn't changed

2. **Same user, different browser**: Allowed - they can confirm their own ID on multiple browsers

3. **User tries to log in to their own ID after confirming**: Allowed - binding is per-fingerprint, and they're accessing their own ID

4. **Stale sessions**: The existing 15-minute heartbeat timeout still applies for session locks, but the identity binding is permanent

---

## User Experience

### For New Users
1. Enter ID → Validate → Show identity confirmation modal → Confirm → Device permanently bound → Dashboard unlocked

### For Existing Confirmed Users  
1. Open app → Auto-checks binding → Dashboard loads normally

### For Users Trying to Cheat
1. Open different browser → Enter someone else's ID → **BLOCKED**: "This browser is already linked to ID [their actual ID]"

### Visible User ID
- The user ID badge will always be visible in the header
- Shows initials avatar + full ID
- No dropdown menu (since Switch User is removed after confirmation)
