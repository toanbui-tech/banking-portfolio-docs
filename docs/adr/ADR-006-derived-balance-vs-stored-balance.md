# ADR-006: Ledger Bất biến, Balance Tính Động Thay Vì Lưu Trực Tiếp

## 1. Vấn đề

Cần lưu trữ số dư tài khoản (balance) sao cho luôn chính xác, có thể kiểm chứng (auditable), và không thể bị sửa đổi trái phép.

## 2. Lựa chọn

Không lưu `balance` như một cột trực tiếp trên bảng `accounts`. Thay vào đó, mỗi giao dịch được ghi thành các bản ghi `LedgerEntry` bất biến (immutable, append-only) trong bảng `ledger_entries`, và balance được tính động bằng `SUM(CREDIT) - SUM(DEBIT)` mỗi khi cần truy vấn — implement qua `AccountService.getBalance()`, dùng 2 query JPQL riêng biệt `sumCreditByAccountId`/`sumDebitByAccountId` trong `LedgerEntryRepository`.

## 3. Lý do

- Nếu lưu balance trực tiếp và update mỗi lần giao dịch, một lỗi code hoặc thao tác sai có thể làm sai lệch số dư mà không để lại dấu vết để truy ngược nguyên nhân.
- Thiết kế append-only đảm bảo mọi thay đổi số dư đều có bằng chứng dạng bản ghi giao dịch cụ thể — đúng nguyên tắc audit trail: không bao giờ "sửa" bản ghi, chỉ "thêm" bản ghi mới.
- Balance luôn nhất quán với lịch sử giao dịch một cách toán học (derived state), loại bỏ khả năng balance và lịch sử giao dịch bị lệch nhau do bug đồng bộ.

## 4. Đánh đổi

- Tính balance tốn chi phí truy vấn (`SUM()` mỗi lần gọi) thay vì đọc trực tiếp 1 cột — với tài khoản có rất nhiều giao dịch, hiệu năng có thể giảm theo thời gian. Chưa cần xử lý ở giai đoạn hiện tại, nhưng là điểm cần lưu ý khi mở rộng (ví dụ dùng bảng snapshot balance định kỳ nếu hệ thống lớn hơn).
- Logic tính toán phức tạp hơn một chút so với đọc/ghi trực tiếp một cột số.
