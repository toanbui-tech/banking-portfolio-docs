# ADR-006: Immutable Ledger, Derived Balance Instead of a Stored One

## 1. Problem

Account balances must be stored so that they are always correct, auditable, and cannot be altered without authorization.

## 2. Choice

Do not store `balance` as a column on the `accounts` table. Instead, each transaction is recorded as immutable (append-only) `LedgerEntry` rows in `ledger_entries`, and the balance is derived as `SUM(CREDIT) - SUM(DEBIT)` whenever it is needed — implemented in `AccountService.getBalance()` with two separate JPQL queries, `sumCreditByAccountId`/`sumDebitByAccountId`, in `LedgerEntryRepository`.

## 3. Rationale

- If the balance were stored and updated on each transaction, a code bug or a wrong operation could corrupt it without leaving any trace to investigate.
- An append-only design guarantees every balance change is backed by a concrete transaction record — the audit trail principle: never "edit" a record, only "add" new ones.
- The balance is always mathematically consistent with the transaction history (derived state), removing any chance of balance and history drifting apart through a synchronization bug.

## 4. Trade-offs

- Computing the balance costs a query (`SUM()` on every call) instead of reading a single column — for accounts with very many transactions, performance can degrade over time. Not a concern at this stage, but worth keeping in mind when scaling (e.g. periodic balance snapshots for a larger system).
- The logic is slightly more complex than reading/writing a numeric column.
