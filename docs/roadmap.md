---
title: Lộ trình xây dựng
description: Lộ trình 3-6 tháng xây dựng Core Banking System và Interbank Payment Gateway bằng Java/Spring
---

# Lộ trình xây dựng (Roadmap)

> Tài liệu này là **nguồn sự thật** cho toàn bộ portfolio — mọi trang khác trên site đều bám theo nội dung ở đây. Mục tiêu kép: (1) hiểu sâu nghiệp vụ banking + Java + hệ sinh thái Spring, (2) có 2 dự án thực chiến để đưa vào CV ứng tuyển vị trí Java FullStack tại ngân hàng FDI / fintech.

## Tổng quan

| | |
|---|---|
| **Thời gian** | 3–6 tháng |
| **Cấu trúc** | 2 sub-project song song, tách theo domain |
| **Nguyên tắc** | Đọc tài liệu gốc trước → hiểu bản chất → rồi mới code |
| **Đầu ra** | 2 repo GitHub + design doc + tài liệu này (public trên VitePress) |

Hai domain trong banking có tư duy thiết kế khác nhau khá rõ, nên được tách thành hai sub-project độc lập thay vì gộp chung:

- **Sub-project B — Core Banking**: domain "trạng thái" (state-centric). Trọng tâm là tính toàn vẹn dữ liệu, ACID, double-entry ledger.
- **Sub-project A — Interbank Payment Gateway**: domain "luồng đi" (flow-centric). Trọng tâm là messaging, orchestration, resilience.

---

## Giai đoạn 1 — Tháng 1–2: Core Banking (Sub-project B) {#giai-doan-1}

Bắt đầu từ đây vì đây là domain nền tảng, dễ tiếp cận hơn với người đã có nền Spring Boot/JPA, và lót đường tư duy cho phần Saga phức tạp hơn ở giai đoạn sau.

### Đọc trước
- Double-entry bookkeeping — nguyên lý kế toán kép
- Spring Data JPA — query methods, relationships, transaction boundaries
- Transaction management: `@Transactional`, isolation levels, propagation

### Xây dựng
- Account Service — tạo/tra cứu tài khoản
- Ledger Service — sổ cái double-entry (mỗi giao dịch ghi Nợ/Có cân bằng)
- Transaction Service — xử lý giao dịch nội bộ, đảm bảo tính nhất quán số dư

### Học sâu
- ACID và ý nghĩa thực tế trong hệ thống tài chính
- Optimistic vs pessimistic locking — khi nào dùng cái nào
- Audit trail design — vì sao ngân hàng không bao giờ "sửa" bản ghi, chỉ "thêm" bản ghi bù trừ

---

## Giai đoạn 2 — Tháng 3–4: Interbank Payment Gateway (Sub-project A) {#giai-doan-2}

### Đọc trước
- ISO 20022 message structure — `pain.001` (khởi tạo lệnh chuyển tiền), `pacs.008` (chuyển tiền liên ngân hàng)
- Saga pattern — orchestration vs choreography
- Spring State Machine / Spring Batch docs

### Xây dựng
- Message parsing & validation cho pain.001 / pacs.008
- Saga orchestration cho luồng thanh toán liên ngân hàng
- EOD (End-of-Day) batch settlement bằng Spring Batch
- Exception/ops handling — xử lý giao dịch lỗi, retry, dead-letter

### Học sâu
- Distributed transaction problem — vì sao 2PC không hợp với hệ thống phân tán quy mô lớn
- Compensating transactions — "hoàn tác" trong hệ phân tán khác gì rollback thông thường
- Idempotency — vì sao một message bị gửi lại 2 lần không được phép tạo ra 2 giao dịch

---

## Giai đoạn 3 — Tháng 5–6: Tích hợp, đào sâu & hoàn thiện CV {#giai-doan-3}

- Kết nối 2 sub-project: Payment Gateway gọi vào Core Banking để cập nhật số dư thực tế
- Bổ sung Spring Security cho API (authentication/authorization)
- Viết test kỹ: unit test + integration test
- Viết README / design doc — giải thích các quyết định kiến trúc
- Chuẩn bị câu chuyện phỏng vấn: vì sao chọn Saga thay vì 2PC, vì sao thiết kế ledger theo kiểu double-entry, vì sao tách 2 sub-project...

---

## Phương pháp học

- **Học trước, code sau**: mỗi module chính đều bắt đầu bằng việc đọc tài liệu gốc (Spring docs, ISO 20022 spec), không phải đọc để "biết" mà đọc để hiểu vì sao thiết kế như vậy.
- **Ghi chép tay song song**: dùng sổ tay chia 2 phần —
  - *Khái niệm học được*: kiến thức tổng quát, có thể tái dùng về sau
  - *Nhật ký dự án*: quyết định kiến trúc, vấn đề gặp phải, cách giải quyết — đây chính là nguyên liệu cho design doc và câu chuyện phỏng vấn
- **Ưu tiên hiểu sâu hơn tốc độ**: timeline 3–6 tháng là ước lượng, không phải deadline cứng.

---

## Nhật ký tiến độ

> Phần này sẽ được cập nhật theo thời gian khi triển khai từng giai đoạn. Chi tiết theo từng giai đoạn xem tại [Devlog](/devlog/).

- [ ] Giai đoạn 1: Core Banking
- [ ] Giai đoạn 2: Interbank Payment Gateway
- [ ] Giai đoạn 3: Tích hợp & hoàn thiện
