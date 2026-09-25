# ADR-011: Oracle Dual-Profile Support

## Context

The project needs to prove it can work with an enterprise database (Oracle is common in Vietnamese banks) without affecting the 45 tests already passing on PostgreSQL.

## Options Considered

### Option A — Migrate fully to Oracle, replacing Postgres

- Throws away the stable Postgres foundation in exchange for a single enterprise database.

### Option B (chosen) — Run both databases side by side via separate Spring profiles, one codebase

- The core cost (rewriting SQL per dialect) is identical to Option A, but the 45 stable Postgres tests are untouched.
- A stronger portfolio story: "portable design, proven by real tests on both databases" instead of a one-way migration.

## Decision

Oracle Database Free (`gvenzl/oracle-free:23-slim-faststart`) in Docker, host port 1522. Migration folders are split by vendor (`db/migration/postgresql/`, `db/migration/oracle/`), with Flyway `locations` configured per profile (`application.properties` points to `db/migration/postgresql`, `application-oracle.properties` to `db/migration/oracle`). Tests run against static containers from `docker-compose` (consistent with how the project already tests Postgres), not Testcontainers for the main database — Testcontainers is used only for Kafka/Redis (where isolation/dynamic ports are needed).

## Real technical issues when rewriting the 7 migrations

1. **UUID → `RAW(16)`** — PostgreSQL `UUID` has no direct Oracle equivalent; `RAW(16)` is used for every id/foreign key column.
2. **Rewriting dialect-specific logic:** `UPDATE ... FROM` (Postgres-only syntax) → a correlated subquery in V3 (`UPDATE ... SET currency = (SELECT ... WHERE EXISTS ...)`), and → `MERGE INTO` in V4 (backfilling `reversal_of_transaction_id`).
3. **`JSONB` → `JSON`** — Oracle 23ai's native `JSON` type replaces Postgres `JSONB`.
4. **Partial index → equivalent function-based index** — Oracle does not support `CREATE INDEX ... WHERE ...` (partial indexes); replaced by an index on the expression `CASE WHEN published_at IS NULL THEN created_at END`, achieving the same goal (indexing only unpublished rows).
5. **Side finding:** `columnDefinition = "jsonb"` on `OutboxEvent.java` did not need changing for Oracle, because `spring.jpa.hibernate.ddl-auto=validate` does not use `columnDefinition` for actual validation — `@JdbcTypeCode(SqlTypes.JSON)` adapts to the active dialect.

## Consequences

**Positive:**

- 45/45 tests pass on both databases, proving the domain model is truly portable (not just in theory).

**Important finding:**

- Running the tests on Oracle revealed a real bug in the domain model (`Money` did not normalize its scale) — see [ADR-012](/en/adr/ADR-012-money-fixed-scale).

**Trade-offs:**

- Maintaining two migration sets raises long-term maintenance cost — every schema change must now be written twice (once per dialect).

### Related

- [ADR-012](/en/adr/ADR-012-money-fixed-scale) — the bug discovered while running the tests on Oracle in this ADR.
