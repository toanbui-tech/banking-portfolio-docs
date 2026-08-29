# ADR-007: Pessimistic Locking cho Xử lý Rút tiền, Thay vì Optimistic Locking

## 1. Vấn đề

Cần ngăn race condition khi nhiều giao dịch rút tiền đồng thời tác động lên cùng một tài khoản — cụ thể là bài toán "check-then-act": 2 giao dịch có thể cùng lúc kiểm tra số dư đủ, rồi cùng rút tiền, dẫn tới tài khoản bị âm số dư dù mỗi giao dịch riêng lẻ đều hợp lệ tại thời điểm kiểm tra.

## 2. Lựa chọn

Dùng **Pessimistic Locking** (`@Lock(LockModeType.PESSIMISTIC_WRITE)` trong `AccountRepository.findByIdForUpdate()`, sinh câu SQL `SELECT ... FOR UPDATE`) thay vì Optimistic Locking (`@Version`). Khi `AccountService.withdraw()` bắt đầu, nó khóa dòng `Account` tương ứng — giao dịch thứ hai muốn thao tác cùng account phải chờ giao dịch thứ nhất commit hoặc rollback mới được đọc/tính balance tiếp.

## 3. Lý do

- Thiết kế hệ thống hiện tại không lưu cột `balance` trực tiếp trên `Account` (xem [ADR-006](/adr/ADR-006-derived-balance-vs-stored-balance) — balance được tính động qua `SUM()` từ `ledger_entries`). Vì `Account` không có trường nào bị ghi đè trực tiếp khi giao dịch xảy ra, Optimistic Locking (`@Version`) không phát huy tác dụng — nó chỉ phát hiện xung đột khi chính bản ghi entity bị ghi đè (lost update), trong khi vấn đề ở đây là race condition dạng check-then-act (đọc số dư rồi hành động dựa trên số dư đó), không phải lost update.
- Pessimistic Locking giải quyết đúng bài toán: khóa `Account` trong suốt quá trình đọc balance, kiểm tra đủ tiền, và ghi giao dịch — đảm bảo toàn bộ chuỗi thao tác là atomic đối với account đó.
- Đã viết test giả lập 2 thread cùng gọi `withdraw()` đồng thời trên cùng 1 account có số dư 100.00, mỗi thread rút 80.00 — xác nhận chỉ đúng 1 thread thành công, thread còn lại nhận `IllegalStateException` (insufficient balance). Log Hibernate xác nhận câu SQL `SELECT ... FOR NO KEY UPDATE` được sinh ra và 2 thread được tuần tự hóa đúng như thiết kế.

## 4. Đánh đổi

- Pessimistic Locking làm giảm khả năng xử lý song song (throughput) cho các giao dịch trên cùng một account, vì giao dịch thứ hai phải chờ thay vì được xử lý ngay — chấp nhận được vì tính đúng đắn (không cho phép âm số dư) quan trọng hơn tốc độ trong ngữ cảnh này.
- Nếu giao dịch giữ lock quá lâu (do logic phức tạp hoặc lỗi treo), có thể gây nghẽn cho các giao dịch khác chờ cùng account — cần cân nhắc timeout cho lock khi mở rộng hệ thống sau này.
