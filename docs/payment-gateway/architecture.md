# Kiến trúc hệ thống & Chuẩn ISO 20022

> **[Chưa triển khai]** — đây là thiết kế mục tiêu, sẽ điều chỉnh khi bắt tay vào code thật.

## 1. Sơ đồ luồng Saga Orchestration (Outbound Transfer)

Xem lý do chọn Orchestration thay vì Choreography tại [ADR-001](/adr/ADR-001-saga-orchestration-vs-choreography).

1. Client gửi `POST /api/v1/transfers` kèm header `Idempotency-Key`.
2. Payment Gateway API lưu `PaymentOrder` ở trạng thái `PENDING`, chuyển quyền xử lý cho Saga Orchestrator.
3. **Bước `HOLD_BALANCE`**: Orchestrator gọi Core Banking để phong tỏa số dư; nhận về tham chiếu hold, `PaymentOrder` chuyển trạng thái `HELD`.
4. **Bước `DISPATCH_ISO20022`**: Orchestrator sinh điện `pacs.008` và gửi sang cổng chuyển mạch (mock).
5. **Bước `RECEIVE`**: Orchestrator nhận trạng thái phản hồi từ cổng chuyển mạch, rồi rẽ nhánh:
   - Nếu thành công: gọi Core Banking `COMMIT_HOLD` → `PaymentOrder` chuyển `COMPLETED`.
   - Nếu thất bại: gọi Core Banking `RELEASE_HOLD` → `PaymentOrder` chuyển `REJECTED`, báo lỗi cho người gửi.

---

## 2. Cấu trúc Message ISO 20022 (mục tiêu)

### A. `pain.001` — đầy đủ: `pain.001.001.09` (Customer Credit Transfer Initiation)
Điện do khách hàng/doanh nghiệp khởi tạo gửi vào ngân hàng:
- `<GrpHdr>`: Message ID, thời gian tạo, thông tin bên gửi.
- `<PmtInf>`: chi tiết lô thanh toán, ngày hiệu lực.
- `<CdtTrfTxInf>`: người gửi (`Dbtr`), người nhận (`Cdtr`), số tiền (`Amt`), mục đích chuyển tiền (`RmtInf`).

### B. `pacs.008` — đầy đủ: `pacs.008.001.08` (FI to FI Customer Credit Transfer)
Điện chuyển tiếp liên ngân hàng giữa 2 định chế tài chính:
- `<IntrBkSttlmAmt>`: số tiền thanh toán giữa 2 ngân hàng.
- `<InstgAgt>` & `<InstdAgt>`: mã định danh ngân hàng gửi và nhận.
- `<ChargeBearer>`: phân bổ phí.

---

## 3. Idempotency (chống trùng lặp lệnh)

Xem lý do thiết kế tại [ADR-004](/adr/ADR-004-idempotency-duplicate-message-prevention).

```java
@Transactional
public PaymentResponse initiateTransfer(String idempotencyKey, TransferRequest request) {
    // 1. Kiểm tra idempotency record trong DB, cùng transaction với dữ liệu nghiệp vụ
    Optional<IdempotencyRecord> existing = idempotencyRepo.findByKey(idempotencyKey);
    if (existing.isPresent()) {
        if (existing.get().getStatus() == ProcessingStatus.IN_PROGRESS) {
            throw new ConcurrentTransferException("Transaction is currently being processed.");
        }
        return existing.get().getCachedResponse();
    }

    // 2. Ghi nhận key ở trạng thái đang xử lý
    idempotencyRepo.save(new IdempotencyRecord(idempotencyKey, ProcessingStatus.IN_PROGRESS));

    // 3. Khởi động Saga
    return sagaManager.start(request);
}
```
