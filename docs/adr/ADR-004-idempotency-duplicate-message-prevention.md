# ADR-004: Idempotency cho Lệnh Chuyển Tiền

## 1. Vấn đề

Trong hệ thống phân tán, một message hoặc request có thể bị gửi lại nhiều lần do timeout, retry ở tầng mạng, hoặc client tự động gửi lại khi không nhận được phản hồi kịp thời. Với một lệnh chuyển tiền, xử lý cùng một request hai lần tuyệt đối không được phép tạo ra hai giao dịch trừ tiền.

## 2. Lựa chọn

Yêu cầu client gửi kèm một `Idempotency-Key` duy nhất cho mỗi lệnh chuyển tiền. Trước khi xử lý, hệ thống kiểm tra key này trong một bảng ghi nhận trạng thái xử lý; nếu key đã tồn tại, trả lại kết quả đã xử lý trước đó thay vì chạy lại nghiệp vụ.

## 3. Lý do

- Đặt trách nhiệm chống trùng lặp vào đúng lớp biên (API layer) trước khi giao dịch chạm vào Saga hay Core Banking, tránh phải xử lý trùng lặp rải rác ở nhiều tầng.
- Lưu key trong cùng transaction/DB với dữ liệu nghiệp vụ giúp việc kiểm tra và ghi nhận key là atomic với chính giao dịch, tránh race condition giữa hai request trùng key đến gần như đồng thời.
- Trả lại đúng kết quả đã xử lý trước đó (thay vì chỉ từ chối request trùng) giúp client retry an toàn mà không cần logic đặc biệt ở phía họ.

## 4. Đánh đổi

- Cần chính sách dọn dẹp/hết hạn cho bảng idempotency key để tránh phình dữ liệu vô thời hạn.
- Phải xử lý rõ ràng trường hợp request thứ hai đến trong lúc request đầu vẫn đang xử lý dở (chưa có kết quả để trả lại) — cần từ chối tạm thời thay vì xử lý song song.
