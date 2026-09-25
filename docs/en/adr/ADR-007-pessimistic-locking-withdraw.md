# ADR-007: Pessimistic Locking for Withdrawals Instead of Optimistic Locking

## 1. Problem

Race conditions must be prevented when several withdrawals hit the same account concurrently — specifically the "check-then-act" problem: two transactions check the balance at the same time, both see enough funds, both withdraw, and the account goes negative even though each transaction was valid when it checked.

## 2. Choice

Use **pessimistic locking** (`@Lock(LockModeType.PESSIMISTIC_WRITE)` on `AccountRepository.findByIdForUpdate()`, which generates `SELECT ... FOR UPDATE`) instead of optimistic locking (`@Version`). When `AccountService.withdraw()` starts, it locks the corresponding `Account` row — a second transaction on the same account must wait until the first commits or rolls back before reading/computing the balance.

## 3. Rationale

- The current design does not store a `balance` column on `Account` (see [ADR-006](/en/adr/ADR-006-derived-balance-vs-stored-balance) — the balance is derived with `SUM()` over `ledger_entries`). Since no field on `Account` is overwritten when a transaction happens, optimistic locking (`@Version`) has nothing to detect — it only catches conflicts when the entity row itself is overwritten (lost update), while this problem is a check-then-act race (read the balance, then act on it), not a lost update.
- Pessimistic locking solves exactly this: it locks the `Account` for the whole sequence of reading the balance, checking funds and posting the transaction — making the sequence atomic for that account.
- A test simulates 2 threads calling `withdraw()` concurrently on the same account holding 100.00, each withdrawing 80.00 — exactly one thread succeeds, the other gets an `IllegalStateException` (insufficient balance). Hibernate logs confirm the `SELECT ... FOR NO KEY UPDATE` statement is issued and the 2 threads are serialized as designed.

## 4. Trade-offs

- Pessimistic locking reduces parallelism (throughput) for transactions on the same account, because the second transaction waits instead of being processed immediately — acceptable, since correctness (no negative balances) matters more than speed here.
- If a transaction holds the lock too long (complex logic or a hang), other transactions waiting on the same account can pile up — a lock timeout should be considered when scaling the system.
