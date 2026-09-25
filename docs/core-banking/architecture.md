# Kiến trúc Double-Entry Ledger & Data Model

> **[Đã triển khai]** — mô tả theo code và migration thực tế (Flyway V1–V7). Lý do đằng sau từng quyết định xem tại các [ADR](/adr/) được dẫn link.

## 1. Luồng ghi một giao dịch

<svg class="diagram" viewBox="0 0 680 660" role="img" aria-labelledby="cb-flow-vi-title cb-flow-vi-desc">
<title id="cb-flow-vi-title">Luồng ghi một giao dịch rút tiền trong Core Banking</title>
<desc id="cb-flow-vi-desc">Request đi qua AccountController, AccountService khóa tài khoản, LedgerService ghi Transaction, bút toán và outbox event trong cùng một DB transaction. Sau commit, cache Redis bị evict và OutboxEventPublisher gửi sự kiện lên Kafka cho 4 consumer.</desc>
<defs><marker id="cb-flow-vi-arr" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path class="arrowhead" d="M2 1L8 5L2 9"/></marker></defs>
<rect class="box" x="160.0" y="16" width="360" height="50" rx="10"/>
<text class="t" x="340.0" y="32.0" text-anchor="middle" dominant-baseline="central">AccountController</text>
<text class="s mono" x="340.0" y="50.0" text-anchor="middle" dominant-baseline="central">POST /accounts/{id}/withdraw</text>
<path class="edge" d="M340 66 L340 92" marker-end="url(#cb-flow-vi-arr)"/>
<rect class="box" x="160.0" y="94" width="360" height="68" rx="10"/>
<text class="t" x="340.0" y="110.0" text-anchor="middle" dominant-baseline="central">AccountService.withdraw()</text>
<text class="s" x="340.0" y="128.0" text-anchor="middle" dominant-baseline="central">SELECT … FOR UPDATE (ADR-007)</text>
<text class="s" x="340.0" y="146.0" text-anchor="middle" dominant-baseline="central">số dư tính thẳng từ DB, không qua cache</text>
<path class="edge" d="M340 162 L340 188" marker-end="url(#cb-flow-vi-arr)"/>
<rect class="box" x="160.0" y="190" width="360" height="68" rx="10"/>
<text class="t" x="340.0" y="206.0" text-anchor="middle" dominant-baseline="central">LedgerService</text>
<text class="s" x="340.0" y="224.0" text-anchor="middle" dominant-baseline="central">Transaction.record(): Nợ = Có (ADR-008)</text>
<text class="s" x="340.0" y="242.0" text-anchor="middle" dominant-baseline="central">pullDomainEvents() → OutboxEvent</text>
<path class="edge" d="M340 258 L340 284" marker-end="url(#cb-flow-vi-arr)"/>
<rect class="box-muted" x="140.0" y="286" width="400" height="68" rx="10"/>
<text class="t" x="340.0" y="302.0" text-anchor="middle" dominant-baseline="central">PostgreSQL / Oracle</text>
<text class="s" x="340.0" y="320.0" text-anchor="middle" dominant-baseline="central">transactions · ledger_entries · outbox_events</text>
<text class="s" x="340.0" y="338.0" text-anchor="middle" dominant-baseline="central">ghi trong CÙNG 1 DB transaction (ADR-009)</text>
<text class="lbl" x="340" y="378" text-anchor="middle" dominant-baseline="central">COMMIT</text>
<path class="edge" d="M340 354 L340 366"/>
<path class="edge" d="M340 390 L340 400 L170 400 L170 424" marker-end="url(#cb-flow-vi-arr)"/>
<path class="edge" d="M340 400 L510 400 L510 424" marker-end="url(#cb-flow-vi-arr)"/>
<rect class="box" x="30" y="426" width="280" height="60" rx="10"/>
<text class="t" x="170.0" y="447.0" text-anchor="middle" dominant-baseline="central">Evict cache số dư</text>
<text class="s" x="170.0" y="465.0" text-anchor="middle" dominant-baseline="central">Redis · AFTER_COMMIT (ADR-010)</text>
<rect class="box" x="370" y="426" width="280" height="60" rx="10"/>
<text class="t" x="510.0" y="447.0" text-anchor="middle" dominant-baseline="central">OutboxEventPublisher</text>
<text class="s" x="510.0" y="465.0" text-anchor="middle" dominant-baseline="central">@Scheduled, 5s/lần</text>
<path class="edge" d="M510 486 L510 510" marker-end="url(#cb-flow-vi-arr)"/>
<rect class="box-muted" x="370" y="512" width="280" height="50" rx="10"/>
<text class="t" x="510.0" y="528.0" text-anchor="middle" dominant-baseline="central">Kafka</text>
<text class="s mono" x="510.0" y="546.0" text-anchor="middle" dominant-baseline="central">transaction-posted-topic</text>
<path class="edge" d="M510 562 L510 584 L98.0 584 L98.0 598" marker-end="url(#cb-flow-vi-arr)"/>
<rect class="box" x="20" y="600" width="156" height="50" rx="10"/>
<text class="t" x="98.0" y="616.0" text-anchor="middle" dominant-baseline="central">Audit/Compliance</text>
<text class="s" x="98.0" y="634.0" text-anchor="middle" dominant-baseline="central">idempotent</text>
<path class="edge dashed" d="M510 562 L510 584 L260.0 584 L260.0 598" marker-end="url(#cb-flow-vi-arr)"/>
<rect class="box-muted" x="182" y="600" width="156" height="50" rx="10"/>
<text class="t" x="260.0" y="616.0" text-anchor="middle" dominant-baseline="central">Fraud Detection</text>
<text class="s" x="260.0" y="634.0" text-anchor="middle" dominant-baseline="central">PoC</text>
<path class="edge dashed" d="M510 562 L510 584 L422.0 584 L422.0 598" marker-end="url(#cb-flow-vi-arr)"/>
<rect class="box-muted" x="344" y="600" width="156" height="50" rx="10"/>
<text class="t" x="422.0" y="616.0" text-anchor="middle" dominant-baseline="central">Notification</text>
<text class="s" x="422.0" y="634.0" text-anchor="middle" dominant-baseline="central">PoC</text>
<path class="edge dashed" d="M510 562 L510 584 L584.0 584 L584.0 598" marker-end="url(#cb-flow-vi-arr)"/>
<rect class="box-muted" x="506" y="600" width="156" height="50" rx="10"/>
<text class="t" x="584.0" y="616.0" text-anchor="middle" dominant-baseline="central">Reporting</text>
<text class="s" x="584.0" y="634.0" text-anchor="middle" dominant-baseline="central">PoC</text>
</svg>

---

## 2. Mô hình dữ liệu

<svg class="diagram" viewBox="0 0 680 470" role="img" aria-labelledby="cb-er-vi-title cb-er-vi-desc">
<title id="cb-er-vi-title">Mô hình dữ liệu Core Banking</title>
<desc id="cb-er-vi-desc">Bảng transactions có nhiều ledger_entries, mỗi ledger_entry thuộc một account. Giao dịch hoàn tác trỏ về giao dịch gốc. Nhóm bảng sự kiện gồm outbox_events, processed_events và compliance_records.</desc>
<defs><marker id="cb-er-vi-arr" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path class="arrowhead" d="M2 1L8 5L2 9"/></marker></defs>
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
<text class="lbl" x="570.0" y="192" text-anchor="middle" dominant-baseline="central">không có cột balance</text>
<path class="edge" d="M220 70 L248 70" marker-end="url(#cb-er-vi-arr)"/>
<text class="lbl" x="226" y="58" text-anchor="middle" dominant-baseline="central">1</text>
<text class="lbl" x="242" y="58" text-anchor="middle" dominant-baseline="central">N</text>
<path class="edge" d="M450 110 L478 110" marker-end="url(#cb-er-vi-arr)"/>
<text class="lbl" x="456" y="98" text-anchor="middle" dominant-baseline="central">N</text>
<text class="lbl" x="472" y="98" text-anchor="middle" dominant-baseline="central">1</text>
<path class="edge dashed" d="M60 134 L60 160 L180 160 L180 136" marker-end="url(#cb-er-vi-arr)"/>
<text class="lbl" x="120" y="174" text-anchor="middle" dominant-baseline="central">hoàn tác</text>
<rect class="box-dashed" x="10" y="262" width="660" height="196" rx="12"/>
<text class="lbl" x="24" y="282" text-anchor="start" dominant-baseline="central">Sự kiện &amp; kiểm toán (V5–V7)</text>
<rect class="box-muted" x="18" y="300" width="212" height="80" rx="10"/>
<text class="t" x="124.0" y="322.0" text-anchor="middle" dominant-baseline="central">outbox_events</text>
<text class="s" x="124.0" y="340.0" text-anchor="middle" dominant-baseline="central">payload JSON</text>
<text class="s" x="124.0" y="358.0" text-anchor="middle" dominant-baseline="central">published_at: NULL = chờ</text>
<rect class="box-muted" x="234" y="300" width="212" height="80" rx="10"/>
<text class="t" x="340.0" y="322.0" text-anchor="middle" dominant-baseline="central">processed_events</text>
<text class="s" x="340.0" y="340.0" text-anchor="middle" dominant-baseline="central">event_id</text>
<text class="s" x="340.0" y="358.0" text-anchor="middle" dominant-baseline="central">chống xử lý trùng</text>
<rect class="box-muted" x="450" y="300" width="212" height="80" rx="10"/>
<text class="t" x="556.0" y="322.0" text-anchor="middle" dominant-baseline="central">compliance_records</text>
<text class="s" x="556.0" y="340.0" text-anchor="middle" dominant-baseline="central">1 dòng / LedgerEntry</text>
<text class="s" x="556.0" y="358.0" text-anchor="middle" dominant-baseline="central">ghi bởi Audit consumer</text>
<path class="edge dashed" d="M124 380 L124 420 L556 420 L556 382" marker-end="url(#cb-er-vi-arr)"/>
<text class="lbl mono" x="340" y="434" text-anchor="middle" dominant-baseline="central">Kafka → AuditComplianceConsumer</text>
</svg>

| Quan hệ | Bản chất | Ý nghĩa |
| :--- | :--- | :--- |
| `transactions` → `ledger_entries` | 1:N | Mỗi giao dịch gồm tối thiểu 2 bút toán Nợ/Có cân bằng |
| `ledger_entries` → `accounts` | N:1 | Mỗi bút toán thuộc đúng một tài khoản (khóa ngoại thật ở DB) |
| `transactions` → `transactions` | 0..1 | Giao dịch hoàn tác trỏ về giao dịch gốc qua `reversal_of_transaction_id` |

### Các bảng chính

- **`accounts`** (V1): `id` (UUID), `account_number` (`VARCHAR(20)`, unique), `account_type`, `currency`, `status`, `created_at`.
  - **Không có cột `balance`** — số dư luôn được tính từ ledger ([ADR-006](/adr/ADR-006-derived-balance-vs-stored-balance)).
- **`ledger_entries`** (V1, V3): `id`, `account_id` (FK), `transaction_id`, `entry_type` (`DEBIT`/`CREDIT`, có CHECK constraint), `amount`, `currency` (thêm ở V3, backfill từ `accounts.currency`), `created_at`.
- **`transactions`** (V4): aggregate root của nhóm `LedgerEntry`, gồm `created_by` và `reversal_of_transaction_id`; backfill từ dữ liệu `ledger_entries` cũ.
- **`outbox_events`** (V5): sự kiện chờ publish lên Kafka, payload JSON, cột `published_at` (index chỉ trên các dòng chưa publish).
- **`processed_events`** (V6): khóa theo `eventId`, giúp consumer idempotent trước at-least-once delivery của Kafka.
- **`compliance_records`** (V7): 1 dòng cho mỗi `LedgerEntry` — audit cần biết chính xác tài khoản nào bị ghi Nợ/Có.

Migration được viết thành 2 bộ riêng: `db/migration/postgresql/` và `db/migration/oracle/` ([ADR-011](/adr/ADR-011-oracle-dual-profile-support)). Trên Oracle, UUID lưu dạng `RAW(16)` và `JSONB` đổi thành `JSON`.

---

## 3. Quy tắc định khoản

Tài khoản tiền gửi của khách hàng là **Nợ phải trả (Liability)** của ngân hàng: tăng ghi Có, giảm ghi Nợ. Vì vậy:

```text
balance = SUM(CREDIT) - SUM(DEBIT)
```

Ví dụ khách hàng A rút 80.00 VND (tài khoản đối ứng là `counterparty`):

| Bút toán | Tài khoản | Phân loại | Số tiền |
| :--- | :--- | :--- | :--- |
| 1 | Khách hàng A | **DEBIT** | 80.00 VND |
| 2 | Counterparty | **CREDIT** | 80.00 VND |

`deposit()` ghi cặp bút toán ngược lại (CREDIT cho khách hàng, DEBIT cho đối ứng).

---

## 4. Invariant nằm ở đâu

| Invariant | Nơi bảo đảm |
| :--- | :--- |
| Tổng Nợ = Tổng Có | Hàm dựng `Transaction.record()` — không thể tạo `Transaction` mất cân bằng |
| Không trộn lẫn tiền tệ | `Money.add()`/`subtract()` throw `CurrencyMismatchException` |
| Scale số tiền nhất quán giữa các DB | Constructor `Money` enforce `setScale(2, RoundingMode.UNNECESSARY)` |
| Không rút quá số dư khi đồng thời | Pessimistic lock + tính số dư thẳng từ DB trong `withdraw()` |
| Bút toán không bị sửa/xóa | Append-only; hoàn tác bằng `Transaction.reverse()` |
| Không xử lý trùng sự kiện | Bảng `processed_events` ở consumer |

So sánh tổng Nợ/Có dùng `BigDecimal.compareTo()` chứ không dùng `equals()`, vì `equals()` coi `100.0` và `100.00` là khác nhau do khác scale.
