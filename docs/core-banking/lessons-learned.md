# Thử thách kỹ thuật & Bài học rút ra

> Tổng hợp từ các vấn đề thật gặp phải khi xây dựng [Giai đoạn 1](/devlog/phase-1-core-banking). Mỗi mục ghi: triệu chứng → nguyên nhân gốc → cách xử lý → bài học.

## 1. Lỗi "âm thầm sai": JPA gọi `merge()` thay vì `persist()`

- **Triệu chứng:** `Transaction` lưu được vào DB nhưng các `LedgerEntry` con không được lưu đúng. Không có exception nào.
- **Nguyên nhân:** `Transaction.id` được gán ngay trong constructor (đúng tinh thần DDD — aggregate tự tạo mình ở trạng thái hợp lệ). Spring Data JPA thấy ID khác `null` nên coi đây là entity đã tồn tại, gọi `merge()`, và cascade `PERSIST` không kích hoạt.
- **Xử lý:** `Transaction` implement `Persistable<UUID>`, tự quản lý `isNew()` qua cờ `@Transient`, reset ở `@PostLoad`/`@PostPersist`.
- **Bài học:** hiểu cơ chế persist vs merge quan trọng hơn thuộc cú pháp annotation. Lỗi nguy hiểm nhất là lỗi không ném exception, nên test phải kiểm tra dữ liệu thật sau khi lưu. Chi tiết: [ADR-008](/adr/ADR-008-transaction-aggregate-root).

## 2. Chạy trên DB thứ hai làm lộ bug domain model

- **Triệu chứng:** test pass trên Postgres nhưng fail trên Oracle khi so sánh số tiền.
- **Nguyên nhân:** Oracle `NUMBER` không giữ scale cố định lúc đọc (Postgres `NUMERIC` thì giữ). `Money` chưa tự chuẩn hóa scale, nên trước đó chỉ "đúng nhờ may mắn".
- **Xử lý:** thử theo ISO 4217 (VND = 0 chữ số thập phân) nhưng sẽ phá dữ liệu đã có; chọn cố định `scale = 2` trong constructor `Money` cho mọi currency.
- **Bài học:** portability giữa các DB là một cách test hữu ích. Bug không nằm ở Oracle mà ở giả định ngầm trong code. Chi tiết: [ADR-012](/adr/ADR-012-money-fixed-scale).

## 3. Cache có thể phá vỡ lock

- **Rủi ro:** nếu `withdraw()` đọc số dư từ Redis, pessimistic lock trên `Account` trở nên vô nghĩa, vì cache có thể trả về số dư cũ và dẫn tới overdraft.
- **Xử lý:** tách `getBalance()` (có cache) khỏi `computeBalanceFromDb()` (chỉ dùng trong `withdraw()`); evict cache ở `AFTER_COMMIT` thay vì trước commit.
- **Bài học:** khi thêm một lớp tối ưu, phải xác định trước đường đi nào mang invariant và giữ đường đó không đi qua lớp tối ưu. Chi tiết: [ADR-010](/adr/ADR-010-redis-cache-account-balance).

## 4. Lỗi bị che bởi chính cấu hình test

- **Triệu chứng:** bean `KafkaTemplate` không được tạo, nhưng mọi test vẫn xanh suốt một thời gian.
- **Nguyên nhân:** chỉ có `spring-kafka` là không đủ, Spring Boot 4 cần `spring-boot-starter-kafka`. Lỗi bị che vì `OutboxEventPublisher` luôn tắt trong test (`outbox.publisher.enabled=false`).
- **Xử lý:** thêm starter; viết end-to-end test với Kafka thật qua Testcontainers, không mock.
- **Bài học:** mỗi cờ tắt tính năng trong test là một điểm mù. Cần ít nhất một test end-to-end chạy đúng cấu hình production. Chi tiết: [ADR-009](/adr/ADR-009-outbox-pattern-kafka-event-publishing).

## 5. `application-test.properties` ghi đè thay vì bổ sung

- **Nguyên nhân:** file cấu hình test cùng tên ghi đè toàn bộ cấu hình DB/Flyway của main thay vì merge.
- **Xử lý:** khai báo inline qua `@SpringBootTest(properties = ...)`.

## 6. Chứng minh lock phân tán cần bằng chứng hai lớp

- **Thử thách:** kết quả "1 thành công, 4 bị từ chối" chưa đủ, vì có thể Kubernetes tình cờ route mọi request về cùng một Pod.
- **Xử lý:** log tên Pod (`HOSTNAME`) trong `AccountController`, dùng `kubectl logs --prefix` xác nhận request phân tán qua cả 3 Pod.
- **Bài học:** một thí nghiệm chỉ có giá trị khi loại trừ được giải thích thay thế. Chi tiết: [ADR-013](/adr/ADR-013-kubernetes-deployment).

## 7. Networking trong container

- `localhost` bên trong container là chính container đó. Kafka cần thêm listener thứ hai (`PLAINTEXT_HOST` qua `host.docker.internal:9094`) để Pod kết nối được, trong khi vẫn giữ `9092` cho test chạy trên host.

## 8. Thiết lập môi trường

Bảy lỗi setup ban đầu (Java version, cache Maven hỏng, port Docker, Flyway trên Spring Boot 4, volume Postgres giữ password cũ, timezone `Asia/Saigon`...) được ghi lại đầy đủ tại [Devlog — Thiết lập môi trường](/devlog/phase-1-core-banking#thiết-lập-môi-trường). Điểm chung: Spring Boot 4 và Testcontainers 2.x đổi nhiều tên module/artifact so với bản trước, nên phải đọc release notes thay vì dựa vào hướng dẫn cũ.

---

## Giới hạn đã biết

- `OutboxEventPublisher` chưa có lock phân tán: khi nhiều Pod cùng chạy, 3 consumer PoC có thể log trùng (Audit/Compliance không bị ảnh hưởng vì idempotent).
- `Money` cố định `scale = 2` cần xem lại nếu hỗ trợ currency như JPY (0) hoặc BHD (3).
- Duy trì 2 bộ migration Postgres/Oracle: mọi thay đổi schema phải viết 2 lần.
