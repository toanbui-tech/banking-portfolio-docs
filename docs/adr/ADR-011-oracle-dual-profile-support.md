# ADR-011: Oracle Dual-Profile Support

## Context

Cần chứng minh khả năng làm việc với hệ quản trị CSDL doanh nghiệp (Oracle phổ biến trong ngân hàng Việt Nam) mà không ảnh hưởng đến 45 test đang pass trên PostgreSQL.

## Options Considered

### Phương án A — Migrate hoàn toàn sang Oracle, thay thế Postgres

- Loại bỏ hoàn toàn nền tảng Postgres đã ổn định, đánh đổi lấy 1 CSDL doanh nghiệp duy nhất.

### Phương án B (đã chọn) — Chạy song song 2 database qua Spring Profile riêng, cùng 1 codebase

- Chi phí lõi (viết lại SQL cho từng dialect) giống hệt Phương án A, nhưng không đụng đến 45 test đã ổn định trên Postgres.
- Câu chuyện portfolio mạnh hơn: "thiết kế portable, chứng minh bằng test thật trên cả 2 DB" thay vì chỉ chuyển đổi một chiều.

## Decision

Oracle Database Free (`gvenzl/oracle-free:23-slim-faststart`) qua Docker, host port 1522. Tách thư mục migration theo vendor (`db/migration/postgresql/`, `db/migration/oracle/`), Flyway `locations` cấu hình riêng theo profile (`application.properties` trỏ `db/migration/postgresql`, `application-oracle.properties` trỏ `db/migration/oracle`). Test chạy qua container tĩnh từ `docker-compose` (nhất quán với cách project đã test Postgres), không dùng Testcontainers cho DB chính — Testcontainers chỉ dùng cho Kafka/Redis (môi trường cần cô lập/port động).

## Vấn đề kỹ thuật thực tế gặp phải khi viết lại 7 migration

1. **UUID → `RAW(16)`** — PostgreSQL `UUID` không có kiểu tương đương trực tiếp trên Oracle, dùng `RAW(16)` cho mọi cột id/khóa ngoại.
2. **Rewrite logic phụ thuộc dialect:** `UPDATE ... FROM` (cú pháp riêng của Postgres) → correlated subquery ở V3 (`UPDATE ... SET currency = (SELECT ... WHERE EXISTS ...)`), và → `MERGE INTO` ở V4 (backfill `reversal_of_transaction_id`).
3. **`JSONB` → `JSON`** — dùng kiểu `JSON` native của Oracle 23ai thay cho `JSONB` của Postgres.
4. **Partial index → function-based index tương đương** — Oracle không hỗ trợ `CREATE INDEX ... WHERE ...` (partial index); thay bằng index trên biểu thức `CASE WHEN published_at IS NULL THEN created_at END`, đạt cùng mục đích (chỉ index các dòng chưa publish).
5. **Phát hiện phụ:** `columnDefinition = "jsonb"` khai báo trên `OutboxEvent.java` không cần sửa khi build cho Oracle, vì `spring.jpa.hibernate.ddl-auto=validate` không dùng `columnDefinition` để validate thực tế — `@JdbcTypeCode(SqlTypes.JSON)` tự thích ứng theo dialect đang chạy.

## Consequences

**Tích cực:**

- 45/45 test pass trên cả 2 database, chứng minh domain model portable thật sự (không chỉ về lý thuyết).

**Phát hiện quan trọng:**

- Quá trình chạy test trên Oracle phát hiện ra 1 bug thật trong domain model (`Money` không tự chuẩn hóa scale) — xem [ADR-012](/adr/ADR-012-money-fixed-scale) riêng.

**Đánh đổi:**

- Duy trì 2 bộ migration song song tăng chi phí bảo trì dài hạn — mọi thay đổi schema từ nay phải viết 2 lần (1 cho mỗi dialect).

### Liên quan

- [ADR-012](/adr/ADR-012-money-fixed-scale) — bug phát hiện được trong quá trình chạy test trên Oracle ở ADR này.
