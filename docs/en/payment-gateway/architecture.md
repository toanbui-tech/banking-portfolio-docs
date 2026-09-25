# System Architecture & ISO 20022

> **[Not implemented yet]** — this is the target design and will be adjusted once real coding starts.

## 1. Saga Orchestration flow (outbound transfer)

Why Orchestration was chosen over Choreography: [ADR-001](/en/adr/ADR-001-saga-orchestration-vs-choreography).

1. The client sends `POST /api/v1/transfers` with an `Idempotency-Key` header.
2. The Payment Gateway API stores a `PaymentOrder` in state `PENDING` and hands it to the Saga Orchestrator.
3. **Step `HOLD_BALANCE`**: the Orchestrator asks Core Banking to hold the funds; with the hold reference returned, `PaymentOrder` moves to `HELD`.
4. **Step `DISPATCH_ISO20022`**: the Orchestrator generates a `pacs.008` message and sends it to the clearing switch (mock).
5. **Step `RECEIVE`**: the Orchestrator receives the status from the switch, then branches:
   - Success: call Core Banking `COMMIT_HOLD` → `PaymentOrder` becomes `COMPLETED`.
   - Failure: call Core Banking `RELEASE_HOLD` → `PaymentOrder` becomes `REJECTED` and the sender is notified.

---

## 2. ISO 20022 message structure (target)

### A. `pain.001` — full name: `pain.001.001.09` (Customer Credit Transfer Initiation)
Initiated by a customer/company and sent to its bank:
- `<GrpHdr>`: message ID, creation time, sender information.
- `<PmtInf>`: payment batch details, requested execution date.
- `<CdtTrfTxInf>`: debtor (`Dbtr`), creditor (`Cdtr`), amount (`Amt`), remittance information (`RmtInf`).

### B. `pacs.008` — full name: `pacs.008.001.08` (FI to FI Customer Credit Transfer)
Interbank message between two financial institutions:
- `<IntrBkSttlmAmt>`: interbank settlement amount.
- `<InstgAgt>` & `<InstdAgt>`: identifiers of the instructing and instructed banks.
- `<ChargeBearer>`: how fees are allocated.

---

## 3. Idempotency (preventing duplicate orders)

Design rationale: [ADR-004](/en/adr/ADR-004-idempotency-duplicate-message-prevention).

```java
@Transactional
public PaymentResponse initiateTransfer(String idempotencyKey, TransferRequest request) {
    // 1. Check the idempotency record in the DB, in the same transaction as the business data
    Optional<IdempotencyRecord> existing = idempotencyRepo.findByKey(idempotencyKey);
    if (existing.isPresent()) {
        if (existing.get().getStatus() == ProcessingStatus.IN_PROGRESS) {
            throw new ConcurrentTransferException("Transaction is currently being processed.");
        }
        return existing.get().getCachedResponse();
    }

    // 2. Record the key as in progress
    idempotencyRepo.save(new IdempotencyRecord(idempotencyKey, ProcessingStatus.IN_PROGRESS));

    // 3. Start the Saga
    return sagaManager.start(request);
}
```
