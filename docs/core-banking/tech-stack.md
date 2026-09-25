# Công nghệ & Xử lý Concurrency

> **[Đã triển khai]** — mô tả theo code thực tế của Giai đoạn 1. Nhật ký từng bước: [Devlog — Giai đoạn 1](/devlog/phase-1-core-banking).

## 1. Tech stack

| Nhóm | Công nghệ | Ghi chú |
| :--- | :--- | :--- |
| Ngôn ngữ & framework | Java 17, Spring Boot 4.1.1, Spring Data JPA (Hibernate), Maven | Spring Boot 4 dùng Jackson 3 (`tools.jackson.*`) |
| Cơ sở dữ liệu | PostgreSQL 15 (mặc định), Oracle Database Free 23 (profile `oracle`) | Migration bằng Flyway, 2 bộ theo vendor |
| Messaging | Apache Kafka (`spring-boot-starter-kafka`) | Outbox Pattern, 4 consumer group |
| Cache | Redis 7 (`spring-boot-starter-data-redis`) | Cache-aside cho số dư |
| Test | JUnit 5, Testcontainers 2.x (Kafka, Redis) | Postgres/Oracle chạy qua docker-compose |
| Triển khai | Docker (multi-stage), Kubernetes (Docker Desktop), Spring Boot Actuator | 3 replicas, startup/liveness/readiness probe |

---

## 2. Chống race condition khi rút tiền

Bài toán thực tế là **check-then-act**: 2 request cùng đọc thấy "đủ tiền", cùng rút, và tài khoản bị âm. Vì `Account` không có cột `balance` để ghi đè, Optimistic Locking (`@Version`) không phát hiện được xung đột này — lý do chọn Pessimistic Locking được ghi tại [ADR-007](/adr/ADR-007-pessimistic-locking-withdraw).

```java
// Rút gọn để minh họa
public interface AccountRepository extends JpaRepository<Account, UUID> {

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT a FROM Account a WHERE a.id = :id")
    Optional<Account> findByIdForUpdate(@Param("id") UUID id);
}
```

Trong `AccountService.withdraw()`:
1. Khóa dòng `Account` bằng `findByIdForUpdate()` — trên Postgres sinh `SELECT ... FOR NO KEY UPDATE`.
2. Tính số dư **thẳng từ DB** (`computeBalanceFromDb()`), không đọc Redis — cache có thể cũ và làm vô hiệu hóa lock ([ADR-010](/adr/ADR-010-redis-cache-account-balance)).
3. Nếu không đủ tiền → `IllegalStateException` (REST trả HTTP 409).
4. Ghi cặp bút toán DEBIT/CREDIT qua `LedgerService` trong cùng transaction.

Request thứ hai trên cùng tài khoản phải chờ request thứ nhất commit/rollback. Vì lock nằm ở DB, cơ chế này vẫn đúng khi có nhiều instance ứng dụng — đã kiểm chứng với 3 Pod Kubernetes ([ADR-013](/adr/ADR-013-kubernetes-deployment)).

### Chuyển khoản giữa 2 tài khoản (dự kiến)

Hiện chưa có API chuyển khoản trực tiếp A → B. Khi bổ sung, nguyên tắc **khóa theo thứ tự cố định** ở [ADR-003](/adr/ADR-003-pessimistic-vs-optimistic-locking-hot-accounts) sẽ được áp dụng để tránh deadlock khi 2 luồng khóa chéo nhau (A→B và B→A cùng lúc).

---

## 3. Sự kiện giao dịch & tính nhất quán

- **Outbox Pattern** ([ADR-009](/adr/ADR-009-outbox-pattern-kafka-event-publishing)): sự kiện `TransactionPostedEvent`/`TransactionReversedEvent` được lưu vào `outbox_events` trong cùng DB transaction với bút toán, `OutboxEventPublisher` (`@Scheduled`, 5s/lần) gửi lên Kafka sau. Không có trường hợp "ghi DB thành công nhưng mất event".
- **Idempotent consumer**: Kafka chỉ đảm bảo at-least-once, nên `AuditComplianceConsumer` bỏ qua `eventId` đã có trong `processed_events`.
- **Cache invalidation**: cùng domain event đó được publish như Spring `ApplicationEvent` nội bộ; `@TransactionalEventListener(phase = AFTER_COMMIT)` evict cache số dư sau khi commit.

---

## 4. Audit trail

Theo nguyên tắc double-entry bất biến ([ADR-002](/adr/ADR-002-double-entry-ledger-immutable-pattern)), mọi thay đổi số dư đều để lại vết qua chính các bút toán trong sổ cái. Hủy giao dịch = tạo giao dịch hoàn tác qua `Transaction.reverse()`, lưu liên kết `reversal_of_transaction_id` về giao dịch gốc. Mỗi giao dịch ghi `created_by`, và `compliance_records` lưu bản sao chi tiết từng bút toán cho mục đích kiểm toán.
