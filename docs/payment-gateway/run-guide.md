# Hướng dẫn khởi chạy & Kiểm thử (dự kiến)

> **[Chưa triển khai]** — các bước và ví dụ dưới đây là kế hoạch, sẽ cập nhật lại theo đúng thực tế khi service đã chạy được.

## 1. Yêu cầu môi trường (dự kiến)
- JDK
- Docker & Docker Compose
- Maven

---

## 2. Các bước chạy dự án (dự kiến)

```bash
cd subproject-a-payment-gateway
docker-compose up -d
mvn clean spring-boot:run
```

---

## 3. Kịch bản test mẫu (dự kiến)

### Tạo giao dịch chuyển tiền

```bash
curl -X POST http://localhost:8081/api/v1/payments/outbound \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: TX-20260101-0001" \
  -d '{
    "sourceAccount": "1098234871",
    "beneficiaryAccount": "9988776655",
    "beneficiaryBankBic": "VCBKVNVX",
    "amount": 15000000.00,
    "currency": "VND",
    "narrative": "Thanh toan hop dong dich vu"
  }'
```

### Trigger EOD Settlement Job thủ công

```bash
curl -X POST http://localhost:8081/api/v1/ops/batch/eod-settlement
```

Kết quả đo thực tế sẽ được ghi lại tại [Devlog — Giai đoạn 2](/devlog/phase-2-payment-gateway) khi có.
