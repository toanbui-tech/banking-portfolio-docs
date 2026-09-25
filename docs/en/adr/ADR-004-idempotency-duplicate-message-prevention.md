# ADR-004: Idempotency for Transfer Orders

## 1. Problem

In a distributed system, a message or request can be sent several times because of timeouts, network-level retries, or a client automatically resending when it gets no timely answer. For a transfer order, processing the same request twice must never create two debits.

## 2. Choice

Require the client to send a unique `Idempotency-Key` with each transfer order. Before processing, the system looks up the key in a processing-status table; if the key already exists, it returns the previously computed result instead of running the business logic again.

## 3. Rationale

- Puts duplicate protection at the right boundary (the API layer) before the transaction reaches the Saga or Core Banking, instead of handling duplicates scattered across layers.
- Storing the key in the same transaction/DB as the business data makes checking and recording the key atomic with the transaction itself, avoiding a race between two requests with the same key arriving almost simultaneously.
- Returning the exact earlier result (rather than just rejecting the duplicate) lets clients retry safely without special logic on their side.

## 4. Trade-offs

- The idempotency key table needs a cleanup/expiry policy so it does not grow forever.
- The case where a second request arrives while the first is still in progress (no result to return yet) must be handled explicitly — it should be rejected temporarily rather than processed in parallel.
