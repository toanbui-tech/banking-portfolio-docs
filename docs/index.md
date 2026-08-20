---
layout: home

hero:
  name: "Banking & Fintech Systems"
  text: "Core Banking & Interbank Payment Gateway"
  tagline: "Hai hệ thống mô phỏng hạ tầng ngân hàng bằng Java/Spring: Double-Entry Core Banking Ledger & ISO 20022 Interbank Payment Gateway"
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
    details: Lộ trình xây dựng 3-6 tháng, cùng nhật ký tiến độ theo từng giai đoạn — cập nhật trung thực khi triển khai, không phải trước.
---

## Tổng quan

Đây là hai hệ thống mô phỏng nghiệp vụ ngân hàng lõi, xây dựng bằng Java/Spring Boot theo [lộ trình](/roadmap) 3-6 tháng. Mỗi hệ thống tập trung vào một nhóm vấn đề kỹ thuật riêng:

1. **Toàn vẹn dữ liệu tài chính**: sổ cái kế toán kép bất biến (double-entry, append-only), đảm bảo Debit = Credit ở mọi giao dịch, kiểm soát xung đột trên tài khoản nóng.
2. **Giao dịch phân tán**: điều phối giao dịch liên ngân hàng bằng Saga Orchestration thay vì 2PC, xử lý idempotency và compensating transaction khi một bước thất bại.
3. **Chuẩn hóa thông điệp tài chính**: parse & validate message ISO 20022 (`pain.001`, `pacs.008`), quyết toán cuối ngày theo batch.

Cả hai hệ thống đang trong quá trình xây dựng; tiến độ theo từng giai đoạn được cập nhật tại [Devlog](/devlog/).

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
