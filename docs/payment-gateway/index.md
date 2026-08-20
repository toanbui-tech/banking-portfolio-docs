# Sub-Project A: Interbank Payment Gateway

> **[Chưa triển khai]** — nội dung dưới đây là thiết kế mục tiêu cho [Giai đoạn 2](/roadmap#giai-doan-2), sẽ cập nhật theo [Devlog](/devlog/phase-2-payment-gateway) khi bắt đầu code.

## 1. Bối cảnh & mục tiêu nghiệp vụ

Chuyển tiền giữa các tổ chức tài chính khác nhau (interbank transfer) đòi hỏi:
- **Chuẩn hóa thông điệp**: dùng chuẩn hiện đại **ISO 20022 XML** (`pain.001`, `pacs.008`).
- **Xử lý giao dịch phân tán không thể rollback truyền thống**: khi tiền đã rời ngân hàng A nhưng ngân hàng B không phản hồi kịp, hệ thống cần bù trừ an toàn (compensating transaction) thay vì rollback thông thường.
- **Quyết toán cuối ngày (EOD settlement)**: gom giao dịch trong ngày để xử lý theo batch.

Dự án đóng vai trò một Payment Hub trung gian, kết nối giữa Core Banking nội bộ (Sub-project B) và một cổng chuyển mạch được mô phỏng (mock).

---

## 2. Các luồng nghiệp vụ dự kiến

### A. Luồng chuyển tiền đi (Outbound Transfer)
1. Nhận yêu cầu chuyển tiền kèm `Idempotency-Key` để chống trừ tiền trùng lặp — xem [ADR-004](/adr/ADR-004-idempotency-duplicate-message-prevention).
2. Gửi lệnh Hold tiền (phong tỏa số dư) sang Core Banking.
3. Sinh điện `pacs.008` gửi sang cổng chuyển mạch (mock).
4. Nhận điện phản hồi trạng thái (`pacs.002`-style: Accept/Reject) và tiếp tục/bù trừ theo Saga — xem [ADR-001](/adr/ADR-001-saga-orchestration-vs-choreography).

### B. Luồng nhận tiền vào (Inbound Transfer)
1. Nhận điện `pacs.008` từ phía đối tác (mock).
2. Parse và validate theo XML Schema (XSD) của ISO 20022.
3. Kiểm tra tài khoản thụ hưởng tại Core Banking, ghi Có (credit).
4. Phản hồi trạng thái xử lý.

### C. Quyết toán cuối ngày (EOD Settlement)
- Job Spring Batch xử lý giao dịch trong ngày theo mô hình chunk-oriented — xem [ADR-005](/adr/ADR-005-spring-batch-chunk-vs-tasklet-eod).
- Giao dịch lỗi được đưa vào trạng thái riêng để retry/xử lý thủ công (exception/ops handling) thay vì làm hỏng toàn bộ batch.
