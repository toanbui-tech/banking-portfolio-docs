# ADR-009: Outbox Pattern for Publishing Transaction Events via Kafka

## Context

Other systems must be notified when a `Transaction` is posted or reversed, for 4 business purposes: Audit/Compliance, Notification, Fraud Detection, Reporting.

The root technical problem: writing to the DB and sending a Kafka message directly in the same flow creates a **dual write** risk — if one of the two operations fails (e.g. the DB save succeeds but the Kafka send fails, or the other way around), the DB and the message queue get out of sync, and downstream systems may never receive the event even though the transaction really happened.

## Options Considered

### Option A — Send to Kafka directly right after saving to the DB

- **Pros:** simple, fewer moving parts, no intermediate table or separate publisher process.
- **Cons:** the dual-write risk described above — nothing guarantees atomicity between the business write and the event send.

### Option B (chosen) — Outbox Pattern

Store the event in an `outbox_events` table in the **same DB transaction** as the business data (`Transaction`/`LedgerEntry`), and have a separate publisher process (`@Scheduled`) read unpublished events and send them to Kafka later.

- **Pros:** the event write and the business write are atomic (same DB transaction, same commit/rollback) — the dual-write risk is eliminated entirely.
- **Cons:** added latency (events go out on the next `@Scheduled` run, not instantly), plus an extra table and publisher process to operate and monitor.

## Sub-decisions (settled during implementation)

- **Domain Event pattern:** `Transaction` (aggregate root) raises domain events in `record()` and `reverse()` and exposes `pullDomainEvents()` — `LedgerService` pulls the events after a successful `save()` and maps them to `OutboxEvent`. Reason: consistent with the DDD principle applied in [ADR-008](/en/adr/ADR-008-transaction-aggregate-root) — business invariants/logic live in the aggregate.
- **Self-contained payload:** includes `eventId` (distinct from `transactionId`, used for idempotency), `transactionId`, `createdBy`, `occurredAt`, `entries[]`, and `eventType` embedded directly in the JSON payload (not in a Kafka header) so consumers have everything they need when debugging without looking up headers.
- **`compliance_records`: one row per `LedgerEntry`** (not per `Transaction`) — real banking compliance/audit needs to know exactly which accounts were involved (debit/credit), not just the transaction total.
- **Test infra: Testcontainers Kafka** — consistent with how the project tests against a real Postgres in Docker, rather than Embedded Kafka.

## Consequences

**Positive:**

- Messages are not lost — atomic with the DB transaction thanks to the Outbox Pattern.
- 4 independent systems (a full Audit consumer + 3 PoCs: Fraud Detection, Notification, Reporting) all receive events via separate `groupId`s (`audit-compliance-group`, `fraud-detection-group`, `notification-group`, `reporting-group`) on the same topic `transaction-posted-topic`.
- The Audit/Compliance consumer is idempotent via the `processed_events` table.

**Trade-offs:**

- Kafka only guarantees *at-least-once delivery*, so an idempotent consumer (the `processed_events` table) is mandatory on the receiving side — more complexity than sending directly.

**Real technical issues encountered:**

1. **Spring Boot 4.1.1 uses Jackson 3** (`tools.jackson.*`), not Jackson 2 — `JacksonJsonSerializer` must be used instead of `JsonSerializer`, plus a separate `spring-boot-starter-json`.
2. **Serious trap:** Spring Boot loads only the first `application.properties` it finds and does not merge main + test — a separate test file overrides the whole DB/Flyway configuration. Fixed with inline `@SpringBootTest(properties = ...)` instead of a separate `application-test.properties`.
3. **Most important finding:** raw `spring-kafka` is NOT enough for Spring Boot 4 to auto-configure the `KafkaTemplate` bean — `spring-boot-starter-kafka` is required. The bug stayed hidden throughout Step 1 because the publisher was always disabled in tests (`outbox.publisher.enabled=false`), and only surfaced with a real, unmocked end-to-end test.
4. **Testcontainers 2.x renamed artifacts** (`testcontainers-kafka` has a different prefix than in 1.x), causing a confusing "version is missing" error.

### Related

- [ADR-008](/en/adr/ADR-008-transaction-aggregate-root) — the `Transaction` aggregate root is where domain events are raised, the foundation of the Outbox Pattern in this ADR.
