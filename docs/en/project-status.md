---
title: Project Status
description: What the Core Banking System can do today, described in non-technical business terms
---

# Project Status

> This page summarizes what the Core Banking System already does, described as **business capabilities** rather than technical jargon — for readers without a deep technical background. It reflects actual progress at the time of the update, not plans. Technical details are in the [Devlog](/en/devlog/) and the [ADRs](/en/adr/).

| Business capability | Status | Value delivered |
|---|---|---|
| Customer account management | <span class="status-badge done">Done</span> | The system can open and track customer accounts |
| Accurate recording of financial transactions | <span class="status-badge done">Done</span> | Every transaction is recorded with double-entry bookkeeping — money in and out always balances, figures cannot drift |
| Multi-currency data integrity | <span class="status-badge done">Done</span> | The system automatically prevents mixing currencies within one transaction, avoiding serious financial errors |
| Transactions handled as complete business units | <span class="status-badge done">Done</span> | Each transaction is processed as a single unit and must balance before it is accepted |
| Real-time account balance | <span class="status-badge done">Done</span> | Customers always see an accurate balance at any moment |
| Fraud-safe concurrent withdrawals | <span class="status-badge done">Done</span> | Two withdrawals hitting the same account at the same time cannot corrupt the balance |
| Real-time transaction event notifications | <span class="status-badge done">Done</span> | Other departments are notified as soon as a transaction is posted or reversed, without slowing down the main transaction |
| Audit & compliance data capture | <span class="status-badge done">Done</span> | Every transaction is automatically copied in detail to separate storage for inspection and audit, without querying the transactional system directly |
| Fast balance queries under many concurrent users | <span class="status-badge done">Done</span> | Balance results are cached for faster responses, and the cache is refreshed as soon as a new transaction happens, so stale figures are never shown |
| Runs on enterprise database infrastructure | <span class="status-badge done">Done</span> | Designed to run on the two database platforms most common in banking, proven by the automated test suite passing on both |
| Automated, scalable, load-tolerant deployment | <span class="status-badge done">Done</span> | Verified to work correctly with several copies running in parallel — no financial errors even with many concurrent transactions |
| Change history & transaction reversal | <span class="status-badge wip">Partial</span> | The core already records who created each transaction and supports symmetric reversal; not yet exposed through the API |
| High transaction volume without slowing down | <span class="status-badge todo">Not started</span> | Will move heavy work to background processing so the system stays responsive during traffic spikes |

<small>Last updated from the 2026-09-17 commits: the Account/Ledger/Transaction foundation is complete with automated tests, plus the Money value object (safe multi-currency, normalized scale throughout), the Transaction aggregate root (Debit = Credit enforced in the domain layer), Outbox Pattern + Kafka event publishing (transaction events for Audit/Compliance, Fraud Detection, Notification, Reporting), a Redis cache for balance queries (invalidated as soon as a new transaction happens), dual PostgreSQL/Oracle support (45/45 tests passing on both), and Kubernetes deployment (pessimistic locking holds across 3 parallel Pods). The remaining advanced capability (asynchronous processing of high transaction volumes) is planned but not started.</small>
