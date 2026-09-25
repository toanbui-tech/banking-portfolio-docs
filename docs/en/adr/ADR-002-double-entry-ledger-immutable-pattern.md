# ADR-002: Immutable Double-Entry Ledger Pattern

## 1. Problem

Managing balances the simple way, `UPDATE accounts SET balance = balance + 100`, does not fit banking:

- You cannot explain where money came from or went to — only the final figure remains, the history is lost.
- A wrong `UPDATE` (from a bug or a manual DB operation) can corrupt a balance without leaving a trace.
- It cannot satisfy audit requirements, which need every balance movement to be traceable.

## 2. Choice

An append-only double-entry ledger: every balance movement is represented by a balanced pair of Debit/Credit entries, and posted records are never edited or deleted.

## 3. Rationale

- **Preserves the accounting invariant**: every transaction always has total Debit = total Credit, checkable in the application before commit.
- **Balances can always be rebuilt**: the balance at any point in time can be recomputed from the historical entries, instead of blindly trusting a `balance` column that may have been edited incorrectly.
- **Fix mistakes with reversing entries, not by editing data**: to cancel a transaction, the system posts an offsetting (reversal) entry instead of deleting/editing the original — keeping the full history for audit.

## 4. Trade-offs

- The `ledger_entries` table keeps growing because data is never deleted.
- Querying the "current" balance is more complex than reading a `balance` column — a precomputed (materialized) balance can be considered alongside the ledger, as long as it can always be reconciled against the entry history.
