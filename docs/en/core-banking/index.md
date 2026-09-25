# Sub-Project B: Core Banking System

> **[Done — Phase 1]** — this page describes the system as implemented and covered by automated tests. Step-by-step log: [Devlog — Phase 1](/en/devlog/phase-1-core-banking).

## 1. Business context & goals

At the heart of every bank is the **Core Banking Ledger** — the source of truth for the balances of customer and internal accounts.

Design principles taken from real banking practice:
1. **Never store or `UPDATE` a balance directly**: the balance is derived from double-entry ledger entries (`SUM(CREDIT) - SUM(DEBIT)`) — see [ADR-006](/en/adr/ADR-006-derived-balance-vs-stored-balance).
2. **Total Debit always equals total Credit** for every transaction — enforced inside the `Transaction` aggregate root, see [ADR-008](/en/adr/ADR-008-transaction-aggregate-root).
3. **Immutable (append-only)**: posted entries are never edited or deleted. A transaction is cancelled by posting a reversal (`Transaction.reverse()`) — see [ADR-002](/en/adr/ADR-002-double-entry-ledger-immutable-pattern).

Goal: a Core Ledger Engine that keeps data consistent under many concurrent transactions on the same account — including when the application runs as several instances.

---

## 2. What has been built

| Component | Role | Related decision |
| :--- | :--- | :--- |
| `Account` / `AccountService` | Create accounts, derive balance from the ledger, `deposit()` / `withdraw()` | [ADR-006](/en/adr/ADR-006-derived-balance-vs-stored-balance) |
| `Transaction` (aggregate root) + `LedgerEntry` | Double-entry posting, Debit = Credit invariant, symmetric reversal | [ADR-002](/en/adr/ADR-002-double-entry-ledger-immutable-pattern), [ADR-008](/en/adr/ADR-008-transaction-aggregate-root) |
| `Money` value object | Wraps `BigDecimal` + `Currency`, blocks currency mixing, fixed scale = 2 | [ADR-012](/en/adr/ADR-012-money-fixed-scale) |
| Pessimistic locking | `SELECT ... FOR UPDATE` in `withdraw()`, prevents overdraft on concurrent withdrawals | [ADR-007](/en/adr/ADR-007-pessimistic-locking-withdraw) |
| Outbox Pattern + Kafka | Publishes transaction events to Audit/Compliance, Fraud Detection, Notification, Reporting without dual writes | [ADR-009](/en/adr/ADR-009-outbox-pattern-kafka-event-publishing) |
| Redis cache-aside | Caches `getBalance()`, evicts after `AFTER_COMMIT`; `withdraw()` always reads the DB | [ADR-010](/en/adr/ADR-010-redis-cache-account-balance) |
| PostgreSQL + Oracle | 2 Spring profiles, 2 Flyway migration sets, 45/45 tests pass on both | [ADR-011](/en/adr/ADR-011-oracle-dual-profile-support) |
| REST API + Kubernetes | `AccountController`, 3 replicas, locking verified across real Pods | [ADR-013](/en/adr/ADR-013-kubernetes-deployment) |

---

## 3. Verification results

- **45/45 tests pass** on both PostgreSQL and Oracle, with no profile-specific test changes.
- **Concurrent overdraft protection** proven at two levels: a 2-thread test in one JVM, and 5 concurrent HTTP requests spread across 3 Kubernetes Pods (1 succeeds, 4 rejected with HTTP 409, final balance correct).
- **Integration tests against real infrastructure** (Kafka and Redis via Testcontainers; Postgres/Oracle via docker-compose) — core components are not mocked.

---

## 4. Not yet implemented

- Tracking who performed a change and a reversal workflow at the API level (currently only in the domain layer via `Transaction.reverse()`).
- Asynchronous processing for high transaction volumes.
- A distributed lock for `OutboxEventPublisher` when running several Pods (known limitation, see [ADR-013](/en/adr/ADR-013-kubernetes-deployment)).

Next: [Architecture & Data Model](/en/core-banking/architecture) · [Tech Stack & Concurrency](/en/core-banking/tech-stack) · [Running & Testing](/en/core-banking/run-guide) · [Lessons Learned](/en/core-banking/lessons-learned)
