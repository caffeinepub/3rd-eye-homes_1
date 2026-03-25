# 3rd Eye Homes

## Current State
The `generateMonthlyDebit` backend function applies a debit entry to every flat owner unconditionally every time it is called. This means running it twice for the same month/year will double-charge all flat owners.

## Requested Changes (Diff)

### Add
- Duplicate-check logic in `generateMonthlyDebit`: before adding a debit entry for a flat, check if a debit with the same `description` (e.g. "January 2026 Maintenance") already exists for that flat. If yes, skip it.
- Return value `{ added: Nat; skipped: Nat }` from `generateMonthlyDebit` so the UI can display how many flats were charged vs already had the entry.

### Modify
- `generateMonthlyDebit` in `main.mo` to skip flats already debited for the given month.
- `backend.did.d.ts` return type for `generateMonthlyDebit` from `undefined` to `{ added: bigint; skipped: bigint }`.
- `MonthlyDebit.tsx` to show meaningful success message including count of new vs skipped.

### Remove
- Nothing removed.

## Implementation Plan
1. Update `generateMonthlyDebit` in `main.mo` to check existing debit entries per flat before adding.
2. Change return type to `{ added: Nat; skipped: Nat }`.
3. Update `backend.did.d.ts` return type.
4. Update `MonthlyDebit.tsx` to use the returned counts in the success message.
