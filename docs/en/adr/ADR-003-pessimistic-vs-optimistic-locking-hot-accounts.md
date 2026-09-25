# ADR-003: Pessimistic vs Optimistic Locking for Hot Accounts

> **Status:** the pessimistic lock part is applied to `withdraw()` — see [ADR-007](/en/adr/ADR-007-pessimistic-locking-withdraw) (the concrete decision) and [ADR-013](/en/adr/ADR-013-kubernetes-deployment) (verification across several Pods). Fixed lock ordering will be applied when an account-to-account transfer API is added.

## 1. Problem

When many concurrent transactions read/write the balance of the same account (a "hot account" — e.g. a shared fee collection account), a locking mechanism is needed to avoid lost updates (two transactions read the same old balance, both write, and part of the change is lost).

With **optimistic locking** (`@Version`), a transaction arriving after someone else has changed the row gets an `OptimisticLockException` and must retry. Under high contention on the same account, most transactions keep failing and retrying, which is wasteful and makes latency unpredictable.

## 2. Choice

Use a **pessimistic write lock** (`SELECT ... FOR UPDATE`) for balance-changing operations, combined with **fixed lock ordering** when one transaction must lock several accounts at once (e.g. transfer A → B).

## 3. Rationale

- Under high contention, letting transactions queue in the DB and run sequentially is more efficient than letting them fail and retry at the application level.
- Locks are held very briefly — only for the transaction that reads the balance, checks it and posts the entries — so the system is not blocked for long.
- Fixed lock ordering (e.g. always lock the account with the smaller ID first) eliminates the classic deadlock where two transactions lock in opposite order (A→B while B→A).

## 4. Trade-offs

- Latency on a single account rises slightly because transactions wait for each other instead of running fully in parallel.
- Requires design discipline: every place that locks several accounts must follow the same ordering rule, otherwise deadlocks can still happen.
