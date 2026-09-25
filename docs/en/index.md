---
layout: home

hero:
  name: "Banking & Fintech Systems"
  text: "Core Banking & Interbank Payment Gateway"
  tagline: "Two simulated banking infrastructure systems in Java/Spring: a double-entry Core Banking ledger and an ISO 20022 Interbank Payment Gateway"
  actions:
    - theme: brand
      text: "Project status"
      link: /en/project-status
    - theme: alt
      text: "Roadmap"
      link: /en/roadmap
    - theme: alt
      text: "Core Banking System"
      link: /en/core-banking/
    - theme: alt
      text: "Payment Gateway"
      link: /en/payment-gateway/

features:
  - title: Double-Entry Core Ledger
    details: Append-only double-entry ledger that guarantees financial data integrity and handles contention on hot accounts with pessimistic locking.
  - title: Interbank Payment Gateway
    details: Interbank transfers using ISO 20022 (pain.001, pacs.008), distributed transactions coordinated by a Saga Orchestrator, end-of-day settlement with Spring Batch.
  - title: Architecture Decision Records
    details: Architecture decisions written as Problem - Choice - Rationale - Trade-offs, including the real issues met during implementation — 13 ADRs, 9 of them already applied in Core Banking.
  - title: Roadmap & Devlog
    details: A 3–6 month build roadmap and a phase-by-phase development log — updated honestly as work happens, not before.
---

## Overview

These are two simulated core banking systems built with Java/Spring Boot, following a 3–6 month [roadmap](/en/roadmap). Each one focuses on a different class of engineering problems:

1. **Financial data integrity**: an immutable double-entry ledger (append-only) that guarantees Debit = Credit for every transaction and controls contention on hot accounts.
2. **Distributed transactions**: interbank transfers coordinated with Saga Orchestration instead of 2PC, with idempotency and compensating transactions when a step fails.
3. **Financial message standards**: parsing and validating ISO 20022 messages (`pain.001`, `pacs.008`) and batch end-of-day settlement.

**Core Banking System has completed Phase 1** (45/45 tests passing on both PostgreSQL and Oracle, overdraft protection verified across 3 Kubernetes Pods). Payment Gateway is the next phase. Detailed progress: [Project status](/en/project-status) and [Devlog](/en/devlog/).

---

## The two sub-projects

<svg class="diagram" viewBox="0 0 680 280" role="img" aria-labelledby="overview-en-title overview-en-desc">
<title id="overview-en-title">The two sub-projects</title>
<desc id="overview-en-desc">Payment Gateway (Phase 2, not started) will call Core Banking (Phase 1, done) over internal REST with an Idempotency-Key.</desc>
<defs><marker id="overview-en-arr" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path class="arrowhead" d="M2 1L8 5L2 9"/></marker></defs>
<rect class="box-muted" x="20" y="20" width="250" height="240" rx="12"/>
<text class="t" x="145" y="48" text-anchor="middle" dominant-baseline="central">A · Payment Gateway</text>
<text class="lbl" x="145" y="70" text-anchor="middle" dominant-baseline="central">Phase 2 — not started</text>
<path class="edge" d="M36 88 L254 88"/>
<text class="s" x="36" y="116" text-anchor="start" dominant-baseline="central">pain.001 / pacs.008 (ISO 20022)</text>
<text class="s" x="36" y="150" text-anchor="start" dominant-baseline="central">Saga Orchestrator + compensation</text>
<text class="s" x="36" y="184" text-anchor="start" dominant-baseline="central">EOD Settlement (Spring Batch)</text>
<text class="s" x="36" y="218" text-anchor="start" dominant-baseline="central">Retry / dead-letter</text>
<rect class="box" x="410" y="20" width="250" height="240" rx="12"/>
<text class="t" x="535" y="48" text-anchor="middle" dominant-baseline="central">B · Core Banking</text>
<text class="lbl" x="535" y="70" text-anchor="middle" dominant-baseline="central">Phase 1 — done</text>
<path class="edge" d="M426 88 L644 88"/>
<text class="s" x="426" y="116" text-anchor="start" dominant-baseline="central">Double-entry ledger, append-only</text>
<text class="s" x="426" y="150" text-anchor="start" dominant-baseline="central">Pessimistic lock vs. overdraft</text>
<text class="s" x="426" y="184" text-anchor="start" dominant-baseline="central">Outbox + Kafka, Redis cache</text>
<text class="s" x="426" y="218" text-anchor="start" dominant-baseline="central">PostgreSQL / Oracle · K8s</text>
<path class="edge dashed" d="M272 140 L408 140" marker-end="url(#overview-en-arr)"/>
<text class="lbl" x="340" y="112" text-anchor="middle" dominant-baseline="central">internal REST</text>
<text class="lbl mono" x="340" y="126" text-anchor="middle" dominant-baseline="central">+ Idempotency-Key</text>
<text class="lbl" x="340" y="160" text-anchor="middle" dominant-baseline="central">(Phase 3)</text>
</svg>

**Sub-project A: Interbank Payment Gateway**
- Message parsing & validation for `pain.001` / `pacs.008`
- Saga Orchestrator — coordinates and compensates distributed transactions
- EOD Batch Settlement — Spring Batch, chunk-oriented
- Exception/ops handling — retry, dead-letter

Calls Core Banking over internal REST with an `Idempotency-Key` header:

**Sub-project B: Core Banking System**
- Account Service — account management, balance derived from the ledger
- Ledger Service + `Transaction` aggregate root — append-only double-entry ledger, guarantees Debit = Credit
- Concurrency Guard — pessimistic lock (`SELECT ... FOR UPDATE`), verified across 3 K8s Pods
- Outbox Pattern + Kafka, Redis cache, runs on both PostgreSQL and Oracle

The Payment Gateway calls into Core Banking to update real balances (integration happens in [Phase 3](/en/roadmap#phase-3)).

---

## Quick comparison

| Criterion | Sub-project B: Core Banking System | Sub-project A: Payment Gateway |
| :--- | :--- | :--- |
| **Core business** | Account management, double-entry bookkeeping | Interbank transfers, ISO 20022 messages |
| **Hardest problem** | Race conditions & data integrity | Distributed state & failure handling (Saga) |
| **Consistency model** | Strong consistency (ACID + DB locks) | Eventual consistency (Saga Orchestration) |
| **Batch processing** | — | EOD settlement with Spring Batch (chunk-oriented) |
| **Security** | Spring Security (Phase 3) | Spring Security (Phase 3) |
