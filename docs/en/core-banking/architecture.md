# Double-Entry Ledger Architecture & Data Model

> **[Implemented]** — described from the actual code and migrations (Flyway V1–V7). The reasoning behind each decision is in the linked [ADRs](/en/adr/).

## 1. Write path of a transaction

<svg class="diagram" viewBox="0 0 680 660" role="img" aria-labelledby="cb-flow-en-title cb-flow-en-desc">
<title id="cb-flow-en-title">Write path of a withdrawal in Core Banking</title>
<desc id="cb-flow-en-desc">The request goes through AccountController, AccountService locks the account, LedgerService writes the Transaction, its entries and an outbox event in one DB transaction. After commit the Redis cache is evicted and OutboxEventPublisher sends the event to Kafka for 4 consumers.</desc>
<defs><marker id="cb-flow-en-arr" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path class="arrowhead" d="M2 1L8 5L2 9"/></marker></defs>
<rect class="box" x="160.0" y="16" width="360" height="50" rx="10"/>
<text class="t" x="340.0" y="32.0" text-anchor="middle" dominant-baseline="central">AccountController</text>
<text class="s mono" x="340.0" y="50.0" text-anchor="middle" dominant-baseline="central">POST /accounts/{id}/withdraw</text>
<path class="edge" d="M340 66 L340 92" marker-end="url(#cb-flow-en-arr)"/>
<rect class="box" x="160.0" y="94" width="360" height="68" rx="10"/>
<text class="t" x="340.0" y="110.0" text-anchor="middle" dominant-baseline="central">AccountService.withdraw()</text>
<text class="s" x="340.0" y="128.0" text-anchor="middle" dominant-baseline="central">SELECT … FOR UPDATE (ADR-007)</text>
<text class="s" x="340.0" y="146.0" text-anchor="middle" dominant-baseline="central">balance read from DB, never from cache</text>
<path class="edge" d="M340 162 L340 188" marker-end="url(#cb-flow-en-arr)"/>
<rect class="box" x="160.0" y="190" width="360" height="68" rx="10"/>
<text class="t" x="340.0" y="206.0" text-anchor="middle" dominant-baseline="central">LedgerService</text>
<text class="s" x="340.0" y="224.0" text-anchor="middle" dominant-baseline="central">Transaction.record(): debit = credit (ADR-008)</text>
<text class="s" x="340.0" y="242.0" text-anchor="middle" dominant-baseline="central">pullDomainEvents() → OutboxEvent</text>
<path class="edge" d="M340 258 L340 284" marker-end="url(#cb-flow-en-arr)"/>
<rect class="box-muted" x="140.0" y="286" width="400" height="68" rx="10"/>
<text class="t" x="340.0" y="302.0" text-anchor="middle" dominant-baseline="central">PostgreSQL / Oracle</text>
<text class="s" x="340.0" y="320.0" text-anchor="middle" dominant-baseline="central">transactions · ledger_entries · outbox_events</text>
<text class="s" x="340.0" y="338.0" text-anchor="middle" dominant-baseline="central">written in ONE DB transaction (ADR-009)</text>
<text class="lbl" x="340" y="378" text-anchor="middle" dominant-baseline="central">COMMIT</text>
<path class="edge" d="M340 354 L340 366"/>
<path class="edge" d="M340 390 L340 400 L170 400 L170 424" marker-end="url(#cb-flow-en-arr)"/>
<path class="edge" d="M340 400 L510 400 L510 424" marker-end="url(#cb-flow-en-arr)"/>
<rect class="box" x="30" y="426" width="280" height="60" rx="10"/>
<text class="t" x="170.0" y="447.0" text-anchor="middle" dominant-baseline="central">Evict balance cache</text>
<text class="s" x="170.0" y="465.0" text-anchor="middle" dominant-baseline="central">Redis · AFTER_COMMIT (ADR-010)</text>
<rect class="box" x="370" y="426" width="280" height="60" rx="10"/>
<text class="t" x="510.0" y="447.0" text-anchor="middle" dominant-baseline="central">OutboxEventPublisher</text>
<text class="s" x="510.0" y="465.0" text-anchor="middle" dominant-baseline="central">@Scheduled, every 5s</text>
<path class="edge" d="M510 486 L510 510" marker-end="url(#cb-flow-en-arr)"/>
<rect class="box-muted" x="370" y="512" width="280" height="50" rx="10"/>
<text class="t" x="510.0" y="528.0" text-anchor="middle" dominant-baseline="central">Kafka</text>
<text class="s mono" x="510.0" y="546.0" text-anchor="middle" dominant-baseline="central">transaction-posted-topic</text>
<path class="edge" d="M510 562 L510 584 L98.0 584 L98.0 598" marker-end="url(#cb-flow-en-arr)"/>
<rect class="box" x="20" y="600" width="156" height="50" rx="10"/>
<text class="t" x="98.0" y="616.0" text-anchor="middle" dominant-baseline="central">Audit/Compliance</text>
<text class="s" x="98.0" y="634.0" text-anchor="middle" dominant-baseline="central">idempotent</text>
<path class="edge dashed" d="M510 562 L510 584 L260.0 584 L260.0 598" marker-end="url(#cb-flow-en-arr)"/>
<rect class="box-muted" x="182" y="600" width="156" height="50" rx="10"/>
<text class="t" x="260.0" y="616.0" text-anchor="middle" dominant-baseline="central">Fraud Detection</text>
<text class="s" x="260.0" y="634.0" text-anchor="middle" dominant-baseline="central">PoC</text>
<path class="edge dashed" d="M510 562 L510 584 L422.0 584 L422.0 598" marker-end="url(#cb-flow-en-arr)"/>
<rect class="box-muted" x="344" y="600" width="156" height="50" rx="10"/>
<text class="t" x="422.0" y="616.0" text-anchor="middle" dominant-baseline="central">Notification</text>
<text class="s" x="422.0" y="634.0" text-anchor="middle" dominant-baseline="central">PoC</text>
<path class="edge dashed" d="M510 562 L510 584 L584.0 584 L584.0 598" marker-end="url(#cb-flow-en-arr)"/>
<rect class="box-muted" x="506" y="600" width="156" height="50" rx="10"/>
<text class="t" x="584.0" y="616.0" text-anchor="middle" dominant-baseline="central">Reporting</text>
<text class="s" x="584.0" y="634.0" text-anchor="middle" dominant-baseline="central">PoC</text>
</svg>

---

## 2. Data model

<svg class="diagram" viewBox="0 0 680 470" role="img" aria-labelledby="cb-er-en-title cb-er-en-desc">
<title id="cb-er-en-title">Core Banking data model</title>
<desc id="cb-er-en-desc">A transaction has many ledger_entries, each ledger_entry belongs to one account. A reversal transaction points to the original. The event tables are outbox_events, processed_events and compliance_records.</desc>
<defs><marker id="cb-er-en-arr" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path class="arrowhead" d="M2 1L8 5L2 9"/></marker></defs>
<rect class="box" x="20" y="20" width="200" height="122" rx="12"/>
<text class="t mono" x="120.0" y="37" text-anchor="middle" dominant-baseline="central">transactions</text>
<path class="edge" d="M20 54 L220 54"/>
<text class="s mono" x="32" y="66" text-anchor="start" dominant-baseline="central">id  PK</text>
<text class="s mono" x="32" y="86" text-anchor="start" dominant-baseline="central">created_by</text>
<text class="s mono" x="32" y="106" text-anchor="start" dominant-baseline="central">reversal_of_</text>
<text class="s mono" x="32" y="126" text-anchor="start" dominant-baseline="central">  transaction_id  FK</text>
<rect class="box" x="250" y="20" width="200" height="182" rx="12"/>
<text class="t mono" x="350.0" y="37" text-anchor="middle" dominant-baseline="central">ledger_entries</text>
<path class="edge" d="M250 54 L450 54"/>
<text class="s mono" x="262" y="66" text-anchor="start" dominant-baseline="central">id  PK</text>
<text class="s mono" x="262" y="86" text-anchor="start" dominant-baseline="central">transaction_id  FK</text>
<text class="s mono" x="262" y="106" text-anchor="start" dominant-baseline="central">account_id  FK</text>
<text class="s mono" x="262" y="126" text-anchor="start" dominant-baseline="central">entry_type</text>
<text class="s mono" x="262" y="146" text-anchor="start" dominant-baseline="central">amount</text>
<text class="s mono" x="262" y="166" text-anchor="start" dominant-baseline="central">currency</text>
<text class="s mono" x="262" y="186" text-anchor="start" dominant-baseline="central">created_at</text>
<rect class="box" x="480" y="20" width="180" height="184" rx="12"/>
<text class="t mono" x="570.0" y="37" text-anchor="middle" dominant-baseline="central">accounts</text>
<path class="edge" d="M480 54 L660 54"/>
<text class="s mono" x="492" y="66" text-anchor="start" dominant-baseline="central">id  PK</text>
<text class="s mono" x="492" y="86" text-anchor="start" dominant-baseline="central">account_number</text>
<text class="s mono" x="492" y="106" text-anchor="start" dominant-baseline="central">account_type</text>
<text class="s mono" x="492" y="126" text-anchor="start" dominant-baseline="central">currency</text>
<text class="s mono" x="492" y="146" text-anchor="start" dominant-baseline="central">status</text>
<text class="s mono" x="492" y="166" text-anchor="start" dominant-baseline="central">created_at</text>
<text class="lbl" x="570.0" y="192" text-anchor="middle" dominant-baseline="central">no balance column</text>
<path class="edge" d="M220 70 L248 70" marker-end="url(#cb-er-en-arr)"/>
<text class="lbl" x="226" y="58" text-anchor="middle" dominant-baseline="central">1</text>
<text class="lbl" x="242" y="58" text-anchor="middle" dominant-baseline="central">N</text>
<path class="edge" d="M450 110 L478 110" marker-end="url(#cb-er-en-arr)"/>
<text class="lbl" x="456" y="98" text-anchor="middle" dominant-baseline="central">N</text>
<text class="lbl" x="472" y="98" text-anchor="middle" dominant-baseline="central">1</text>
<path class="edge dashed" d="M60 134 L60 160 L180 160 L180 136" marker-end="url(#cb-er-en-arr)"/>
<text class="lbl" x="120" y="174" text-anchor="middle" dominant-baseline="central">reversal</text>
<rect class="box-dashed" x="10" y="262" width="660" height="196" rx="12"/>
<text class="lbl" x="24" y="282" text-anchor="start" dominant-baseline="central">Events &amp; audit (V5–V7)</text>
<rect class="box-muted" x="18" y="300" width="212" height="80" rx="10"/>
<text class="t" x="124.0" y="322.0" text-anchor="middle" dominant-baseline="central">outbox_events</text>
<text class="s" x="124.0" y="340.0" text-anchor="middle" dominant-baseline="central">JSON payload</text>
<text class="s" x="124.0" y="358.0" text-anchor="middle" dominant-baseline="central">published_at: NULL = pending</text>
<rect class="box-muted" x="234" y="300" width="212" height="80" rx="10"/>
<text class="t" x="340.0" y="322.0" text-anchor="middle" dominant-baseline="central">processed_events</text>
<text class="s" x="340.0" y="340.0" text-anchor="middle" dominant-baseline="central">event_id</text>
<text class="s" x="340.0" y="358.0" text-anchor="middle" dominant-baseline="central">deduplication</text>
<rect class="box-muted" x="450" y="300" width="212" height="80" rx="10"/>
<text class="t" x="556.0" y="322.0" text-anchor="middle" dominant-baseline="central">compliance_records</text>
<text class="s" x="556.0" y="340.0" text-anchor="middle" dominant-baseline="central">1 row per LedgerEntry</text>
<text class="s" x="556.0" y="358.0" text-anchor="middle" dominant-baseline="central">written by Audit consumer</text>
<path class="edge dashed" d="M124 380 L124 420 L556 420 L556 382" marker-end="url(#cb-er-en-arr)"/>
<text class="lbl mono" x="340" y="434" text-anchor="middle" dominant-baseline="central">Kafka → AuditComplianceConsumer</text>
</svg>

| Relationship | Cardinality | Meaning |
| :--- | :--- | :--- |
| `transactions` → `ledger_entries` | 1:N | Each transaction has at least 2 balanced Debit/Credit entries |
| `ledger_entries` → `accounts` | N:1 | Each entry belongs to exactly one account (real foreign key in the DB) |
| `transactions` → `transactions` | 0..1 | A reversal points to the original via `reversal_of_transaction_id` |

### Main tables

- **`accounts`** (V1): `id` (UUID), `account_number` (`VARCHAR(20)`, unique), `account_type`, `currency`, `status`, `created_at`.
  - **No `balance` column** — the balance is always derived from the ledger ([ADR-006](/en/adr/ADR-006-derived-balance-vs-stored-balance)).
- **`ledger_entries`** (V1, V3): `id`, `account_id` (FK), `transaction_id`, `entry_type` (`DEBIT`/`CREDIT`, with a CHECK constraint), `amount`, `currency` (added in V3, backfilled from `accounts.currency`), `created_at`.
- **`transactions`** (V4): aggregate root for a group of `LedgerEntry`, with `created_by` and `reversal_of_transaction_id`; backfilled from existing `ledger_entries`.
- **`outbox_events`** (V5): events waiting to be published to Kafka, JSON payload, `published_at` column (indexed only for unpublished rows).
- **`processed_events`** (V6): keyed by `eventId`, makes consumers idempotent under Kafka's at-least-once delivery.
- **`compliance_records`** (V7): one row per `LedgerEntry` — audit needs to know exactly which account was debited/credited.

Migrations come in two sets: `db/migration/postgresql/` and `db/migration/oracle/` ([ADR-011](/en/adr/ADR-011-oracle-dual-profile-support)). On Oracle, UUIDs are stored as `RAW(16)` and `JSONB` becomes `JSON`.

---

## 3. Posting rules

A customer deposit account is a **Liability** of the bank: increases are credits, decreases are debits. Therefore:

```text
balance = SUM(CREDIT) - SUM(DEBIT)
```

Example: customer A withdraws 80.00 VND (the offsetting account is `counterparty`):

| Entry | Account | Side | Amount |
| :--- | :--- | :--- | :--- |
| 1 | Customer A | **DEBIT** | 80.00 VND |
| 2 | Counterparty | **CREDIT** | 80.00 VND |

`deposit()` posts the opposite pair (CREDIT the customer, DEBIT the counterparty).

---

## 4. Where each invariant lives

| Invariant | Enforced by |
| :--- | :--- |
| Total Debit = total Credit | `Transaction.record()` constructor — an unbalanced `Transaction` cannot be created |
| No currency mixing | `Money.add()`/`subtract()` throw `CurrencyMismatchException` |
| Consistent amount scale across databases | `Money` constructor enforces `setScale(2, RoundingMode.UNNECESSARY)` |
| No overdraft under concurrency | Pessimistic lock + balance computed directly from the DB in `withdraw()` |
| Entries are never edited or deleted | Append-only; cancellation via `Transaction.reverse()` |
| No duplicate event processing | `processed_events` table on the consumer side |

Debit/credit totals are compared with `BigDecimal.compareTo()`, not `equals()`, because `equals()` treats `100.0` and `100.00` as different due to scale.
