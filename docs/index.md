---
layout: home

hero:
  name: "Banking & Fintech Systems"
  text: "Java FullStack & Backend Architecture Portfolio"
  tagline: "Mô phỏng hạ tầng ngân hàng theo lộ trình 3-6 tháng: Double-Entry Core Banking Ledger & ISO 20022 Interbank Payment Gateway"
  actions:
    - theme: brand
      text: "Xem lộ trình xây dựng"
      link: /roadmap
    - theme: alt
      text: "Core Banking System"
      link: /core-banking/
    - theme: alt
      text: "Payment Gateway"
      link: /payment-gateway/

features:
  - title: Double-Entry Core Ledger
    details: Sổ cái kế toán kép, chỉ ghi thêm (append-only), đảm bảo tính toàn vẹn dữ liệu và kiểm soát xung đột trên tài khoản nóng bằng pessimistic locking.
  - title: Interbank Payment Gateway
    details: Xử lý giao dịch liên ngân hàng theo chuẩn ISO 20022 (pain.001, pacs.008), điều phối giao dịch phân tán qua Saga Orchestrator, quyết toán cuối ngày bằng Spring Batch.
  - title: Architecture Decision Records
    details: Các bản ghi quyết định kiến trúc (ADR) theo format Vấn đề - Lựa chọn - Lý do - Đánh đổi, phản ánh tư duy thiết kế thực sự sẽ áp dụng khi triển khai.
  - title: Lộ trình & Nhật ký tiến độ
    details: Lộ trình học tập 3-6 tháng công khai, cùng nhật ký tiến độ theo từng giai đoạn — cập nhật trung thực khi triển khai, không phải trước.
---

## Mục đích tài liệu này

Tài liệu này được biên soạn nhằm minh chứng **năng lực thiết kế kiến trúc**, **tư duy giải quyết bài toán nghiệp vụ tài chính** và **kỹ năng lập trình Java Enterprise** cho vị trí **Java FullStack / Backend Software Engineer** tại các ngân hàng FDI và Fintech.

Đây là một portfolio **đang trong quá trình xây dựng** theo [lộ trình 3-6 tháng](/roadmap), không phải một sản phẩm đã hoàn thiện. Trọng tâm là:

1. **Financial Domain Knowledge**: hiểu chuẩn điện chuyển tiền ISO 20022 (`pain.001`, `pacs.008`), nguyên lý kế toán kép (Debit/Credit balance rule).
2. **System Resilience & Concurrency**: idempotency, Saga cho giao dịch phân tán, kiểm soát deadlock trên hot account.
3. **Auditability**: audit trail bằng bút toán bù trừ (reversal entries), không sửa/xóa dữ liệu gốc.

---

## Sơ đồ tổng thể 2 Sub-Project

**Sub-project A: Interbank Payment Gateway**
- Message parsing & validation cho `pain.001` / `pacs.008`
- Saga Orchestrator — điều phối & bù trừ giao dịch phân tán
- EOD Batch Settlement — Spring Batch, chunk-oriented
- Exception/ops handling — retry, dead-letter

Gọi sang Core Banking qua Internal REST, kèm header `Idempotency-Key`:

**Sub-project B: Core Banking System**
- Account Service — quản lý tài khoản
- Ledger Service — sổ cái double-entry (append-only)
- Transaction Service — xử lý giao dịch, đảm bảo Debit = Credit
- Concurrency Guard — Pessimistic Lock + khóa theo thứ tự cố định

Payment Gateway gọi vào Core Banking để cập nhật số dư thực tế (tích hợp ở [Giai đoạn 3](/roadmap#giai-doan-3)).

---

## So sánh nhanh 2 Sub-Project

| Tiêu chí | Sub-project B: Core Banking System | Sub-project A: Payment Gateway |
| :--- | :--- | :--- |
| **Nghiệp vụ cốt lõi** | Quản lý tài khoản, ghi sổ cái kế toán kép | Chuyển tiền liên ngân hàng, định dạng ISO 20022 |
| **Thử thách lớn nhất** | Xung đột đồng thời (race condition) & toàn vẹn dữ liệu | Phân tán trạng thái & xử lý lỗi ngoại lệ (Saga) |
| **Mô hình giao dịch** | Strong Consistency (ACID + DB locks) | Eventual Consistency (Saga Orchestration) |
| **Xử lý Batch** | — | EOD Settlement bằng Spring Batch (chunk-oriented) |
| **Bảo mật** | Spring Security (Giai đoạn 3) | Spring Security (Giai đoạn 3) |
