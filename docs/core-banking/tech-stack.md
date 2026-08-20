# Công nghệ & Xử lý Concurrency trên Hot Accounts

> **[Chưa triển khai]** — code bên dưới minh họa cách tiếp cận dự kiến, chưa phải kết quả đã chạy thật.

## 1. Giải quyết bài toán Race Condition (Tài khoản nóng)

Khi một tài khoản nhận nhiều request rút/nạp tiền gần như đồng thời, nếu chỉ đọc số dư rồi cộng/trừ thông thường sẽ xảy ra lỗi **Lost Update**.

### Giải pháp dự kiến: Pessimistic Write Lock (`SELECT ... FOR UPDATE`)

```java
public interface AccountRepository extends JpaRepository<Account, UUID> {

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @QueryHints({@QueryHint(name = "jakarta.persistence.lock.timeout", value = "3000")})
    @Query("SELECT a FROM Account a WHERE a.accountNumber = :accNo")
    Optional<Account> findByAccountNumberForUpdate(@Param("accNo") String accountNumber);
}
```

### Tránh Deadlock khi chuyển tiền giữa 2 tài khoản

Nếu luồng 1 chuyển tiền A → B (khóa A rồi khóa B), đồng thời luồng 2 chuyển B → A (khóa B rồi khóa A) sẽ gây **Deadlock**.

**Khóa theo thứ tự cố định (Ordered Locking)**:
```java
public void transferMoney(String fromAcc, String toAcc, BigDecimal amount) {
    // Sắp xếp thứ tự khóa theo String compare để đảm bảo thứ tự luôn đồng nhất
    String firstLock = fromAcc.compareTo(toAcc) < 0 ? fromAcc : toAcc;
    String secondLock = fromAcc.compareTo(toAcc) < 0 ? toAcc : fromAcc;

    Account acc1 = accountRepo.findByAccountNumberForUpdate(firstLock).orElseThrow();
    Account acc2 = accountRepo.findByAccountNumberForUpdate(secondLock).orElseThrow();

    // Thực hiện tính toán và ghi sổ
}
```

Xem thêm lý do lựa chọn tại [ADR-003](/adr/ADR-003-pessimistic-vs-optimistic-locking-hot-accounts).

---

## 2. Audit Trail

Theo nguyên tắc double-entry bất biến ([ADR-002](/adr/ADR-002-double-entry-ledger-immutable-pattern)), mọi thay đổi số dư đều để lại vết qua chính các bút toán trong sổ cái — không sửa/xóa bản ghi, chỉ ghi thêm bút toán bù trừ khi cần hủy một giao dịch. Đây là cơ chế audit trail chính, không phụ thuộc vào một công cụ audit riêng biệt.
