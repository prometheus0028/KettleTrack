# Strict Favor Tracking Implementation

I have successfully reverted the average-based calculation and implemented a strict **1-to-1 Favor Tracking** system as you requested!

## 1. How the Rotation Works Now
The cycle will always continue normally, regardless of who covers for whom. 
I accomplished this by explicitly storing `scheduledUserId` on every wash log.
- If it's **C's** turn, but **A** logs the wash, the system saves that it *was supposed to be C's turn*.
- The system then looks at the rotation and sees that **D** comes after **C**. So the next turn naturally goes to **D**. The cycle "goes on as it is" exactly as you described!

## 2. Debt Creation & Settlement
When an out-of-turn wash happens (e.g., A washes for C), a literal `Favor` record is created in the database tracking that "C owes A 1 wash".

When it is normally A's turn again, the app checks if anyone owes A a favor. If they do:
- It automatically substitutes the debtor in! The UI will deliberately say:
  **"C is next to wash (covering a favor for A)"**
- When C logs the wash, the system sees that C owed A, and successfully **settles the favor** (it destroys the debt instead of creating a new one).

## 3. UI Reversion
I have reverted the following pages back to querying these strict `Favor` records, meaning the numbers you see will reflect exact, discrete washes owed:
- The Group Balances Page (`/room/[id]/balances`)
- Your Global Dashboard
- Your Profile Stats

This system perfectly self-balances according to your 4-person rotation example.
