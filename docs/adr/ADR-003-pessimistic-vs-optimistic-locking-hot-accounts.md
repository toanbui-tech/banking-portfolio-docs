# ADR-003: Pessimistic vs Optimistic Locking cho Hot Accounts

## 1. Vấn đề

Khi nhiều giao dịch đồng thời cùng đọc/ghi số dư của một tài khoản ("hot account" — ví dụ tài khoản thu phí dùng chung), cần một cơ chế khóa để tránh lost update (hai giao dịch cùng đọc số dư cũ, cùng ghi đè, làm mất một phần thay đổi).

Với **Optimistic Locking** (`@Version`), giao dịch đến sau khi đã có người khác sửa trước sẽ nhận `OptimisticLockException` và phải tự retry. Khi mức độ tranh chấp trên cùng một tài khoản cao, phần lớn giao dịch sẽ liên tục bị văng lỗi và phải retry nhiều lần, gây lãng phí và độ trễ khó đoán.

## 2. Lựa chọn

Dùng **Pessimistic Write Lock** (`SELECT ... FOR UPDATE`) cho các thao tác ghi số dư, kết hợp **khóa theo thứ tự cố định** (ordered locking) khi một giao dịch cần khóa nhiều tài khoản cùng lúc (ví dụ chuyển khoản A → B).

## 3. Lý do

- Khi mức độ tranh chấp cao, để các giao dịch xếp hàng chờ trong DB rồi chạy tuần tự hiệu quả hơn là để chúng liên tục thất bại và tự retry ở tầng ứng dụng.
- Khóa được giữ trong thời gian rất ngắn — chỉ trong phạm vi transaction đọc số dư, kiểm tra và ghi bút toán — nên không chặn hệ thống lâu.
- Khóa theo thứ tự cố định (ví dụ luôn khóa account có ID nhỏ hơn trước) triệt tiêu deadlock kinh điển khi hai giao dịch khóa chéo nhau (A→B đồng thời B→A).

## 4. Đánh đổi

- Độ trễ trên từng tài khoản đơn lẻ tăng nhẹ vì các giao dịch phải chờ nhau thay vì chạy song song hoàn toàn.
- Cần kỷ luật thiết kế: mọi nơi khóa nhiều tài khoản đều phải tuân theo cùng một quy tắc sắp thứ tự, nếu không deadlock vẫn có thể xảy ra.
