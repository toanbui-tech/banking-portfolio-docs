# ADR-008: Transaction Aggregate Root cho Bất biến Debit=Credit

## Context

- Trước khi refactor: invariant Debit=Credit nằm trong `LedgerService.validateBalanced()`, không có Entity/Aggregate nào đại diện cho khái niệm "1 giao dịch kế toán".
- Vấn đề: theo nguyên tắc DDD, invariant nên nằm trong Aggregate, không nằm trong Service.

## Options Considered

### Phương án A — Giữ nguyên (không tạo Transaction entity)

- **Ưu:** ít thay đổi, migration nhẹ.
- **Nhược:** khái niệm "giao dịch" mãi mãi ngầm định, không gắn thêm được business rule cấp giao dịch sau này, query trả về `List<LedgerEntry>` trần không có ý nghĩa.

### Phương án B — Tạo Transaction Aggregate Root chứa `List<LedgerEntry>`

- **Ưu:** invariant Debit=Credit trở thành tự nhiên của Aggregate (constructor không cho tạo `Transaction` mất cân bằng), reversal có chỗ tự nhiên (`reversalOfTransactionId`), query trả về object có nghĩa.
- **Nhược:** thay đổi aggregate boundary thật sự — cần bảng mới, migration backfill, sửa `LedgerService` thành orchestration mỏng hơn, rủi ro over-engineering nếu chưa có nghiệp vụ nào cần thao tác ở cấp Transaction (YAGNI).

## Decision

Chọn **Phương án B** — vì "Debit=Credit" là invariant, và theo nguyên tắc DDD invariant nên nằm trong Aggregate chứ không nằm trong Service (Service chỉ nên orchestrate). Đánh đổi thời gian/độ phức tạp để có kiến trúc đúng nguyên tắc, chấp nhận rủi ro over-engineering ở giai đoạn hiện tại vì đây là portfolio học tập, ưu tiên thực hành đúng pattern hơn tốc độ phát triển.

## Consequences

**Tích cực:**

- Invariant được đảm bảo tự động ở tầng domain.
- `LedgerService` giờ chỉ còn orchestration.
- Reversal có chỗ lưu đúng ngữ nghĩa (`reversalOfTransactionId`).

**Tiêu cực/rủi ro:**

- Tăng độ phức tạp hệ thống khi chưa có nghiệp vụ thật sự cần Transaction là 1 object độc lập.

**Vấn đề kỹ thuật phát sinh trong quá trình triển khai:**

1. **PostgreSQL không hỗ trợ `MIN()` trực tiếp trên kiểu UUID** — không có thứ tự sắp xếp mặc định cho UUID để so sánh. Migration backfill (gom nhóm `ledger_entries` cũ theo `transaction_id` để lấy giá trị đại diện cho mỗi nhóm) phải cast UUID sang `::text` trước khi `MIN()`, rồi cast kết quả ngược lại `::uuid`.
2. **Pitfall JPA — `Persistable<UUID>`.** `Transaction.id` được gán thủ công trong constructor (không dùng `@GeneratedValue` — đúng theo nguyên tắc DDD, Aggregate tự chịu trách nhiệm tạo ra chính nó ở trạng thái hợp lệ). Vì ID không null ngay khi `save()` được gọi, Spring Data JPA mặc định coi entity là "đã tồn tại trong DB", gọi `merge()` thay vì `persist()`, khiến cascade `PERSIST` sang `LedgerEntry` không kích hoạt đúng — sinh ra bản ghi rỗng thay vì đúng dữ liệu. Đây là lỗi "âm thầm sai" (không throw exception rõ ràng), chỉ phát hiện được khi kiểm tra kỹ dữ liệu sau khi lưu. Fix: implement `Persistable<UUID>`, tự định nghĩa `isNew()` để báo cho JPA biết chính xác đây là entity mới, bất kể ID đã có giá trị hay chưa.

Kết quả sau khi fix: 21/21 test pass, cascade hoạt động đúng. Bài học: hiểu rõ cơ chế persist vs merge của JPA quan trọng hơn nhiều so với chỉ biết cú pháp annotation.
