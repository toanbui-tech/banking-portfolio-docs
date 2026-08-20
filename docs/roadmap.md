---
title: Lộ trình xây dựng
description: Lộ trình 3-6 tháng xây dựng Core Banking System và Interbank Payment Gateway bằng Java/Spring
---

# Lộ trình xây dựng (Roadmap)

> Tài liệu này là **nguồn sự thật** cho toàn bộ site — mọi trang khác đều bám theo nội dung ở đây. Mục tiêu: xây dựng 2 hệ thống mô phỏng nghiệp vụ ngân hàng lõi bằng Java/Spring, dựa trên tìm hiểu sâu về nghiệp vụ banking và các mẫu thiết kế hệ thống tài chính/phân tán liên quan.

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

### Sơ đồ tổng quan

<svg width="100%" viewBox="0 0 680 420" role="img">
<title>Sơ đồ tổng quát 6 tháng: Core Banking, Payment Gateway, Tích hợp</title>
<desc>Ba giai đoạn hai tháng mỗi giai đoạn: Tháng 1-2 Core Banking, Tháng 3-4 Payment Gateway, Tháng 5-6 Tích hợp và hoàn thiện.</desc>
<defs>
<marker id="arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M2 1L8 5L2 9" fill="none" stroke="context-stroke" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></marker>
</defs>

<g fill="none" stroke="#0F6E56" stroke-width="0.5">
<rect x="40" y="40" width="180" height="120" rx="12" fill="#E1F5EE"/>
</g>
<text x="130" y="70" text-anchor="middle" dominant-baseline="central" font-size="14" font-weight="500" fill="#085041">Tháng 1-2</text>
<text x="130" y="92" text-anchor="middle" dominant-baseline="central" font-size="12" fill="#0F6E56">Core Banking</text>
<text x="130" y="112" text-anchor="middle" dominant-baseline="central" font-size="12" fill="#0F6E56">Account, ledger,</text>
<text x="130" y="128" text-anchor="middle" dominant-baseline="central" font-size="12" fill="#0F6E56">transaction service</text>

<line x1="220" y1="100" x2="248" y2="100" stroke="#888780" stroke-width="1.5" marker-end="url(#arrow)"/>

<g fill="none" stroke="#993C1D" stroke-width="0.5">
<rect x="250" y="40" width="180" height="120" rx="12" fill="#FAECE7"/>
</g>
<text x="340" y="70" text-anchor="middle" dominant-baseline="central" font-size="14" font-weight="500" fill="#712B13">Tháng 3-4</text>
<text x="340" y="92" text-anchor="middle" dominant-baseline="central" font-size="12" fill="#993C1D">Payment Gateway</text>
<text x="340" y="112" text-anchor="middle" dominant-baseline="central" font-size="12" fill="#993C1D">ISO 20022, Saga,</text>
<text x="340" y="128" text-anchor="middle" dominant-baseline="central" font-size="12" fill="#993C1D">EOD batch</text>

<line x1="430" y1="100" x2="458" y2="100" stroke="#888780" stroke-width="1.5" marker-end="url(#arrow)"/>

<g fill="none" stroke="#534AB7" stroke-width="0.5">
<rect x="460" y="40" width="180" height="120" rx="12" fill="#EEEDFE"/>
</g>
<text x="550" y="70" text-anchor="middle" dominant-baseline="central" font-size="14" font-weight="500" fill="#3C3489">Tháng 5-6</text>
<text x="550" y="92" text-anchor="middle" dominant-baseline="central" font-size="12" fill="#534AB7">Tích hợp</text>
<text x="550" y="112" text-anchor="middle" dominant-baseline="central" font-size="12" fill="#534AB7">Kết nối 2 hệ thống,</text>
<text x="550" y="128" text-anchor="middle" dominant-baseline="central" font-size="12" fill="#534AB7">test, docs</text>

<line x1="130" y1="160" x2="130" y2="190" stroke="#888780" stroke-width="1.5" marker-end="url(#arrow)"/>
<line x1="340" y1="160" x2="340" y2="190" stroke="#888780" stroke-width="1.5" marker-end="url(#arrow)"/>
<line x1="550" y1="160" x2="550" y2="190" stroke="#888780" stroke-width="1.5" marker-end="url(#arrow)"/>

<g fill="none" stroke="#5F5E5A" stroke-width="0.5">
<rect x="40" y="192" width="180" height="200" rx="10" fill="#F1EFE8"/>
</g>
<text x="130" y="212" text-anchor="middle" dominant-baseline="central" font-size="14" font-weight="500" fill="#2C2C2A">Tuần 1-2</text>
<text x="130" y="232" text-anchor="middle" dominant-baseline="central" font-size="12" fill="#5F5E5A">Đọc double-entry,</text>
<text x="130" y="248" text-anchor="middle" dominant-baseline="central" font-size="12" fill="#5F5E5A">JPA, transaction</text>
<text x="130" y="278" text-anchor="middle" dominant-baseline="central" font-size="14" font-weight="500" fill="#2C2C2A">Tuần 3-5</text>
<text x="130" y="298" text-anchor="middle" dominant-baseline="central" font-size="12" fill="#5F5E5A">Code Account,</text>
<text x="130" y="314" text-anchor="middle" dominant-baseline="central" font-size="12" fill="#5F5E5A">Ledger, Transaction</text>
<text x="130" y="344" text-anchor="middle" dominant-baseline="central" font-size="14" font-weight="500" fill="#2C2C2A">Tuần 6-8</text>
<text x="130" y="364" text-anchor="middle" dominant-baseline="central" font-size="12" fill="#5F5E5A">Locking, ADR, test,</text>
<text x="130" y="380" text-anchor="middle" dominant-baseline="central" font-size="12" fill="#5F5E5A">devlog cập nhật</text>

<g fill="none" stroke="#5F5E5A" stroke-width="0.5">
<rect x="250" y="192" width="180" height="200" rx="10" fill="#F1EFE8"/>
</g>
<text x="340" y="212" text-anchor="middle" dominant-baseline="central" font-size="14" font-weight="500" fill="#2C2C2A">Tuần 9-10</text>
<text x="340" y="232" text-anchor="middle" dominant-baseline="central" font-size="12" fill="#5F5E5A">Đọc ISO 20022,</text>
<text x="340" y="248" text-anchor="middle" dominant-baseline="central" font-size="12" fill="#5F5E5A">Saga, Spring Batch</text>
<text x="340" y="278" text-anchor="middle" dominant-baseline="central" font-size="14" font-weight="500" fill="#2C2C2A">Tuần 11-14</text>
<text x="340" y="298" text-anchor="middle" dominant-baseline="central" font-size="12" fill="#5F5E5A">Code parsing,</text>
<text x="340" y="314" text-anchor="middle" dominant-baseline="central" font-size="12" fill="#5F5E5A">orchestration</text>
<text x="340" y="344" text-anchor="middle" dominant-baseline="central" font-size="14" font-weight="500" fill="#2C2C2A">Tuần 15-17</text>
<text x="340" y="364" text-anchor="middle" dominant-baseline="central" font-size="12" fill="#5F5E5A">EOD batch, ADR,</text>
<text x="340" y="380" text-anchor="middle" dominant-baseline="central" font-size="12" fill="#5F5E5A">idempotency test</text>

<g fill="none" stroke="#5F5E5A" stroke-width="0.5">
<rect x="460" y="192" width="180" height="200" rx="10" fill="#F1EFE8"/>
</g>
<text x="550" y="212" text-anchor="middle" dominant-baseline="central" font-size="14" font-weight="500" fill="#2C2C2A">Tuần 18-19</text>
<text x="550" y="232" text-anchor="middle" dominant-baseline="central" font-size="12" fill="#5F5E5A">Kết nối 2 hệ</text>
<text x="550" y="248" text-anchor="middle" dominant-baseline="central" font-size="12" fill="#5F5E5A">thống, Security</text>
<text x="550" y="278" text-anchor="middle" dominant-baseline="central" font-size="14" font-weight="500" fill="#2C2C2A">Tuần 20-22</text>
<text x="550" y="298" text-anchor="middle" dominant-baseline="central" font-size="12" fill="#5F5E5A">Unit, integration</text>
<text x="550" y="314" text-anchor="middle" dominant-baseline="central" font-size="12" fill="#5F5E5A">test đầy đủ</text>
<text x="550" y="344" text-anchor="middle" dominant-baseline="central" font-size="14" font-weight="500" fill="#2C2C2A">Tuần 23-26</text>
<text x="550" y="364" text-anchor="middle" dominant-baseline="central" font-size="12" fill="#5F5E5A">Hoàn thiện docs</text>
</svg>

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

## Giai đoạn 3 — Tháng 5–6: Tích hợp & hoàn thiện {#giai-doan-3}

- Kết nối 2 sub-project: Payment Gateway gọi vào Core Banking để cập nhật số dư thực tế
- Bổ sung Spring Security cho API (authentication/authorization)
- Viết test kỹ: unit test + integration test
- Viết README / design doc — giải thích các quyết định kiến trúc
- Tổng hợp lý do đằng sau các quyết định kiến trúc chính: vì sao chọn Saga thay vì 2PC, vì sao thiết kế ledger theo kiểu double-entry, vì sao tách 2 sub-project...

---

## Phương pháp học

- **Học trước, code sau**: mỗi module chính đều bắt đầu bằng việc đọc tài liệu gốc (Spring docs, ISO 20022 spec), không phải đọc để "biết" mà đọc để hiểu vì sao thiết kế như vậy.
- **Ghi chép tay song song**: dùng sổ tay chia 2 phần —
  - *Khái niệm học được*: kiến thức tổng quát, có thể tái dùng về sau
  - *Nhật ký dự án*: quyết định kiến trúc, vấn đề gặp phải, cách giải quyết — đây chính là nguyên liệu cho design doc
- **Ưu tiên hiểu sâu hơn tốc độ**: timeline 3–6 tháng là ước lượng, không phải deadline cứng.

---

## Nhật ký tiến độ

> Phần này sẽ được cập nhật theo thời gian khi triển khai từng giai đoạn. Chi tiết theo từng giai đoạn xem tại [Devlog](/devlog/).

- [ ] Giai đoạn 1: Core Banking
- [ ] Giai đoạn 2: Interbank Payment Gateway
- [ ] Giai đoạn 3: Tích hợp & hoàn thiện
