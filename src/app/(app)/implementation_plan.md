# Refactoring to Strict Favor-based Turn System

The user clarified that the balance system should NOT be based on an average/fair-share dynamic calculation. Instead, it must be a strict 1-to-1 Favor tracking system.

## Example provided by User
- 4 people: A, B, C, D (Rotation: A -> B -> C -> D)
- C is sick, so A washes on C's turn twice.
- C now owes A 2 washes. The cycle continues as normal (D's turn next).
- When it is normally A's turn again, because C owes A a wash, the system automatically assigns the turn to C. "C owes A a turn so it's C's turn."

## Proposed Changes

### 1. Database Schema (`schema.prisma`)
Modify `WashLog` to include the person whose turn it *was supposed to be*. This allows us to keep the rotation moving forward correctly even if someone overrides.
```prisma
model WashLog {
  // ... existing fields ...
  scheduledUserId String? // The user whose turn it was in the rotation
}
```

### 2. Turn Calculation (`room/[id]/page.tsx`)
1. **Find the Base Scheduled User**: Look at the last `WashLog`. Find its `scheduledUserId`. The next base scheduled user is simply the *next active person* in the rotation array after that `scheduledUserId`. (If no logs exist, it's the first person in the rotation).
2. **Favor Substitution**: Check if the "Base Scheduled User" (e.g., A) is owed any unsettled favors. If C owes A a favor, the actual `expectedTurnUser` becomes C!
3. **UI Indication**: The UI will say "C is next to wash (covering a favor for A)".

### 3. Log Wash Logic (`actions.ts` -> `logWash`)
When a wash is logged, we pass the `scheduledUserId` and the actual `washedById`.
- If `scheduledUserId !== washedById`:
  - **Check for Settlement**: Does `washedById` (C) currently owe a favor to `scheduledUserId` (A)? 
    - If YES: We find the oldest unsettled `Favor` where `owedBy = C` and `coveredBy = A`, and mark it `settled: true`. (C is paying back A).
    - If NO: We create a *new* `Favor` where `owedBy = scheduledUserId` and `coveredBy = washedById`. (A missed their turn, so A owes C).

### 4. Revert Balances UI
Revert `balances/page.tsx`, `profile/page.tsx`, and `page.tsx` back to querying the explicit `Favor` table for debts/credits, exactly mapping 1-to-1 favors as designed.

## User Review Required
> [!IMPORTANT]
> The database schema will be updated to add a `scheduledUserId` to `WashLog`. This ensures the cycle always "goes on as it is" even when out-of-turn washes happen. Does this algorithm perfectly match your mental model of the Kettle rules?
