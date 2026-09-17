# ADR-012: Money — Scale Cố định 2, Không Theo ISO 4217 Tuyệt đối

## Context

Trong lúc chạy test trên Oracle ([ADR-011](/adr/ADR-011-oracle-dual-profile-support)), phát hiện Oracle `NUMBER` không giữ scale cố định lúc đọc (khác PostgreSQL `NUMERIC` giữ nguyên scale khai báo) — đây là hành vi chuẩn của Oracle, không phải bug ở tầng CSDL.

Khi thử fix bằng `Currency.getDefaultFractionDigits()` (chuẩn ISO 4217), phát hiện xung đột sâu hơn: VND theo ISO 4217 có 0 chữ số thập phân, nhưng toàn bộ domain model của project (từ Audit Trail đến Redis) đã ngầm định VND có 2 chữ số thập phân xuyên suốt.

## Options Considered

### Phương án A — Dùng `Currency.getDefaultFractionDigits()` (chuẩn ISO 4217 chính xác)

- Đúng chuẩn quốc tế, nhưng sẽ throw exception cho các giá trị VND có phần thập phân (ví dụ test case 999.99 VND) — cần sửa lại toàn bộ test/dữ liệu hiện có từ 4 tính năng trước đó (Ledger, Transaction Aggregate, Outbox/Kafka, Redis cache).

### Phương án B (đã chọn) — Cố định `scale = 2` cho MỌI currency, không theo ISO 4217

- Không thay đổi hành vi/dữ liệu của các tính năng đã xây dựng trước đó.

## Decision

Chọn **Phương án B**. Lý do: nhiều hệ thống core banking thật giữ độ chính xác thập phân ở tầng tính toán trung gian (lãi suất, phí theo %) bất kể đơn vị tiền tệ có native fraction digit là bao nhiêu — làm tròn chỉ diễn ra ở tầng hiển thị. Đây là giả định đơn giản hóa có chủ đích, không phải sai sót.

Sửa `Money.java`: enforce `setScale(2, RoundingMode.UNNECESSARY)` trong constructor riêng (`private Money(BigDecimal, Currency)`) — mọi đường tạo `Money` (`of`, `zero`, `add`, `subtract`) đều đi qua constructor này nên đều được chuẩn hóa scale=2 tự động; `RoundingMode.UNNECESSARY` nghĩa là nếu có chỗ nào tạo `Money` với giá trị không tròn ở scale=2, code sẽ throw ngay tại đó thay vì âm thầm làm tròn sai.

## Consequences

**Tích cực:**

- 45/45 test pass trên cả 2 database, invariant của Value Object được đảm bảo tự thân (không còn "may mắn đúng nhờ Postgres `NUMERIC` giữ scale hộ").

**Rủi ro đã ghi nhận:**

- Nếu sau này cần hỗ trợ multi-currency thật với native fraction digit khác nhau (ví dụ JPY = 0, BHD = 3), cần revisit quyết định này — scale cố định 2 sẽ không còn đúng cho các đồng tiền đó.

**Bài học:**

- Chạy cùng 1 domain model trên nhiều database có thể phát hiện giả định ẩn mà 1 môi trường duy nhất che giấu — ở đây là việc `Money` chưa từng tự chuẩn hóa scale, chỉ "đúng tình cờ" vì Postgres `NUMERIC(19,2)` luôn trả về đúng 2 chữ số thập phân khi đọc lại.

### Liên quan

- [ADR-011](/adr/ADR-011-oracle-dual-profile-support) — quá trình chạy test trên Oracle là nơi phát hiện ra vấn đề này.
