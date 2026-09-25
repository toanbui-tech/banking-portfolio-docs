# Architecture Decision Records (ADRs)

Các bản ghi quyết định kiến trúc (ADR) được viết theo format **Vấn đề → Lựa chọn → Lý do → Đánh đổi**. ADR-002, ADR-006 → ADR-013 là quyết định **đã áp dụng** trong Core Banking (Giai đoạn 1), kèm vấn đề kỹ thuật thực tế gặp phải khi triển khai. ADR-001, ADR-004, ADR-005 là quyết định **dự kiến** cho Payment Gateway (Giai đoạn 2), sẽ cập nhật khi code. Tiến độ chi tiết xem tại [Devlog](/devlog/).

---

## Ma trận Quyết định Kiến trúc

| Mã ADR | Vấn đề kỹ thuật | Quyết định lựa chọn | Đánh đổi chấp nhận |
| :--- | :--- | :--- | :--- |
| [ADR-001](/adr/ADR-001-saga-orchestration-vs-choreography) | Quản lý giao dịch phân tán liên ngân hàng | Saga Orchestration (thay vì Choreography) | Orchestrator có thể thành điểm nghẽn nếu không thiết kế stateless |
| [ADR-002](/adr/ADR-002-double-entry-ledger-immutable-pattern) | Mô hình ghi nhận biến động số dư tài khoản | Sổ cái kế toán kép, chỉ ghi thêm (append-only) | Dữ liệu `ledger_entries` tăng liên tục theo thời gian |
| [ADR-003](/adr/ADR-003-pessimistic-vs-optimistic-locking-hot-accounts) | Xung đột đồng thời trên tài khoản nóng (hot account) | Pessimistic Lock + khóa theo thứ tự cố định | Độ trễ tăng nhẹ trên từng tài khoản đơn lẻ |
| [ADR-004](/adr/ADR-004-idempotency-duplicate-message-prevention) | Chống xử lý trùng lặp khi message bị gửi lại | Idempotency-Key kiểm tra tại lớp API | Cần chính sách dọn dẹp/hết hạn cho bảng idempotency key |
| [ADR-005](/adr/ADR-005-spring-batch-chunk-vs-tasklet-eod) | Xử lý đối soát & quyết toán cuối ngày (EOD) | Spring Batch Chunk-Oriented Step | Phức tạp hơn Tasklet đơn giản, cần tinh chỉnh chunk size |
| [ADR-006](/adr/ADR-006-derived-balance-vs-stored-balance) | Lưu trữ số dư tài khoản (balance) | Không lưu cột `balance`, tính động từ `SUM(CREDIT) - SUM(DEBIT)` trên ledger | Tốn chi phí truy vấn `SUM()` mỗi lần gọi, cần cân nhắc snapshot khi hệ thống lớn hơn |
| [ADR-007](/adr/ADR-007-pessimistic-locking-withdraw) | Race condition check-then-act khi rút tiền đồng thời | Pessimistic Locking (`SELECT ... FOR UPDATE`) thay vì Optimistic Locking | Giảm throughput trên cùng 1 account, cần cân nhắc lock timeout khi mở rộng |
| [ADR-008](/adr/ADR-008-transaction-aggregate-root) | Invariant Debit=Credit nằm ngoài entity, ở tầng service | Transaction Aggregate Root — `LedgerEntry` chỉ tạo được qua `Transaction.record()` | Thêm bảng `transactions` + migration backfill; entity dùng `Persistable<UUID>` do ID application-assigned |
| [ADR-009](/adr/ADR-009-outbox-pattern-kafka-event-publishing) | Rủi ro Dual Write khi ghi DB + gửi Kafka trực tiếp cùng flow | Outbox Pattern — lưu event vào `outbox_events` cùng transaction DB, publish qua tiến trình `@Scheduled` riêng | At-least-once delivery, bắt buộc Idempotent Consumer (`processed_events`) ở phía nhận |
| [ADR-010](/adr/ADR-010-redis-cache-account-balance) | `getBalance()` tính lại `SUM()` toàn bộ ledger mỗi lần gọi, không hiệu quả | Redis cache-aside cho `getBalance()`, evict qua `@TransactionalEventListener(AFTER_COMMIT)`; `withdraw()` luôn tính thẳng từ DB, không qua cache | Thêm độ phức tạp (event + listener) so với evict trực tiếp; TTL 3600s cho phần đọc không qua evict |
| [ADR-011](/adr/ADR-011-oracle-dual-profile-support) | Cần minh chứng khả năng vận hành trên CSDL doanh nghiệp (Oracle) mà không phá vỡ test Postgres hiện có | Dual-profile Spring — 2 bộ migration tách thư mục theo vendor, cùng 1 codebase | Duy trì 2 bộ migration song song, tăng chi phí bảo trì dài hạn |
| [ADR-012](/adr/ADR-012-money-fixed-scale) | Oracle `NUMBER` không giữ scale cố định lúc đọc; ISO 4217 VND=0 chữ số thập phân mâu thuẫn với domain model hiện có | `Money` enforce `scale=2` cố định cho mọi currency (`setScale(2, RoundingMode.UNNECESSARY)`), không theo ISO 4217 tuyệt đối | Cần revisit nếu sau này hỗ trợ currency có native fraction digit khác 2 (VD JPY=0, BHD=3) |
| [ADR-013](/adr/ADR-013-kubernetes-deployment) | Cần verify Pessimistic Locking hoạt động đúng khi nhiều instance app chạy song song | Deploy app vào K8s (3 replicas), giữ data layer ở docker-compose; verify qua HTTP thật + log theo tên Pod | `OutboxEventPublisher` chưa có lock phân tán — 3 consumer PoC có thể log trùng khi nhiều Pod cùng đọc 1 event |
