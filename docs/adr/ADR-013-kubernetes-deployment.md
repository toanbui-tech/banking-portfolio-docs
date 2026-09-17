# ADR-013: Kubernetes Deployment — Verify Pessimistic Locking qua Nhiều Pod

## Context

Cần chứng minh khả năng triển khai hệ thống trên Kubernetes, đặc biệt verify Pessimistic Locking (chống overdraft, xem [ADR-007](/adr/ADR-007-pessimistic-locking-withdraw)) hoạt động đúng khi có nhiều instance ứng dụng chạy song song (`replicas > 1`).

## Options Considered

### Phạm vi deployment

- **Option A (đã chọn)** — chỉ deploy app Java vào K8s, Postgres/Oracle/Kafka/Redis giữ ở `docker-compose`. Lý do: phần lớn hệ thống thật (kể cả ngân hàng) dùng managed service cho data layer, không tự vận hành StatefulSet phức tạp; toàn bộ kỹ năng cần chứng minh (deployment, probe, service, scale, verify locking phân tán) đạt được đầy đủ chỉ với app trong K8s.
- **Option B** — StatefulSet toàn bộ stack (kể cả DB/Kafka/Redis) vào K8s. Không chọn vì tăng độ phức tạp vận hành không cần thiết cho mục tiêu của ADR này.

### Công cụ K8s local

- **Docker Desktop Kubernetes** (đã chọn) thay vì minikube/kind — vì dùng chung Docker engine/image cache với `docker build`, không cần bước load image riêng vào cluster.

## Decision

Deployment + Service + ConfigMap + Secret + Namespace cho app Java (namespace `core-banking`, 3 replicas, image `core-banking-system:local` với `imagePullPolicy: Never` vì build local không qua registry).

Trước khi deploy được, phải thêm REST Controller (`AccountController`) — trước đó codebase không có endpoint HTTP nào, `AccountService` chỉ được gọi trực tiếp trong cùng JVM qua test. Không có cách nào verify Pessimistic Locking qua nhiều Pod thật nếu không có cổng vào HTTP (nhiều Pod là nhiều JVM/process riêng biệt, không thể gọi thẳng service in-process như test hiện có).

Thêm Actuator (`spring-boot-starter-actuator`) cho liveness/readiness probe. `startupProbe` quan trọng vì app cần thời gian khởi động (kết nối DB/Kafka/Redis) trước khi sẵn sàng nhận traffic — tránh liveness probe giết Pod giữa chừng lúc đang khởi động.

## Vấn đề kỹ thuật thực tế gặp phải

1. **Kafka advertised listener:** `localhost` chỉ đúng khi app chạy trên host, sai khi chạy trong container/Pod (bên trong container, `localhost` là chính nó, không phải máy host). Fix bằng cách thêm listener thứ 2 (`PLAINTEXT_HOST`, advertise qua `host.docker.internal`, port riêng 9094) chạy song song với listener cũ (`PLAINTEXT`, port 9092, vẫn dùng cho process chạy trực tiếp trên host như `mvn spring-boot:run`/test suite).
2. **Dockerfile dùng image Maven chính thức pin version** thay vì `./mvnw` — vì `maven-wrapper.jar` bị gitignore, tránh phụ thuộc file không có sẵn khi build từ git clone sạch.

## Verify thực nghiệm (quan trọng nhất của ADR này)

Scale 3 replicas, bắn 5 request `withdraw` đồng thời (đủ tiền cho đúng 1 request thành công) qua Service — verify 2 lớp bằng chứng tách biệt:

- **(a) Kết quả nghiệp vụ đúng:** 1 request thành công, 4 request bị từ chối với HTTP 409 (`IllegalStateException` → `CONFLICT`), balance cuối cùng chính xác, không âm, không trừ lặp.
- **(b) Request thực sự phân tán qua CẢ 3 Pod khác nhau** — xác nhận qua `kubectl logs --prefix`, log gắn tên Pod cụ thể (`AccountController` đọc `HOSTNAME` — biến môi trường K8s tự set bằng tên Pod — để log rõ Pod nào xử lý request nào). Bao gồm trường hợp 1 Pod nhận 2 request cùng lúc và tự serialize đúng. Đây là bằng chứng cho thấy cơ chế lock nằm ở DB (độc lập với Pod/JVM gọi vào), không phải do K8s tình cờ route hết request về 1 chỗ.

## Consequences

**Tích cực:**

- Bằng chứng thực nghiệm (không chỉ suy luận lý thuyết) cho thấy invariant chống overdraft giữ vững ở quy mô hệ thống phân tán nhiều instance.

**Giới hạn đã biết (known limitation, không phải bug ẩn):**

- `OutboxEventPublisher` không có lock phân tán khi nhiều Pod cùng chạy `@Scheduled` — 3 consumer PoC (Notification/Fraud Detection/Reporting) có thể log trùng nếu nhiều Pod cùng đọc trúng 1 `OutboxEvent` chưa publish. `AuditComplianceConsumer` không bị ảnh hưởng vì đã idempotent qua bảng `processed_events` (xem [ADR-009](/adr/ADR-009-outbox-pattern-kafka-event-publishing)).

### Liên quan

- [ADR-007](/adr/ADR-007-pessimistic-locking-withdraw) — cơ chế Pessimistic Locking được verify lại ở quy mô nhiều Pod trong ADR này.
- [ADR-009](/adr/ADR-009-outbox-pattern-kafka-event-publishing) — `OutboxEventPublisher` và idempotent consumer, liên quan đến giới hạn đã biết khi chạy nhiều Pod.
