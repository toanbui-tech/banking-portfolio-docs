# Kiến trúc Double-Entry Ledger & Data Model

> **[Chưa triển khai]** — đây là thiết kế mục tiêu, sẽ điều chỉnh khi bắt tay vào code thật.

## 1. Mô hình Dữ liệu Kế toán Kép (Schema Design)

| Quan hệ | Bản chất | Ý nghĩa |
| :--- | :--- | :--- |
| `transactions` → `journal_entries` | 1:N | Mỗi giao dịch gồm nhiều bút toán, tối thiểu 2 dòng Nợ/Có cân bằng |
| `journal_entries` → `accounts` | N:1 | Mỗi bút toán thuộc về đúng một tài khoản |

### Cấu trúc Bảng Cơ sở dữ liệu:
- **`accounts`**:
  - `id` (UUID), `account_number` (VARCHAR 20 UNIQUE)
  - `account_type` (ASSET, LIABILITY, EQUITY, REVENUE, EXPENSE)
  - `currency` (VND, USD)
  - `current_balance` (DECIMAL 19,4), `held_balance` (DECIMAL 19,4)
  - `version` (BIGINT - Optimistic locking fallback)
- **`journal_entries`**:
  - `id` (UUID), `transaction_id` (UUID FK)
  - `account_id` (UUID FK)
  - `entry_type` (DEBIT / CREDIT)
  - `amount` (DECIMAL 19,4)
  - `created_at` (TIMESTAMP - Immutable)

---

## 2. Quy tắc Định khoản Chuẩn Kế toán Ngân hàng

Khi khách hàng A (Tài khoản CASA - Nợ phải trả của Ngân hàng / Liability) chuyển tiền cho khách hàng B cùng ngân hàng:

| Dòng Bút Toán | Tài Khoản | Loại TK | Phân Loại | Số Tiền |
| :--- | :--- | :--- | :--- | :--- |
| **Bút toán 1** | Khách hàng A (101001) | Liability | **DEBIT (Ghi Nợ)** | 5,000,000 VND |
| **Bút toán 2** | Khách hàng B (101002) | Liability | **CREDIT (Ghi Có)**| 5,000,000 VND |

**Kiểm tra tính cân đối trước khi Commit DB**:
```java
BigDecimal totalDebit = entries.stream()
    .filter(e -> e.getType() == EntryType.DEBIT)
    .map(JournalEntry::getAmount)
    .reduce(BigDecimal.ZERO, BigDecimal::add);

BigDecimal totalCredit = entries.stream()
    .filter(e -> e.getType() == EntryType.CREDIT)
    .map(JournalEntry::getAmount)
    .reduce(BigDecimal.ZERO, BigDecimal::add);

if (totalDebit.compareTo(totalCredit) != 0) {
    throw new UnbalancedTransactionException("Debit (" + totalDebit + ") must equal Credit (" + totalCredit + ")");
}
```
