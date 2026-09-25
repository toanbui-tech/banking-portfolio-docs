# Sub-Project A: Interbank Payment Gateway

> **[Not implemented yet]** — this page describes the target design for [Phase 2](/en/roadmap#phase-2) and will be updated in the [Devlog](/en/devlog/phase-2-payment-gateway) once coding starts.

## 1. Business context & goals

Moving money between different financial institutions (interbank transfer) requires:
- **Standardized messages**: the modern **ISO 20022 XML** standard (`pain.001`, `pacs.008`).
- **Distributed transactions that cannot be rolled back traditionally**: when money has left bank A but bank B does not answer in time, the system must compensate safely (compensating transaction) instead of a plain rollback.
- **End-of-day (EOD) settlement**: grouping the day's transactions for batch processing.

The project acts as an intermediary Payment Hub between the internal Core Banking (Sub-project B) and a simulated (mock) clearing switch.

---

## 2. Planned business flows

### A. Outbound transfer
1. Receive a transfer request with an `Idempotency-Key` to avoid double debits — see [ADR-004](/en/adr/ADR-004-idempotency-duplicate-message-prevention).
2. Send a Hold (reserve funds) command to Core Banking.
3. Generate a `pacs.008` message and send it to the clearing switch (mock).
4. Receive the status response (`pacs.002`-style: Accept/Reject) and continue or compensate via the Saga — see [ADR-001](/en/adr/ADR-001-saga-orchestration-vs-choreography).

### B. Inbound transfer
1. Receive a `pacs.008` message from the counterparty (mock).
2. Parse and validate it against the ISO 20022 XML Schema (XSD).
3. Check the beneficiary account in Core Banking and credit it.
4. Respond with the processing status.

### C. End-of-day settlement
- A Spring Batch job processes the day's transactions in a chunk-oriented way — see [ADR-005](/en/adr/ADR-005-spring-batch-chunk-vs-tasklet-eod).
- Failed transactions move to a dedicated state for retry/manual handling (exception/ops handling) instead of breaking the whole batch.
