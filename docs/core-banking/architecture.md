# Kiến trúc Double-Entry Ledger & Data Model

> **[Đã triển khai]** — mô tả theo code và migration thực tế (Flyway V1–V7). Lý do đằng sau từng quyết định xem tại các [ADR](/adr/) được dẫn link.

## 1. Luồng ghi một giao dịch

```text
AccountController (REST)
        │
        ▼
AccountService.withdraw()  ── SELECT ... FOR UPDATE trên Account (ADR-007)
        │                     kiểm tra đủ số dư, tính thẳng từ DB (không qua cache)
        ▼
LedgerService
        │  Transaction.record(entries, createdBy)   ← validate Nợ = Có (ADR-008)
        │  save(Transaction) → cascade LedgerEntry
        │  pullDomainEvents() → lưu OutboxEvent      ← cùng 1 DB transaction (ADR-009)
        ▼
COMMIT
        ├──► AFTER_COMMIT: evict cache balance trên Redis (ADR-010)
        └──► OutboxEventPublisher (@Scheduled) → Kafka `transaction-posted-topic`
                 ├── AuditComplianceConsumer  (idempotent, ghi compliance_records)
                 ├── FraudDetectionConsumer   (PoC)
                 ├── NotificationConsumer     (PoC)
                 └── ReportingConsumer        (PoC)
```

---

## 2. Mô hình dữ liệu

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
