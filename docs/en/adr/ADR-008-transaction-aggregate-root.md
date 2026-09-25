# ADR-008: Transaction Aggregate Root for the Debit=Credit Invariant

## Context

- Before the refactor: the Debit=Credit invariant lived in `LedgerService.validateBalanced()`; no entity/aggregate represented the concept of "one accounting transaction".
- Problem: by DDD principles, invariants belong in an aggregate, not in a service.

## Options Considered

### Option A — Keep things as they are (no Transaction entity)

- **Pros:** few changes, light migration.
- **Cons:** the "transaction" concept stays implicit forever, no place for future transaction-level business rules, queries return a bare `List<LedgerEntry>` with no meaning.

### Option B — Create a Transaction aggregate root holding `List<LedgerEntry>`

- **Pros:** Debit=Credit becomes a natural property of the aggregate (the constructor cannot create an unbalanced `Transaction`), reversals have a natural home (`reversalOfTransactionId`), queries return a meaningful object.
- **Cons:** a real aggregate boundary change — new table, backfill migration, `LedgerService` reduced to thin orchestration, risk of over-engineering when no business operation needs Transaction-level handling yet (YAGNI).

## Decision

Choose **Option B** — because "Debit=Credit" is an invariant, and by DDD principles invariants belong in the aggregate rather than in a service (services should only orchestrate). Trading time/complexity for an architecture that follows the principle, and accepting the over-engineering risk at this stage because this is a learning portfolio that prioritizes practicing the right patterns over development speed.

## Consequences

**Positive:**

- The invariant is guaranteed automatically in the domain layer.
- `LedgerService` now only orchestrates.
- Reversals have a semantically correct place (`reversalOfTransactionId`).

**Negative/risks:**

- More system complexity while no business feature really needs Transaction as an independent object yet.

**Technical issues found during implementation:**

1. **PostgreSQL has no `MIN()` on the UUID type** — UUIDs have no default ordering. The backfill migration (grouping old `ledger_entries` by `transaction_id` to pick a representative value per group) had to cast UUID to `::text` before `MIN()`, then cast the result back with `::uuid`.
2. **JPA pitfall — `Persistable<UUID>`.** `Transaction.id` is assigned in the constructor (no `@GeneratedValue` — per DDD, an aggregate creates itself in a valid state). Because the ID is not null when `save()` is called, Spring Data JPA assumes the entity already exists in the DB and calls `merge()` instead of `persist()`, so the `PERSIST` cascade to `LedgerEntry` does not fire properly — producing empty records instead of the right data. This is a "silently wrong" bug (no clear exception), only found by carefully checking the data after saving. Fix: implement `Persistable<UUID>` and define `isNew()` to tell JPA exactly when the entity is new, whether or not the ID is already set.

Result after the fix: 21/21 tests pass, cascade works correctly. Lesson: understanding JPA's persist vs. merge mechanics matters much more than just knowing annotation syntax.
