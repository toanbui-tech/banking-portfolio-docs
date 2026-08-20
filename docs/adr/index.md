# Architecture Decision Records (ADRs)

Các bản ghi quyết định kiến trúc (ADR) được viết theo format **Vấn đề → Lựa chọn → Lý do → Đánh đổi**. Đây là các quyết định thiết kế thực sự sẽ được áp dụng khi triển khai, bám theo [lộ trình](/roadmap) — không phải kết quả đo lường sau khi code (những con số benchmark cụ thể chỉ có ý nghĩa sau khi hệ thống thực sự chạy, và sẽ được bổ sung qua [Devlog](/devlog/) khi có).

---

## Ma trận Quyết định Kiến trúc

| Mã ADR | Vấn đề kỹ thuật | Quyết định lựa chọn | Đánh đổi chấp nhận |
| :--- | :--- | :--- | :--- |
| [ADR-001](/adr/ADR-001-saga-orchestration-vs-choreography) | Quản lý giao dịch phân tán liên ngân hàng | Saga Orchestration (thay vì Choreography) | Orchestrator có thể thành điểm nghẽn nếu không thiết kế stateless |
| [ADR-002](/adr/ADR-002-double-entry-ledger-immutable-pattern) | Mô hình ghi nhận biến động số dư tài khoản | Sổ cái kế toán kép, chỉ ghi thêm (append-only) | Dữ liệu `journal_entries` tăng liên tục theo thời gian |
| [ADR-003](/adr/ADR-003-pessimistic-vs-optimistic-locking-hot-accounts) | Xung đột đồng thời trên tài khoản nóng (hot account) | Pessimistic Lock + khóa theo thứ tự cố định | Độ trễ tăng nhẹ trên từng tài khoản đơn lẻ |
| [ADR-004](/adr/ADR-004-idempotency-duplicate-message-prevention) | Chống xử lý trùng lặp khi message bị gửi lại | Idempotency-Key kiểm tra tại lớp API | Cần chính sách dọn dẹp/hết hạn cho bảng idempotency key |
| [ADR-005](/adr/ADR-005-spring-batch-chunk-vs-tasklet-eod) | Xử lý đối soát & quyết toán cuối ngày (EOD) | Spring Batch Chunk-Oriented Step | Phức tạp hơn Tasklet đơn giản, cần tinh chỉnh chunk size |
