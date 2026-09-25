# Banking & Fintech Architecture Portfolio

Trang tài liệu kiến trúc (VitePress) cho 2 hệ thống mô phỏng hạ tầng ngân hàng xây dựng bằng Java/Spring Boot.

🌐 **Site:** https://toanbui-tech.github.io/banking-portfolio-docs/

| Sub-project | Nội dung | Trạng thái |
| :--- | :--- | :--- |
| **B — Core Banking System** | Double-entry ledger, `Transaction` aggregate root, pessimistic locking, Outbox + Kafka, Redis cache, PostgreSQL/Oracle, Kubernetes | ✅ Hoàn thành Giai đoạn 1 |
| **A — Interbank Payment Gateway** | ISO 20022 (`pain.001`, `pacs.008`), Saga Orchestrator, EOD Settlement bằng Spring Batch | ⏳ Chưa bắt đầu |

## Điểm nổi bật của Core Banking

- **Số dư không lưu trực tiếp** — tính từ sổ cái kế toán kép append-only; invariant Nợ = Có nằm trong aggregate root.
- **Chống overdraft khi đồng thời** — `SELECT ... FOR UPDATE`, kiểm chứng bằng 5 request đồng thời phân tán qua 3 Pod Kubernetes.
- **Không Dual Write** — Outbox Pattern + Kafka, consumer idempotent.
- **Portable** — 45/45 test pass trên cả PostgreSQL và Oracle.
- **13 ADR** ghi lại quyết định kiến trúc theo format Vấn đề → Lựa chọn → Lý do → Đánh đổi, kèm vấn đề thực tế gặp phải.

## Cấu trúc tài liệu

```text
docs/
├── index.md             Trang chủ
├── roadmap.md           Lộ trình (nguồn sự thật cho toàn site)
├── project-status.md    Trạng thái theo năng lực nghiệp vụ (cho người đọc phi kỹ thuật)
├── core-banking/        Sub-project B
├── payment-gateway/     Sub-project A
├── adr/                 Architecture Decision Records
└── devlog/              Nhật ký phát triển theo giai đoạn
```

## Chạy cục bộ

Yêu cầu Node.js 20+.

```bash
npm ci                 # cài dependencies
npm run docs:dev       # dev server có hot reload
npm run docs:build     # build static site vào docs/.vitepress/dist
npm run docs:preview   # xem thử bản build
```

## Triển khai

Push lên `main` sẽ tự động build và deploy lên GitHub Pages qua [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml).
