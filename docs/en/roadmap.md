---
title: Build Roadmap
description: A 3-6 month roadmap for building a Core Banking System and an Interbank Payment Gateway in Java/Spring
---

# Build Roadmap

> This document is the **source of truth** for the whole site — every other page follows it. Goal: build two simulated core banking systems in Java/Spring, based on an in-depth study of banking business processes and the related financial/distributed system design patterns.

## Overview

| | |
|---|---|
| **Duration** | 3–6 months |
| **Structure** | 2 parallel sub-projects, split by domain |
| **Principle** | Read the primary sources first → understand the fundamentals → then code |
| **Deliverables** | 2 GitHub repos + design docs + this documentation (public on VitePress) |

The two banking domains call for quite different design thinking, so they are split into two independent sub-projects instead of one:

- **Sub-project B — Core Banking**: a "state-centric" domain. The focus is data integrity, ACID, the double-entry ledger.
- **Sub-project A — Interbank Payment Gateway**: a "flow-centric" domain. The focus is messaging, orchestration, resilience.

### Overview diagram

<svg width="100%" viewBox="0 0 680 420" role="img">
<title>6-month overview: Core Banking, Payment Gateway, Integration</title>
<desc>Three two-month phases: months 1-2 Core Banking, months 3-4 Payment Gateway, months 5-6 integration and polish.</desc>
<defs>
<marker id="arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M2 1L8 5L2 9" fill="none" stroke="context-stroke" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></marker>
</defs>

<g fill="none" stroke="#0F6E56" stroke-width="0.5">
<rect x="40" y="40" width="180" height="120" rx="12" fill="#E1F5EE"/>
</g>
<text x="130" y="70" text-anchor="middle" dominant-baseline="central" font-size="14" font-weight="500" fill="#085041">Months 1-2</text>
<text x="130" y="92" text-anchor="middle" dominant-baseline="central" font-size="12" fill="#0F6E56">Core Banking</text>
<text x="130" y="112" text-anchor="middle" dominant-baseline="central" font-size="12" fill="#0F6E56">Account, ledger,</text>
<text x="130" y="128" text-anchor="middle" dominant-baseline="central" font-size="12" fill="#0F6E56">transaction service</text>

<line x1="220" y1="100" x2="248" y2="100" stroke="#888780" stroke-width="1.5" marker-end="url(#arrow)"/>

<g fill="none" stroke="#993C1D" stroke-width="0.5">
<rect x="250" y="40" width="180" height="120" rx="12" fill="#FAECE7"/>
</g>
<text x="340" y="70" text-anchor="middle" dominant-baseline="central" font-size="14" font-weight="500" fill="#712B13">Months 3-4</text>
<text x="340" y="92" text-anchor="middle" dominant-baseline="central" font-size="12" fill="#993C1D">Payment Gateway</text>
<text x="340" y="112" text-anchor="middle" dominant-baseline="central" font-size="12" fill="#993C1D">ISO 20022, Saga,</text>
<text x="340" y="128" text-anchor="middle" dominant-baseline="central" font-size="12" fill="#993C1D">EOD batch</text>

<line x1="430" y1="100" x2="458" y2="100" stroke="#888780" stroke-width="1.5" marker-end="url(#arrow)"/>

<g fill="none" stroke="#534AB7" stroke-width="0.5">
<rect x="460" y="40" width="180" height="120" rx="12" fill="#EEEDFE"/>
</g>
<text x="550" y="70" text-anchor="middle" dominant-baseline="central" font-size="14" font-weight="500" fill="#3C3489">Months 5-6</text>
<text x="550" y="92" text-anchor="middle" dominant-baseline="central" font-size="12" fill="#534AB7">Integration</text>
<text x="550" y="112" text-anchor="middle" dominant-baseline="central" font-size="12" fill="#534AB7">Connect both systems,</text>
<text x="550" y="128" text-anchor="middle" dominant-baseline="central" font-size="12" fill="#534AB7">test, docs</text>

<line x1="130" y1="160" x2="130" y2="190" stroke="#888780" stroke-width="1.5" marker-end="url(#arrow)"/>
<line x1="340" y1="160" x2="340" y2="190" stroke="#888780" stroke-width="1.5" marker-end="url(#arrow)"/>
<line x1="550" y1="160" x2="550" y2="190" stroke="#888780" stroke-width="1.5" marker-end="url(#arrow)"/>

<g fill="none" stroke="#5F5E5A" stroke-width="0.5">
<rect x="40" y="192" width="180" height="200" rx="10" fill="#F1EFE8"/>
</g>
<text x="130" y="212" text-anchor="middle" dominant-baseline="central" font-size="14" font-weight="500" fill="#2C2C2A">Weeks 1-2</text>
<text x="130" y="232" text-anchor="middle" dominant-baseline="central" font-size="12" fill="#5F5E5A">Read double-entry,</text>
<text x="130" y="248" text-anchor="middle" dominant-baseline="central" font-size="12" fill="#5F5E5A">JPA, transaction</text>
<text x="130" y="278" text-anchor="middle" dominant-baseline="central" font-size="14" font-weight="500" fill="#2C2C2A">Weeks 3-5</text>
<text x="130" y="298" text-anchor="middle" dominant-baseline="central" font-size="12" fill="#5F5E5A">Build Account,</text>
<text x="130" y="314" text-anchor="middle" dominant-baseline="central" font-size="12" fill="#5F5E5A">Ledger, Transaction</text>
<text x="130" y="344" text-anchor="middle" dominant-baseline="central" font-size="14" font-weight="500" fill="#2C2C2A">Weeks 6-8</text>
<text x="130" y="364" text-anchor="middle" dominant-baseline="central" font-size="12" fill="#5F5E5A">Locking, ADR, tests,</text>
<text x="130" y="380" text-anchor="middle" dominant-baseline="central" font-size="12" fill="#5F5E5A">devlog updates</text>

<g fill="none" stroke="#5F5E5A" stroke-width="0.5">
<rect x="250" y="192" width="180" height="200" rx="10" fill="#F1EFE8"/>
</g>
<text x="340" y="212" text-anchor="middle" dominant-baseline="central" font-size="14" font-weight="500" fill="#2C2C2A">Weeks 9-10</text>
<text x="340" y="232" text-anchor="middle" dominant-baseline="central" font-size="12" fill="#5F5E5A">Read ISO 20022,</text>
<text x="340" y="248" text-anchor="middle" dominant-baseline="central" font-size="12" fill="#5F5E5A">Saga, Spring Batch</text>
<text x="340" y="278" text-anchor="middle" dominant-baseline="central" font-size="14" font-weight="500" fill="#2C2C2A">Weeks 11-14</text>
<text x="340" y="298" text-anchor="middle" dominant-baseline="central" font-size="12" fill="#5F5E5A">Build parsing,</text>
<text x="340" y="314" text-anchor="middle" dominant-baseline="central" font-size="12" fill="#5F5E5A">orchestration</text>
<text x="340" y="344" text-anchor="middle" dominant-baseline="central" font-size="14" font-weight="500" fill="#2C2C2A">Weeks 15-17</text>
<text x="340" y="364" text-anchor="middle" dominant-baseline="central" font-size="12" fill="#5F5E5A">EOD batch, ADR,</text>
<text x="340" y="380" text-anchor="middle" dominant-baseline="central" font-size="12" fill="#5F5E5A">idempotency test</text>

<g fill="none" stroke="#5F5E5A" stroke-width="0.5">
<rect x="460" y="192" width="180" height="200" rx="10" fill="#F1EFE8"/>
</g>
<text x="550" y="212" text-anchor="middle" dominant-baseline="central" font-size="14" font-weight="500" fill="#2C2C2A">Weeks 18-19</text>
<text x="550" y="232" text-anchor="middle" dominant-baseline="central" font-size="12" fill="#5F5E5A">Connect both</text>
<text x="550" y="248" text-anchor="middle" dominant-baseline="central" font-size="12" fill="#5F5E5A">systems, Security</text>
<text x="550" y="278" text-anchor="middle" dominant-baseline="central" font-size="14" font-weight="500" fill="#2C2C2A">Weeks 20-22</text>
<text x="550" y="298" text-anchor="middle" dominant-baseline="central" font-size="12" fill="#5F5E5A">Unit, integration</text>
<text x="550" y="314" text-anchor="middle" dominant-baseline="central" font-size="12" fill="#5F5E5A">tests, full coverage</text>
<text x="550" y="344" text-anchor="middle" dominant-baseline="central" font-size="14" font-weight="500" fill="#2C2C2A">Weeks 23-26</text>
<text x="550" y="364" text-anchor="middle" dominant-baseline="central" font-size="12" fill="#5F5E5A">Finish docs</text>
</svg>

---

## Phase 1 — Months 1–2: Core Banking (Sub-project B) {#phase-1}

Starting here because it is the foundational domain, more approachable for someone with a Spring Boot/JPA background, and it prepares the thinking for the more complex Saga work later.

### Read first
- Double-entry bookkeeping — the principles of double-entry accounting
- Spring Data JPA — query methods, relationships, transaction boundaries
- Transaction management: `@Transactional`, isolation levels, propagation

### Build
- Account Service — create/look up accounts
- Ledger Service — double-entry ledger (each transaction posts balanced Debit/Credit entries)
- Transaction Service — internal transactions, keeping balances consistent

### Deep dive
- ACID and what it really means in a financial system
- Optimistic vs. pessimistic locking — when to use which
- Audit trail design — why banks never "edit" a record, only "add" offsetting records

### DDD refactor — done 2026-09-16 {#ddd-refactor}

Refactored the Core Banking domain layer towards DDD, in 2 consecutive steps on the same day:

- **Money value object** — wraps `BigDecimal` + `Currency`, `add()`/`subtract()` throw `CurrencyMismatchException` on mismatched currencies; `LedgerEntry`/`Account` use `Money`/`Currency` instead of raw `BigDecimal`/`String`, so `LedgerService.validateBalanced()` immediately catches transactions mixing currencies instead of silently adding them up wrong.
- **Transaction aggregate root** — a new `Transaction` entity (implements `Persistable<UUID>`) as the aggregate root for a group of `LedgerEntry`, enforcing Debit = Credit in the domain layer rather than only in the service; plus migration `V4__create_transactions_table.sql` and `TransactionTest`.

Full design decision: [ADR-008](/en/adr/ADR-008-transaction-aggregate-root). Step-by-step log: [Devlog — Phase 1](/en/devlog/phase-1-core-banking#ddd-refactor-money-value-object-and-transaction-aggregate-root).

### Outbox Pattern + Kafka event publishing — done 2026-09-17 {#outbox-kafka}

Notify other systems about `Transaction` events (posted/reversed) via Kafka without the dual-write risk between the DB write and the message send:

- **Outbox Pattern** — `Transaction` raises domain events, `LedgerService` stores them in `outbox_events` in the same DB transaction as the business data; `OutboxEventPublisher` (`@Scheduled`) reads and sends them to Kafka afterwards, making the business write and the event write atomic.
- **Audit/Compliance consumer** — writes one `compliance_records` row per `LedgerEntry`, idempotent via the `processed_events` table (deduplicating Kafka's at-least-once delivery).
- **3 PoC consumers** — Fraud Detection, Notification, Reporting, each with its own `groupId` on the same topic `transaction-posted-topic`, proving the publish/subscribe architecture works for several independent systems.

Full design decision: [ADR-009](/en/adr/ADR-009-outbox-pattern-kafka-event-publishing). Step-by-step log: [Devlog — Phase 1](/en/devlog/phase-1-core-banking#outbox-pattern-kafka-event-publishing).

### Redis cache for account balance — done 2026-09-17 {#redis-cache}

Cache-aside for `AccountService.getBalance()`, without trading away the overdraft invariant guaranteed by pessimistic locking:

- **Cache-aside** — `AccountBalanceCache` (`StringRedisTemplate`) caches the balance per account with a configurable TTL (default 3600s); `withdraw()` always computes directly from the DB via `computeBalanceFromDb()`, never reading the cache when checking the invariant.
- **AFTER_COMMIT invalidation** — `AccountBalanceCacheEvictionListener` evicts the cache via `@TransactionalEventListener(phase = AFTER_COMMIT)`, reusing the `TransactionPostedEvent`/`TransactionReversedEvent` from the Kafka feature, narrowing the race window compared with evicting before commit.

Full design decision: [ADR-010](/en/adr/ADR-010-redis-cache-account-balance). Step-by-step log: [Devlog — Phase 1](/en/devlog/phase-1-core-banking#redis-cache-for-account-balance).

### Oracle dual-profile support — done 2026-09-17 {#oracle-dual-profile}

Proving the system runs on enterprise database infrastructure (Oracle) alongside PostgreSQL, from one codebase:

- **Dual profile** — `db/migration/postgresql/` and `db/migration/oracle/` fully separated (V1-V7 each), Flyway `locations` configured per Spring profile (`application.properties` / `application-oracle.properties`); Oracle Database Free in Docker, port 1522.
- **7 migrations rewritten for the Oracle dialect** — UUID → `RAW(16)`, `UPDATE ... FROM` → correlated subquery / `MERGE INTO`, `JSONB` → `JSON`, partial index → function-based index.
- **Found & fixed a Money bug** — running the tests on Oracle revealed `Money` did not normalize its scale (Oracle `NUMBER` does not keep a fixed scale like Postgres `NUMERIC`); `scale = 2` is now fixed for every currency in `Money.java`.
- **Result:** 45/45 tests pass unchanged on both databases, with no profile-specific test changes.

Full design decisions: [ADR-011](/en/adr/ADR-011-oracle-dual-profile-support) (dual profile), [ADR-012](/en/adr/ADR-012-money-fixed-scale) (Money scale fix). Step-by-step log: [Devlog — Phase 1](/en/devlog/phase-1-core-banking#oracle-dual-profile-money-scale-fix).

### Kubernetes deployment — done 2026-09-17 {#kubernetes-deployment}

Verifying pessimistic locking (against overdraft) holds with several application instances in parallel, through a real K8s deployment:

- **REST controller** — added `AccountController` (there was no HTTP endpoint before), required to verify locking across several Pods (separate JVMs) instead of calling the service in-process like the existing tests.
- **Dockerfile + Kafka listener fix** — multi-stage build; a second Kafka listener (`PLAINTEXT_HOST`, via `host.docker.internal`) because `localhost` inside a container is not the host.
- **K8s deployment** — `Namespace`/`ConfigMap`/`Secret`/`Deployment`/`Service` (`NodePort`) on Docker Desktop Kubernetes, with the data layer (Postgres/Oracle/Kafka/Redis) still in docker-compose outside the cluster.
- **Experimental verification:** scaled to 3 replicas and fired 5 concurrent `withdraw` requests — 1 succeeded, 4 were rejected with HTTP 409, and `kubectl logs` confirmed the requests really spread across all 3 Pods (not routed to one place by chance).

Full design decision: [ADR-013](/en/adr/ADR-013-kubernetes-deployment). Step-by-step log: [Devlog — Phase 1](/en/devlog/phase-1-core-banking#kubernetes-deployment).

---

## Phase 2 — Months 3–4: Interbank Payment Gateway (Sub-project A) {#phase-2}

### Read first
- ISO 20022 message structure — `pain.001` (customer credit transfer initiation), `pacs.008` (interbank credit transfer)
- Saga pattern — orchestration vs. choreography
- Spring State Machine / Spring Batch docs

### Build
- Message parsing & validation for pain.001 / pacs.008
- Saga orchestration for the interbank payment flow
- End-of-day (EOD) batch settlement with Spring Batch
- Exception/ops handling — failed transactions, retry, dead-letter

### Deep dive
- The distributed transaction problem — why 2PC does not fit large-scale distributed systems
- Compensating transactions — how "undo" in a distributed system differs from a normal rollback
- Idempotency — why a message sent twice must never create two transactions

---

## Phase 3 — Months 5–6: Integration & polish {#phase-3}

- Connect the 2 sub-projects: the Payment Gateway calls Core Banking to update real balances
- Add Spring Security to the APIs (authentication/authorization)
- Thorough testing: unit tests + integration tests
- Write the README / design docs — explaining the architecture decisions
- Summarize the reasoning behind the main architecture decisions: why Saga instead of 2PC, why a double-entry ledger, why two separate sub-projects...

---

## Learning method

- **Learn first, code second**: every major module starts by reading the primary sources (Spring docs, the ISO 20022 spec) — not to "know about" them, but to understand why things are designed that way.
- **Handwritten notes in parallel**: a notebook split into two parts —
  - *Concepts learned*: general knowledge, reusable later
  - *Project log*: architecture decisions, problems met, how they were solved — the raw material for the design docs
- **Depth over speed**: the 3–6 month timeline is an estimate, not a hard deadline.

---

## Progress log

> This section is updated over time as each phase is implemented. Per-phase details are in the [Devlog](/en/devlog/).

- [x] Phase 1: Core Banking
- [ ] Phase 2: Interbank Payment Gateway
- [ ] Phase 3: Integration & polish
