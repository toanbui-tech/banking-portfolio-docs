# ADR-009: Outbox Pattern cho Publish Sự kiện Transaction qua Kafka

## Context

Cần thông báo cho các hệ thống khác khi có `Transaction` mới hoặc bị hoàn tác (reverse), phục vụ 4 mục đích nghiệp vụ: Audit/Compliance, Notification, Fraud Detection, Reporting.

Vấn đề kỹ thuật gốc: kết hợp ghi DB + gửi message Kafka trực tiếp trong cùng flow gây rủi ro **Dual Write** — nếu 1 trong 2 thao tác thất bại (ví dụ lưu DB thành công nhưng gửi Kafka lỗi, hoặc ngược lại), dữ liệu giữa DB và message queue sẽ không đồng bộ, các hệ thống downstream có thể không nhận được event dù giao dịch đã thực sự xảy ra.

## Options Considered

### Phương án A — Gửi Kafka trực tiếp ngay sau khi lưu DB

- **Ưu điểm:** đơn giản, ít thành phần hơn, không cần bảng trung gian hay tiến trình publisher riêng.
- **Nhược điểm:** rủi ro Dual Write như mô tả ở Context — không có cơ chế đảm bảo tính nguyên tử giữa ghi nghiệp vụ và gửi event.

### Phương án B (đã chọn) — Outbox Pattern

Lưu event vào bảng `outbox_events` trong **cùng transaction DB** với dữ liệu nghiệp vụ (`Transaction`/`LedgerEntry`), dùng một tiến trình Publisher riêng (`@Scheduled`) đọc các event chưa publish và gửi lên Kafka sau.

- **Ưu điểm:** ghi event và ghi dữ liệu nghiệp vụ nguyên tử với nhau (cùng 1 DB transaction, cùng commit/rollback) — loại bỏ hoàn toàn rủi ro Dual Write.
- **Nhược điểm:** thêm độ trễ (event chỉ được gửi ở lần chạy `@Scheduled` kế tiếp, không tức thời), thêm bảng + tiến trình publisher cần vận hành/giám sát riêng.

## Quyết định thiết kế con (đã chốt trong quá trình implement)

- **Domain Event pattern:** `Transaction` (aggregate root) tự raise domain event trong `record()` và `reverse()`, expose `pullDomainEvents()` — `LedgerService` pull events sau khi `save()` thành công rồi map sang `OutboxEvent`. Lý do: nhất quán với nguyên tắc DDD đã áp dụng ở [ADR-008](/adr/ADR-008-transaction-aggregate-root) — invariant/logic nghiệp vụ nằm trong Aggregate.
- **Payload self-contained:** gồm `eventId` (riêng biệt với `transactionId`, dùng cho idempotency), `transactionId`, `createdBy`, `occurredAt`, `entries[]`, và `eventType` nhúng trực tiếp vào JSON payload (không dùng Kafka header) để consumer tự đủ thông tin khi debug mà không cần tra thêm header.
- **`compliance_records`: 1 dòng/`LedgerEntry`** (không phải 1 dòng/`Transaction`) — vì Compliance/Audit ngân hàng thật cần biết account cụ thể nào liên quan (debit/credit), không chỉ tổng giá trị giao dịch.
- **Test infra: Testcontainers Kafka** — nhất quán với cách project test Postgres thật qua Docker, không dùng Embedded Kafka.

## Consequences

**Tích cực:**

- Đảm bảo message không bị mất — atomic với DB transaction nhờ Outbox Pattern.
- 4 hệ thống độc lập (Audit sâu + 3 PoC: Fraud Detection, Notification, Reporting) đều nhận được event qua `groupId` riêng biệt (`audit-compliance-group`, `fraud-detection-group`, `notification-group`, `reporting-group`) trên cùng topic `transaction-posted-topic`.
- Audit/Compliance consumer idempotent qua bảng `processed_events`.

**Đánh đổi:**

- Kafka chỉ đảm bảo *at-least-once delivery*, nên bắt buộc phải có Idempotent Consumer ở phía nhận (bảng `processed_events`) — tăng độ phức tạp hệ thống so với gửi trực tiếp.

**Vấn đề kỹ thuật thực tế gặp phải:**

1. **Spring Boot 4.1.1 dùng Jackson 3** (`tools.jackson.*`), không phải Jackson 2 — phải dùng `JacksonJsonSerializer` thay vì `JsonSerializer`, thêm `spring-boot-starter-json` riêng.
2. **Bẫy nghiêm trọng:** Spring Boot chỉ nạp 1 file `application.properties` đầu tiên tìm thấy, không merge main + test — file test riêng ghi đè toàn bộ cấu hình DB/Flyway. Fix bằng `@SpringBootTest(properties = ...)` (inline trong annotation) thay vì file `application-test.properties` riêng.
3. **Phát hiện quan trọng nhất:** raw `spring-kafka` KHÔNG đủ để Spring Boot 4 tự động cấu hình bean `KafkaTemplate` — cần `spring-boot-starter-kafka`. Lỗi bị che giấu suốt Bước 1 vì Publisher luôn bị tắt trong test (`outbox.publisher.enabled=false`), chỉ lộ ra khi viết end-to-end test thật không mock.
4. **Testcontainers 2.x đổi tên artifact** (`testcontainers-kafka` có tiền tố khác so với 1.x), gây lỗi "version is missing" khó hiểu.

### Liên quan

- [ADR-008](/adr/ADR-008-transaction-aggregate-root) — `Transaction` aggregate root là nơi domain event được raise, nền tảng cho Outbox Pattern ở ADR này.
