# ADR-005: Spring Batch Chunk-Oriented Processing cho EOD Settlement

## 1. Vấn đề

Cuối ngày, hệ thống cần xử lý đối soát và quyết toán cho toàn bộ giao dịch phát sinh trong ngày. Nếu đọc toàn bộ dữ liệu vào bộ nhớ trong một Tasklet duy nhất, mức tiêu thụ RAM sẽ tỷ lệ thuận với số lượng giao dịch trong ngày — không ổn định và có nguy cơ `OutOfMemoryError` khi khối lượng giao dịch tăng.

## 2. Lựa chọn

Dùng Spring Batch theo mô hình **Chunk-Oriented Step** (Reader → Processor → Writer) thay vì một Tasklet xử lý toàn bộ trong một lần.

## 3. Lý do

- Xử lý theo từng chunk nhỏ giữ mức tiêu thụ RAM ổn định, không phụ thuộc vào tổng số lượng bản ghi cần xử lý.
- Spring Batch tự động checkpoint sau mỗi chunk — nếu job bị gián đoạn giữa chừng (crash, mất kết nối DB), có thể khởi động lại đúng vị trí dừng thay vì chạy lại từ đầu.
- Cơ chế `faultTolerant()` với skip/retry cho phép xử lý các bản ghi lỗi cục bộ (ví dụ dữ liệu đối soát bị hỏng) mà không làm hỏng toàn bộ job.

## 4. Đánh đổi

- Phức tạp hơn một Tasklet đơn giản: cần thiết kế Reader/Processor/Writer riêng biệt và cấu hình transaction boundary theo chunk.
- Cần chọn chunk size phù hợp — quá nhỏ làm tăng overhead transaction, quá lớn làm mất lợi ích về bộ nhớ; giá trị cụ thể sẽ được đo và điều chỉnh khi có dữ liệu thực tế.
