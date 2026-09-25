# Tech Stack & Concurrency Handling

> **[Implemented]** — described from the actual Phase 1 code. Step-by-step log: [Devlog — Phase 1](/en/devlog/phase-1-core-banking).

## 1. Tech stack

| Area | Technology | Notes |
| :--- | :--- | :--- |
| Language & framework | Java 17, Spring Boot 4.1.1, Spring Data JPA (Hibernate), Maven | Spring Boot 4 uses Jackson 3 (`tools.jackson.*`) |
| Database | PostgreSQL 15 (default), Oracle Database Free 23 (`oracle` profile) | Flyway migrations, one set per vendor |
| Messaging | Apache Kafka (`spring-boot-starter-kafka`) | Outbox Pattern, 4 consumer groups |
| Cache | Redis 7 (`spring-boot-starter-data-redis`) | Cache-aside for balances |
| Testing | JUnit 5, Testcontainers 2.x (Kafka, Redis) | Postgres/Oracle run via docker-compose |
| Deployment | Docker (multi-stage), Kubernetes (Docker Desktop), Spring Boot Actuator | 3 replicas, startup/liveness/readiness probes |

---

## 2. Preventing race conditions on withdrawal

The real problem is **check-then-act**: two requests both read "enough funds", both withdraw, and the account goes negative. Since `Account` has no `balance` column being overwritten, optimistic locking (`@Version`) cannot detect this conflict — why pessimistic locking was chosen is recorded in [ADR-007](/en/adr/ADR-007-pessimistic-locking-withdraw).

```java
// Simplified for illustration
public interface AccountRepository extends JpaRepository<Account, UUID> {

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT a FROM Account a WHERE a.id = :id")
    Optional<Account> findByIdForUpdate(@Param("id") UUID id);
}
```

Inside `AccountService.withdraw()`:
1. Lock the `Account` row with `findByIdForUpdate()` — on Postgres this generates `SELECT ... FOR NO KEY UPDATE`.
2. Compute the balance **directly from the DB** (`computeBalanceFromDb()`), never from Redis — a stale cache would defeat the lock ([ADR-010](/en/adr/ADR-010-redis-cache-account-balance)).
3. If funds are insufficient → `IllegalStateException` (REST returns HTTP 409).
4. Post the DEBIT/CREDIT pair through `LedgerService` in the same transaction.

A second request on the same account waits until the first one commits or rolls back. Because the lock lives in the database, this stays correct with multiple application instances — verified with 3 Kubernetes Pods ([ADR-013](/en/adr/ADR-013-kubernetes-deployment)).

### Transfers between two accounts (planned)

There is no direct A → B transfer API yet. When it is added, the **fixed lock ordering** rule from [ADR-003](/en/adr/ADR-003-pessimistic-vs-optimistic-locking-hot-accounts) will be applied to avoid deadlocks when two threads lock in opposite order (A→B and B→A at the same time).

---

## 3. Transaction events & consistency

- **Outbox Pattern** ([ADR-009](/en/adr/ADR-009-outbox-pattern-kafka-event-publishing)): `TransactionPostedEvent`/`TransactionReversedEvent` are stored in `outbox_events` in the same DB transaction as the ledger entries; `OutboxEventPublisher` (`@Scheduled`, every 5s) sends them to Kafka afterwards. There is no "DB write succeeded but the event was lost" case.
- **Idempotent consumer**: Kafka only guarantees at-least-once delivery, so `AuditComplianceConsumer` skips any `eventId` already in `processed_events`.
- **Cache invalidation**: the same domain event is also published as an in-process Spring `ApplicationEvent`; `@TransactionalEventListener(phase = AFTER_COMMIT)` evicts the balance cache after commit.

---

## 4. Audit trail

Following the immutable double-entry principle ([ADR-002](/en/adr/ADR-002-double-entry-ledger-immutable-pattern)), every balance change leaves a trace through the ledger entries themselves. Cancelling a transaction means posting a reversal via `Transaction.reverse()`, linked back to the original through `reversal_of_transaction_id`. Every transaction records `created_by`, and `compliance_records` keeps a detailed copy of each entry for audit purposes.
