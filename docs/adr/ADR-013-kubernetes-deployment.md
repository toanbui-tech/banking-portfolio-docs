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

<svg class="diagram" viewBox="0 0 680 470" role="img" aria-labelledby="k8s-vi-title k8s-vi-desc">
<title id="k8s-vi-title">Kiểm chứng Pessimistic Locking qua 3 Pod Kubernetes</title>
<desc id="k8s-vi-desc">5 request rút tiền đồng thời đi qua Service NodePort, được phân tán tới 3 Pod. Cả 3 Pod cùng khóa một dòng Account trong database nên chỉ 1 request thành công, 4 request bị từ chối với HTTP 409.</desc>
<defs><marker id="k8s-vi-arr" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path class="arrowhead" d="M2 1L8 5L2 9"/></marker></defs>
<rect class="box-muted" x="170" y="16" width="340" height="50" rx="10"/>
<text class="t" x="340.0" y="32.0" text-anchor="middle" dominant-baseline="central">5 request withdraw đồng thời</text>
<text class="s" x="340.0" y="50.0" text-anchor="middle" dominant-baseline="central">đủ tiền cho đúng 1 request</text>
<path class="edge" d="M340 66 L340 90" marker-end="url(#k8s-vi-arr)"/>
<rect class="box-muted" x="220" y="92" width="240" height="50" rx="10"/>
<text class="t" x="340.0" y="108.0" text-anchor="middle" dominant-baseline="central">Service</text>
<text class="s" x="340.0" y="126.0" text-anchor="middle" dominant-baseline="central">NodePort :30080</text>
<path class="edge" d="M340 142 L340 158 L130 158 L130 176" marker-end="url(#k8s-vi-arr)"/>
<rect class="box" x="40" y="178" width="180" height="50" rx="10"/>
<text class="t" x="130.0" y="194.0" text-anchor="middle" dominant-baseline="central">Pod 1</text>
<text class="s" x="130.0" y="212.0" text-anchor="middle" dominant-baseline="central">AccountController</text>
<path class="edge" d="M130 228 L130 246 L340 246 L340 262" marker-end="url(#k8s-vi-arr)"/>
<path class="edge" d="M340 142 L340 158 L340 158 L340 176" marker-end="url(#k8s-vi-arr)"/>
<rect class="box" x="250" y="178" width="180" height="50" rx="10"/>
<text class="t" x="340.0" y="194.0" text-anchor="middle" dominant-baseline="central">Pod 2</text>
<text class="s" x="340.0" y="212.0" text-anchor="middle" dominant-baseline="central">AccountController</text>
<path class="edge" d="M340 228 L340 246 L340 246 L340 262" marker-end="url(#k8s-vi-arr)"/>
<path class="edge" d="M340 142 L340 158 L550 158 L550 176" marker-end="url(#k8s-vi-arr)"/>
<rect class="box" x="460" y="178" width="180" height="50" rx="10"/>
<text class="t" x="550.0" y="194.0" text-anchor="middle" dominant-baseline="central">Pod 3</text>
<text class="s" x="550.0" y="212.0" text-anchor="middle" dominant-baseline="central">AccountController</text>
<path class="edge" d="M550 228 L550 246 L340 246 L340 262" marker-end="url(#k8s-vi-arr)"/>
<rect class="box-muted" x="140" y="264" width="400" height="68" rx="10"/>
<text class="t" x="340.0" y="280.0" text-anchor="middle" dominant-baseline="central">PostgreSQL</text>
<text class="s" x="340.0" y="298.0" text-anchor="middle" dominant-baseline="central">SELECT … FOR UPDATE trên cùng 1 Account</text>
<text class="s" x="340.0" y="316.0" text-anchor="middle" dominant-baseline="central">→ các request được tuần tự hóa tại DB</text>
<path class="edge" d="M340 332 L340 356" marker-end="url(#k8s-vi-arr)"/>
<rect class="box" x="190" y="358" width="300" height="68" rx="10"/>
<text class="t" x="340.0" y="374.0" text-anchor="middle" dominant-baseline="central">Kết quả</text>
<text class="s" x="340.0" y="392.0" text-anchor="middle" dominant-baseline="central">1 × thành công · 4 × HTTP 409</text>
<text class="s" x="340.0" y="410.0" text-anchor="middle" dominant-baseline="central">số dư cuối đúng, không âm</text>
<text class="lbl mono" x="340" y="448" text-anchor="middle" dominant-baseline="central">kubectl logs --prefix xác nhận request đến cả 3 Pod</text>
</svg>

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
