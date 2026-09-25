# Running & Testing (planned)

> **[Not implemented yet]** — the steps and examples below are a plan and will be updated to match reality once the service runs.

## 1. Requirements (planned)
- JDK
- Docker & Docker Compose
- Maven

---

## 2. Running the project (planned)

```bash
cd subproject-a-payment-gateway
docker-compose up -d
mvn clean spring-boot:run
```

---

## 3. Sample test scenarios (planned)

### Create a transfer

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

### Trigger the EOD settlement job manually

```bash
curl -X POST http://localhost:8081/api/v1/ops/batch/eod-settlement
```

Real measurements will be recorded in [Devlog — Phase 2](/en/devlog/phase-2-payment-gateway) once available.
