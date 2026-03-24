# 3rd Eye Homes

## Current State
- FlatOwners.tsx has Add/Edit/Export Excel but no bulk import for flat owners
- MonthlyDebit.tsx has a description and date input but no month/year selection dropdowns

## Requested Changes (Diff)

### Add
- Bulk upload button in FlatOwners that accepts an Excel/CSV file and adds all rows to backend
- Month dropdown (Jan-Dec) and Year dropdown (past 3 to next 3 years) in MonthlyDebit
- Auto-populate description from selected month/year

### Modify
- FlatOwners: add "Bulk Upload" button next to existing buttons; parse uploaded file and call addFlatOwner for each row
- MonthlyDebit: replace freeform description with month+year selectors; description auto-generates; date auto-set to 1st of selected month

### Remove
- Nothing

## Implementation Plan
1. FlatOwners.tsx: add file input (hidden), "Bulk Upload" button triggers it, parse XLSX, validate each row, call addFlatOwner in sequence, show progress toast
2. MonthlyDebit.tsx: add month select (Jan-Dec) and year select (current year ±3), auto-generate description like "April 2026 Maintenance", auto-set date to 1st of that month
