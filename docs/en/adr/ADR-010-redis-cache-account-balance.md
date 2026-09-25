# ADR-010: Redis Cache-Aside for Account Balance, Invalidated After AFTER_COMMIT

## Context

`AccountService.getBalance()` computes `SUM(CREDIT) - SUM(DEBIT)` over every `LedgerEntry` on each call (see [ADR-006](/en/adr/ADR-006-derived-balance-vs-stored-balance)) — inefficient for accounts with many transactions. A cache is needed to avoid recomputation, but it must not break the pessimistic-locking invariant against overdraft in `withdraw()` (see [ADR-007](/en/adr/ADR-007-pessimistic-locking-withdraw)).

## Options Considered — Where to cache

Risk of caching "blindly": `withdraw()` must check for sufficient funds inside the transaction that has locked the `Account` row — if that check read from the cache instead of the real DB, it could allow an overdraft despite the lock (the cache may hold an old balance that does not reflect the state at lock time).

**Decision:** separate the public `getBalance()` (cached, for ordinary reads) from a `private computeBalanceFromDb()` that reads straight from the DB and is used only inside `withdraw()` — the invariant-checking path never goes through the cache.

## Options Considered — When to invalidate the cache

### Option A — Evict in the same `@Transactional`, before commit

- Simpler (evict right where the data is written).
- Downside: a wide race window — a concurrent read may query the DB (still seeing the old balance because the writing transaction has not committed), then write the old balance back into the cache right after the eviction, leaving wrong data until the TTL expires.

### Option B (chosen) — `@TransactionalEventListener(phase = AFTER_COMMIT)`

- Eviction runs only after the DB transaction commits successfully, significantly narrowing the race window compared with Option A.
- Reuses `TransactionPostedEvent`/`TransactionReversedEvent` from the Kafka feature ([ADR-009](/en/adr/ADR-009-outbox-pattern-kafka-event-publishing)) — the same domain event is used by `LedgerService` both as Outbox event content (sent to Kafka) and as an in-process Spring `ApplicationEvent` (`applicationEventPublisher.publishEvent(event)`) for listeners in the same JVM — no new event class is needed just for cache eviction.

## Decision

Use the **cache-aside pattern** with `StringRedisTemplate` (simple and sufficient because only a decimal string is cached — `currency` is always read from `Account` and not cached since it never changes), with a configurable TTL in `application.properties` (`app.cache.balance.ttl-seconds`, default 3600 seconds), and invalidation via `AFTER_COMMIT` (Option B above).

## Consequences

**Positive:**

- Less DB load for ordinary balance reads (`getBalance()`).
- The overdraft invariant is unaffected — the check in `withdraw()` always computes directly from the DB via `computeBalanceFromDb()`, never through the cache (verified by the existing regression and concurrency tests still passing).
- The balance is never stale after a new transaction, thanks to `AFTER_COMMIT` eviction (verified by a dedicated integration test, `AccountBalanceCacheIntegrationTest`).

**Trade-offs:**

- More complexity (event + listener, `AccountBalanceCacheEvictionListener`) than evicting directly where data is written — but correctness of financial data is prioritized over simpler code.

**Real technical issues encountered:**

1. **Port 6379 was taken** by another Redis container on the dev machine → host port changed to `6380` in `docker-compose.yml` (same reason Postgres had moved to port 5434 earlier).
2. **Testcontainers 2.x has no separate `testcontainers-redis` module** (unlike Kafka, which has `testcontainers-kafka`) → `GenericContainer` with the `redis:7-alpine` image is used directly in `AccountBalanceCacheIntegrationTest`, still running the integration test against a real Redis in Docker.

### Related

- [ADR-006](/en/adr/ADR-006-derived-balance-vs-stored-balance) — balance derived from the ledger, the root reason `getBalance()` needs a cache.
- [ADR-007](/en/adr/ADR-007-pessimistic-locking-withdraw) — the overdraft invariant the cache must not break.
- [ADR-009](/en/adr/ADR-009-outbox-pattern-kafka-event-publishing) — source of the `TransactionPostedEvent`/`TransactionReversedEvent` reused as the eviction signal.
