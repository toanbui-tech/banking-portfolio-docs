# Khởi chạy & Kiểm thử

> **[Đã triển khai]** — các bước dưới đây tóm tắt từ quá trình chạy thật ở [Devlog — Giai đoạn 1](/devlog/phase-1-core-banking). Lệnh chạy trong thư mục gốc của repo code Core Banking.

## 1. Hạ tầng (docker-compose)

Các host port đã được đổi khỏi port mặc định để tránh xung đột với container khác trên máy dev:

| Service | Image | Host port |
| :--- | :--- | :--- |
| PostgreSQL | `postgres:15` | `5434` |
| Oracle | `gvenzl/oracle-free:23-slim-faststart` | `1522` |
| Redis | `redis:7-alpine` | `6380` |
| Kafka | — | `9092` (process trên host), `9094` (từ container/Pod qua `host.docker.internal`) |

```bash
docker compose up -d
```

::: tip
Oracle khởi động chậm hơn đáng kể so với các service khác, kể cả bản `slim-faststart` — chờ container healthy trước khi chạy test profile `oracle`.
:::

## 2. Chạy ứng dụng

```bash
# Profile mặc định — PostgreSQL
./mvnw spring-boot:run

# Profile Oracle
./mvnw spring-boot:run -Dspring-boot.run.arguments=--spring.profiles.active=oracle
```

Flyway tự chạy migration theo profile: `db/migration/postgresql/` hoặc `db/migration/oracle/`.

### REST API

| Method | Endpoint | Mô tả |
| :--- | :--- | :--- |
| `POST` | `/accounts` | Tạo tài khoản |
| `GET` | `/accounts/{id}/balance` | Xem số dư (qua Redis cache) |
| `POST` | `/accounts/{id}/deposit` | Nạp tiền |
| `POST` | `/accounts/{id}/withdraw` | Rút tiền (pessimistic lock; không đủ tiền → HTTP 409) |

## 3. Chạy test

```bash
# PostgreSQL
./mvnw test

# Oracle — cùng bộ test, không sửa theo profile
./mvnw test -Dspring.profiles.active=oracle
```

Kết quả hiện tại: **45/45 test pass trên cả 2 database**. Kafka và Redis trong integration test chạy qua Testcontainers, nên cần Docker đang chạy.

### Các test đáng chú ý

| Test | Kiểm chứng |
| :--- | :--- |
| `withdraw_shouldPreventOverdraft_whenConcurrentRequests` | 2 thread cùng rút 80.00 từ tài khoản có 100.00 — chỉ đúng 1 thread thành công |
| `TransactionTest` | Invariant Nợ = Có, `reverse()` đối xứng, `createdBy` luôn được set |
| `MoneyTest` | Chặn trộn lẫn tiền tệ, scale cố định |
| `TransactionToComplianceEndToEndTest` | Giao dịch → Outbox → Kafka thật → `compliance_records` |
| `AccountBalanceCacheIntegrationTest` | Số dư không bị cũ sau giao dịch mới (Redis thật) |

## 4. Triển khai lên Kubernetes

Dùng Docker Desktop Kubernetes (chung image cache với `docker build`, nên `imagePullPolicy: Never`). Data layer vẫn chạy bằng docker-compose ngoài cluster.

```bash
docker build -t core-banking-system:local .
kubectl apply -f k8s/          # namespace core-banking, 3 replicas
kubectl -n core-banking get pods
```

Service kiểu `NodePort` truy cập được tại `http://localhost:30080`. Kiểm tra Pod nào xử lý request nào:

```bash
kubectl -n core-banking logs -l <label-của-app> --prefix
```

Kịch bản verify đã chạy: 5 request `withdraw` đồng thời, đủ tiền cho đúng 1 request → 1 thành công, 4 bị HTTP 409, request phân tán qua cả 3 Pod. Chi tiết: [ADR-013](/adr/ADR-013-kubernetes-deployment).
