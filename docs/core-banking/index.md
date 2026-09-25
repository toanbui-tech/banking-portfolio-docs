# Sub-Project B: Core Banking System

> **[Hoàn thành — Giai đoạn 1]** — nội dung dưới đây phản ánh hệ thống đã triển khai và có test tự động. Nhật ký chi tiết từng bước: [Devlog — Giai đoạn 1](/devlog/phase-1-core-banking).

## 1. Bối cảnh & mục tiêu nghiệp vụ

Trái tim của bất kỳ ngân hàng nào là **Core Banking Ledger** — nơi nắm giữ số dư (source of truth) của tài khoản khách hàng và tài khoản nội bộ.

Nguyên tắc thiết kế theo đúng nghiệp vụ ngân hàng:
1. **Không lưu và không `UPDATE` số dư trực tiếp**: số dư được tính từ các bút toán kế toán kép (`SUM(CREDIT) - SUM(DEBIT)`) — xem [ADR-006](/adr/ADR-006-derived-balance-vs-stored-balance).
2. **Tổng Nợ (Debit) luôn bằng Tổng Có (Credit)** trên từng giao dịch — enforce ngay trong `Transaction` aggregate root, xem [ADR-008](/adr/ADR-008-transaction-aggregate-root).
3. **Bất biến (append-only)**: không xóa hoặc sửa bút toán đã ghi. Muốn hủy giao dịch thì tạo giao dịch hoàn tác (`Transaction.reverse()`) — xem [ADR-002](/adr/ADR-002-double-entry-ledger-immutable-pattern).

Mục tiêu: một Core Ledger Engine giữ được tính toàn vẹn dữ liệu khi có nhiều giao dịch đồng thời trên cùng một tài khoản — kể cả khi ứng dụng chạy nhiều instance song song.

---

## 2. Những gì đã xây dựng

| Thành phần | Vai trò | Quyết định liên quan |
| :--- | :--- | :--- |
| `Account` / `AccountService` | Tạo tài khoản, tính số dư động từ ledger, `deposit()` / `withdraw()` | [ADR-006](/adr/ADR-006-derived-balance-vs-stored-balance) |
| `Transaction` (aggregate root) + `LedgerEntry` | Ghi sổ kép, invariant Nợ = Có, hoàn tác đối xứng | [ADR-002](/adr/ADR-002-double-entry-ledger-immutable-pattern), [ADR-008](/adr/ADR-008-transaction-aggregate-root) |
| `Money` value object | Bọc `BigDecimal` + `Currency`, chặn trộn lẫn tiền tệ, scale cố định = 2 | [ADR-012](/adr/ADR-012-money-fixed-scale) |
| Pessimistic Locking | `SELECT ... FOR UPDATE` trong `withdraw()`, chống overdraft khi rút tiền đồng thời | [ADR-007](/adr/ADR-007-pessimistic-locking-withdraw) |
| Outbox Pattern + Kafka | Phát sự kiện giao dịch cho Audit/Compliance, Fraud Detection, Notification, Reporting mà không bị Dual Write | [ADR-009](/adr/ADR-009-outbox-pattern-kafka-event-publishing) |
| Redis cache-aside | Cache `getBalance()`, evict sau `AFTER_COMMIT`; `withdraw()` luôn đọc DB | [ADR-010](/adr/ADR-010-redis-cache-account-balance) |
| PostgreSQL + Oracle | 2 Spring Profile, 2 bộ migration Flyway, 45/45 test pass trên cả hai | [ADR-011](/adr/ADR-011-oracle-dual-profile-support) |
| REST API + Kubernetes | `AccountController`, 3 replicas, verify locking qua nhiều Pod thật | [ADR-013](/adr/ADR-013-kubernetes-deployment) |

---

## 3. Kết quả kiểm chứng

- **45/45 test pass** trên cả PostgreSQL và Oracle, không cần sửa test theo profile.
- **Chống overdraft đồng thời** được chứng minh ở 2 mức: test 2 thread trong cùng JVM, và 5 request HTTP đồng thời phân tán qua 3 Pod Kubernetes (1 thành công, 4 bị từ chối HTTP 409, số dư cuối đúng).
- **Test tích hợp với hạ tầng thật** (Kafka, Redis qua Testcontainers; Postgres/Oracle qua docker-compose) — không mock các thành phần cốt lõi.

---

## 4. Chưa triển khai

- Truy vết người thực hiện & quy trình hoàn tác giao dịch ở tầng API (hiện mới có ở tầng domain qua `Transaction.reverse()`).
- Xử lý bất đồng bộ cho khối lượng giao dịch lớn.
- Lock phân tán cho `OutboxEventPublisher` khi chạy nhiều Pod (giới hạn đã biết, xem [ADR-013](/adr/ADR-013-kubernetes-deployment)).

Xem tiếp: [Kiến trúc & Data Model](/core-banking/architecture) · [Công nghệ & Concurrency](/core-banking/tech-stack) · [Hướng dẫn chạy](/core-banking/run-guide) · [Bài học rút ra](/core-banking/lessons-learned)
