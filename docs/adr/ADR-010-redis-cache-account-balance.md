# ADR-010: Redis Cache-Aside cho Account Balance, Invalidation sau AFTER_COMMIT

## Context

`AccountService.getBalance()` tính động qua `SUM(CREDIT) - SUM(DEBIT)` toàn bộ `LedgerEntry` mỗi lần gọi (xem [ADR-006](/adr/ADR-006-derived-balance-vs-stored-balance)) — không hiệu quả khi account có nhiều giao dịch. Cần thêm cache để tránh tính toán lại không cần thiết, nhưng phải đảm bảo không phá vỡ invariant Pessimistic Locking chống overdraft đã có ở `withdraw()` (xem [ADR-007](/adr/ADR-007-pessimistic-locking-withdraw)).

## Options Considered — Vị trí cache

Rủi ro nếu cache "mù quáng": `withdraw()` cần kiểm tra đủ số dư bên trong transaction đã lock row của `Account` — nếu bước kiểm tra này đọc từ cache thay vì DB thật, có thể dẫn đến overdraft dù đã lock (cache có thể đang giữ balance cũ, không phản ánh đúng trạng thái tại thời điểm lock).

**Quyết định:** tách `getBalance()` public (có cache, dùng cho đọc thông thường) khỏi một method `private computeBalanceFromDb()` tính thẳng từ DB, chỉ dùng nội bộ trong `withdraw()` — đường kiểm tra invariant không bao giờ đi qua cache.

## Options Considered — Thời điểm Cache Invalidation

### Phương án A — Evict cache trong cùng `@Transactional`, trước khi commit

- Đơn giản hơn (evict ngay tại nơi ghi dữ liệu).
- Nhược điểm: cửa sổ race rộng — một request đọc đồng thời có thể query DB (vẫn thấy balance cũ vì transaction ghi chưa commit) và ghi đè lại balance cũ vào cache ngay sau evict, khiến dữ liệu sai kẹt lại đến hết TTL.

### Phương án B (đã chọn) — `@TransactionalEventListener(phase = AFTER_COMMIT)`

- Evict chỉ chạy sau khi DB transaction commit thành công, thu hẹp đáng kể cửa sổ race so với Phương án A.
- Tái sử dụng `TransactionPostedEvent`/`TransactionReversedEvent` đã có từ tính năng Kafka ([ADR-009](/adr/ADR-009-outbox-pattern-kafka-event-publishing)) — cùng một domain event vừa được `LedgerService` dùng làm nội dung Outbox event (gửi Kafka), vừa được publish như Spring `ApplicationEvent` nội bộ (`applicationEventPublisher.publishEvent(event)`) cho listener trong cùng JVM — không cần tạo event class mới riêng cho việc evict cache.

## Decision

Chọn **cache-aside pattern** với `StringRedisTemplate` (đơn giản, đủ dùng vì chỉ cache một số thập phân dạng chuỗi — `currency` luôn đọc từ `Account`, không cache vì không đổi theo thời gian), TTL cấu hình được qua `application.properties` (`app.cache.balance.ttl-seconds`, mặc định 3600 giây), invalidation qua `AFTER_COMMIT` (Phương án B ở trên).

## Consequences

**Tích cực:**

- Giảm tải truy vấn DB cho đọc số dư thông thường (`getBalance()`).
- Invariant chống overdraft không bị ảnh hưởng — đường kiểm tra trong `withdraw()` luôn tính thẳng từ DB qua `computeBalanceFromDb()`, không đi qua cache (verify bằng test regression + concurrency test cũ vẫn pass).
- Balance không bao giờ stale sau giao dịch mới, nhờ evict ở `AFTER_COMMIT` (verify bằng integration test riêng, `AccountBalanceCacheIntegrationTest`).

**Đánh đổi:**

- Thêm độ phức tạp (event + listener, `AccountBalanceCacheEvictionListener`) so với evict trực tiếp tại nơi ghi dữ liệu — nhưng ưu tiên đúng đắn dữ liệu tài chính hơn đơn giản code.

**Vấn đề kỹ thuật thực tế gặp phải:**

1. **Port 6379 bị chiếm dụng** bởi 1 container Redis khác trên máy dev → đổi host port sang `6380` trong `docker-compose.yml` (tương tự lý do trước đó Postgres phải đổi sang port 5434).
2. **Testcontainers 2.x không có module `testcontainers-redis` riêng** (khác với Kafka có module `testcontainers-kafka` riêng) → dùng `GenericContainer` với image `redis:7-alpine` trực tiếp trong `AccountBalanceCacheIntegrationTest`, vẫn đảm bảo test tích hợp chạy với Redis thật qua Docker.

### Liên quan

- [ADR-006](/adr/ADR-006-derived-balance-vs-stored-balance) — balance tính động từ ledger, lý do gốc khiến `getBalance()` cần cache.
- [ADR-007](/adr/ADR-007-pessimistic-locking-withdraw) — invariant chống overdraft mà cache không được phép phá vỡ.
- [ADR-009](/adr/ADR-009-outbox-pattern-kafka-event-publishing) — nguồn của `TransactionPostedEvent`/`TransactionReversedEvent` được tái sử dụng làm tín hiệu evict cache.
