# Task List

- [x] 1. Update Database Schema
  - [x] Add `scheduledUserId` to `WashLog` model in `schema.prisma`.
  - [x] Run Prisma db push and generate.
- [x] 2. Update `logWash` Action (`actions.ts`)
  - [x] Update `logWash` to accept `scheduledUserId`.
  - [x] Implement logic to settle favors (if washer owes scheduledUser).
  - [x] Implement logic to create favors (if washer covers for scheduledUser).
- [x] 3. Update Turn Logic (`room/[id]/page.tsx`)
  - [x] Read last `WashLog`'s `scheduledUserId` to determine base rotation.
  - [x] Check if base rotation user is owed favors.
  - [x] If owed, substitute the debtor as the `expectedTurnUser`.
- [x] 4. Revert Balances Page (`room/[id]/balances/page.tsx`)
  - [x] Revert to using `Favor` records for group balances.
- [x] 5. Revert Dashboard (`page.tsx`)
  - [x] Revert to using `Favor` records for net balances and totals.
- [x] 6. Revert Profile Stats (`profile/page.tsx`)
  - [x] Revert to using `Favor` records for personal stats across all groups.
