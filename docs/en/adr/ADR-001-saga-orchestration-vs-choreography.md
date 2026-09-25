# ADR-001: Saga Orchestration vs Choreography for Interbank Transactions

## 1. Problem

An interbank transfer consists of several independent steps running on different services (Payment Gateway, Core Banking, external counterparties):

1. Hold the funds in the sending bank's Core Banking.
2. Send an ISO 20022 message (`pacs.008`) to the receiving side.
3. Wait for the status response (`pacs.002`) from the receiving bank.
4. Debit for real on success, or release the hold if rejected.

2PC (Two-Phase Commit) is not an option: the participants are different systems that share no transaction manager and cannot accept resources locked across the network for long. A Saga is needed — but which style: **Choreography** (each service listens to events and decides the next step itself) or **Orchestration** (a central component coordinates and commands each step)?

## 2. Choice

**Saga Orchestration**: an Orchestrator holds the transaction's state machine, actively calls each participant and decides the compensating steps on failure.

## 3. Rationale

- **Observability & audit**: a single query tells which step a transaction is in — important in banking, where operations teams constantly investigate transaction status.
- **Explicit compensation**: when a step fails, the Orchestrator knows exactly which compensation to call (e.g. `RELEASE_HOLD`) instead of inferring it from events scattered across services.
- **Centralized timeout control**: one place manages the response timers, making a consistent retry/timeout policy easy.

## 4. Trade-offs

- The Orchestrator can become a bottleneck or a single point of failure if not designed carefully.
- Less loose coupling than Choreography — services must "know" and follow the Orchestrator's commands instead of being fully independent.
- Planned mitigation: keep the Orchestrator stateless (state machine persisted in the DB, not in process memory) so several instances can run in parallel without losing state when one dies.
