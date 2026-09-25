---
layout: home

hero:
  name: "Banking & Fintech Systems"
  text: "Core Banking & Interbank Payment Gateway"
  tagline: "Hai hệ thống mô phỏng hạ tầng ngân hàng bằng Java/Spring: Double-Entry Core Banking Ledger & ISO 20022 Interbank Payment Gateway"
  actions:
    - theme: brand
      text: "Xem trạng thái dự án"
      link: /project-status
    - theme: alt
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
    details: Các bản ghi quyết định kiến trúc (ADR) theo format Vấn đề - Lựa chọn - Lý do - Đánh đổi, kèm vấn đề kỹ thuật thực tế gặp phải khi triển khai — 13 ADR, trong đó 9 ADR đã áp dụng trong Core Banking.
  - title: Lộ trình & Nhật ký tiến độ
    details: Lộ trình xây dựng 3-6 tháng, cùng nhật ký tiến độ theo từng giai đoạn — cập nhật trung thực khi triển khai, không phải trước.
---

## Tổng quan

Đây là hai hệ thống mô phỏng nghiệp vụ ngân hàng lõi, xây dựng bằng Java/Spring Boot theo [lộ trình](/roadmap) 3-6 tháng. Mỗi hệ thống tập trung vào một nhóm vấn đề kỹ thuật riêng:

1. **Toàn vẹn dữ liệu tài chính**: sổ cái kế toán kép bất biến (double-entry, append-only), đảm bảo Debit = Credit ở mọi giao dịch, kiểm soát xung đột trên tài khoản nóng.
2. **Giao dịch phân tán**: điều phối giao dịch liên ngân hàng bằng Saga Orchestration thay vì 2PC, xử lý idempotency và compensating transaction khi một bước thất bại.
3. **Chuẩn hóa thông điệp tài chính**: parse & validate message ISO 20022 (`pain.001`, `pacs.008`), quyết toán cuối ngày theo batch.

**Core Banking System đã hoàn thành Giai đoạn 1** (45/45 test pass trên PostgreSQL và Oracle, kiểm chứng chống overdraft qua 3 Pod Kubernetes). Payment Gateway là giai đoạn tiếp theo. Tiến độ chi tiết tại [Trạng thái dự án](/project-status) và [Devlog](/devlog/).

---

## Sơ đồ tổng thể 2 Sub-Project

<svg class="diagram" viewBox="0 0 680 280" role="img" aria-labelledby="overview-vi-title overview-vi-desc">
<title id="overview-vi-title">Tổng quan 2 sub-project</title>
<desc id="overview-vi-desc">Payment Gateway (Giai đoạn 2, chưa bắt đầu) sẽ gọi Core Banking (Giai đoạn 1, hoàn thành) qua REST nội bộ kèm Idempotency-Key.</desc>
<defs><marker id="overview-vi-arr" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path class="arrowhead" d="M2 1L8 5L2 9"/></marker></defs>
<rect class="box-muted" x="20" y="20" width="250" height="240" rx="12"/>
<text class="t" x="145" y="48" text-anchor="middle" dominant-baseline="central">A · Payment Gateway</text>
<text class="lbl" x="145" y="70" text-anchor="middle" dominant-baseline="central">Giai đoạn 2 — chưa bắt đầu</text>
<path class="edge" d="M36 88 L254 88"/>
<text class="s" x="36" y="116" text-anchor="start" dominant-baseline="central">pain.001 / pacs.008 (ISO 20022)</text>
<text class="s" x="36" y="150" text-anchor="start" dominant-baseline="central">Saga Orchestrator + bù trừ</text>
<text class="s" x="36" y="184" text-anchor="start" dominant-baseline="central">EOD Settlement (Spring Batch)</text>
<text class="s" x="36" y="218" text-anchor="start" dominant-baseline="central">Retry / dead-letter</text>
<rect class="box" x="410" y="20" width="250" height="240" rx="12"/>
<text class="t" x="535" y="48" text-anchor="middle" dominant-baseline="central">B · Core Banking</text>
<text class="lbl" x="535" y="70" text-anchor="middle" dominant-baseline="central">Giai đoạn 1 — hoàn thành</text>
<path class="edge" d="M426 88 L644 88"/>
<text class="s" x="426" y="116" text-anchor="start" dominant-baseline="central">Double-entry ledger, Nợ = Có</text>
<text class="s" x="426" y="150" text-anchor="start" dominant-baseline="central">Pessimistic lock chống overdraft</text>
<text class="s" x="426" y="184" text-anchor="start" dominant-baseline="central">Outbox + Kafka, Redis cache</text>
<text class="s" x="426" y="218" text-anchor="start" dominant-baseline="central">PostgreSQL / Oracle · K8s</text>
<path class="edge dashed" d="M272 140 L408 140" marker-end="url(#overview-vi-arr)"/>
<text class="lbl" x="340" y="112" text-anchor="middle" dominant-baseline="central">REST nội bộ</text>
<text class="lbl mono" x="340" y="126" text-anchor="middle" dominant-baseline="central">+ Idempotency-Key</text>
<text class="lbl" x="340" y="160" text-anchor="middle" dominant-baseline="central">(Giai đoạn 3)</text>
</svg>

**Sub-project A: Interbank Payment Gateway**
- Message parsing & validation cho `pain.001` / `pacs.008`
- Saga Orchestrator — điều phối & bù trừ giao dịch phân tán
- EOD Batch Settlement — Spring Batch, chunk-oriented
- Exception/ops handling — retry, dead-letter

Gọi sang Core Banking qua Internal REST, kèm header `Idempotency-Key`:

**Sub-project B: Core Banking System**
- Account Service — quản lý tài khoản, số dư tính động từ ledger
- Ledger Service + `Transaction` aggregate root — sổ cái double-entry (append-only), đảm bảo Debit = Credit
- Concurrency Guard — Pessimistic Lock (`SELECT ... FOR UPDATE`), verify qua 3 Pod K8s
- Outbox Pattern + Kafka, Redis cache, chạy song song PostgreSQL/Oracle

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
