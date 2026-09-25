# Architecture Decision Records (ADRs)

Architecture decision records follow the format **Problem → Choice → Rationale → Trade-offs**. ADR-002 and ADR-006 → ADR-013 are decisions **already applied** in Core Banking (Phase 1), including the real technical issues met during implementation. ADR-001, ADR-004 and ADR-005 are **planned** decisions for the Payment Gateway (Phase 2) and will be updated once coding starts. Detailed progress is in the [Devlog](/en/devlog/).

---

## Decision matrix

| ADR | Technical problem | Decision | Accepted trade-off |
| :--- | :--- | :--- | :--- |
| [ADR-001](/en/adr/ADR-001-saga-orchestration-vs-choreography) | Managing distributed interbank transactions | Saga Orchestration (instead of Choreography) | The orchestrator can become a bottleneck unless designed stateless |
| [ADR-002](/en/adr/ADR-002-double-entry-ledger-immutable-pattern) | How balance movements are recorded | Append-only double-entry ledger | `ledger_entries` grows continuously over time |
| [ADR-003](/en/adr/ADR-003-pessimistic-vs-optimistic-locking-hot-accounts) | Concurrency conflicts on hot accounts | Pessimistic lock + fixed lock ordering | Slightly higher latency per individual account |
| [ADR-004](/en/adr/ADR-004-idempotency-duplicate-message-prevention) | Preventing duplicate processing of resent messages | Idempotency-Key checked at the API layer | Needs a cleanup/expiry policy for the idempotency key table |
| [ADR-005](/en/adr/ADR-005-spring-batch-chunk-vs-tasklet-eod) | End-of-day (EOD) reconciliation & settlement | Spring Batch chunk-oriented step | More complex than a simple Tasklet, chunk size needs tuning |
| [ADR-006](/en/adr/ADR-006-derived-balance-vs-stored-balance) | Storing the account balance | No `balance` column; derived from `SUM(CREDIT) - SUM(DEBIT)` on the ledger | `SUM()` cost on every call; consider snapshots as the system grows |
| [ADR-007](/en/adr/ADR-007-pessimistic-locking-withdraw) | Check-then-act race condition on concurrent withdrawals | Pessimistic locking (`SELECT ... FOR UPDATE`) instead of optimistic locking | Lower throughput on a single account; lock timeout needed when scaling |
| [ADR-008](/en/adr/ADR-008-transaction-aggregate-root) | The Debit=Credit invariant lived in the service layer, outside any entity | Transaction aggregate root — `LedgerEntry` can only be created via `Transaction.record()` | New `transactions` table + backfill migration; entity uses `Persistable<UUID>` because the ID is application-assigned |
| [ADR-009](/en/adr/ADR-009-outbox-pattern-kafka-event-publishing) | Dual-write risk when writing the DB and sending to Kafka in the same flow | Outbox Pattern — events stored in `outbox_events` in the same DB transaction, published by a separate `@Scheduled` process | At-least-once delivery, requires an idempotent consumer (`processed_events`) |
| [ADR-010](/en/adr/ADR-010-redis-cache-account-balance) | `getBalance()` recomputes `SUM()` over the whole ledger on every call | Redis cache-aside for `getBalance()`, evicted via `@TransactionalEventListener(AFTER_COMMIT)`; `withdraw()` always reads the DB, never the cache | More complexity (event + listener) than direct eviction; 3600s TTL for reads not covered by eviction |
| [ADR-011](/en/adr/ADR-011-oracle-dual-profile-support) | Proving the system runs on an enterprise database (Oracle) without breaking the existing Postgres tests | Spring dual profile — 2 migration sets split by vendor, one codebase | Two migration sets to maintain, higher long-term maintenance cost |
| [ADR-012](/en/adr/ADR-012-money-fixed-scale) | Oracle `NUMBER` does not keep a fixed scale on read; ISO 4217 VND = 0 decimals conflicts with the existing domain model | `Money` enforces a fixed `scale=2` for every currency (`setScale(2, RoundingMode.UNNECESSARY)`), not strict ISO 4217 | Must be revisited for currencies with other native fraction digits (e.g. JPY=0, BHD=3) |
| [ADR-013](/en/adr/ADR-013-kubernetes-deployment) | Verifying pessimistic locking works with several app instances in parallel | Deploy the app to K8s (3 replicas), keep the data layer in docker-compose; verify via real HTTP + per-Pod logs | `OutboxEventPublisher` has no distributed lock — the 3 PoC consumers may log duplicates when several Pods read the same event |
