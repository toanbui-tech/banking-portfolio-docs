# Sub-Project B: Core Banking System

> **[Chưa triển khai]** — nội dung dưới đây là thiết kế mục tiêu cho [Giai đoạn 1](/roadmap#giai-doan-1), sẽ cập nhật theo [Devlog](/devlog/phase-1-core-banking) khi bắt đầu code.

## 1. Bối cảnh & mục tiêu nghiệp vụ

Trái tim của bất kỳ ngân hàng nào là **Core Banking Ledger** — nơi nắm giữ số dư (source of truth) của tài khoản khách hàng và tài khoản nội bộ.

Nguyên tắc thiết kế theo đúng nghiệp vụ ngân hàng:
1. **Không `UPDATE` số dư trực tiếp**: mọi biến động số dư sinh ra từ các bút toán kế toán kép (double-entry journal entries).
2. **Tổng Nợ (Debit) luôn bằng Tổng Có (Credit)** trên từng giao dịch.
3. **Bất biến (append-only)**: không xóa hoặc sửa dòng nhật ký kế toán đã ghi. Muốn hủy bút toán thì thực hiện bút toán đảo (reversal entry).

Mục tiêu là xây dựng một Core Ledger Engine giữ được tính toàn vẹn dữ liệu khi có nhiều giao dịch đồng thời trên cùng một tài khoản.

---

## 2. Các phân hệ dự kiến

- **Account Service**: tạo/tra cứu tài khoản.
- **Ledger Service**: sổ cái double-entry — mỗi giao dịch ghi Nợ/Có cân bằng.
- **Transaction Service**: xử lý giao dịch nội bộ, đảm bảo tính nhất quán số dư.
- **Concurrency control**: khóa bi quan (pessimistic lock) cho tài khoản nóng — xem [ADR-003](/adr/ADR-003-pessimistic-vs-optimistic-locking-hot-accounts).
- **Audit trail**: lưu vết bằng bút toán bù trừ, không sửa/xóa dữ liệu gốc — xem [ADR-002](/adr/ADR-002-double-entry-ledger-immutable-pattern).
