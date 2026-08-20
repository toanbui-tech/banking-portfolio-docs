# ADR-002: Immutable Double-Entry Ledger Pattern

## 1. Vấn đề

Cách quản lý số dư đơn giản kiểu `UPDATE accounts SET balance = balance + 100` không phù hợp với nghiệp vụ ngân hàng:

- Không thể giải trình dòng tiền đến từ đâu và đi đâu — chỉ còn con số cuối cùng, mất toàn bộ lịch sử.
- Một câu `UPDATE` sai (do bug hoặc do thao tác trực tiếp trên DB) có thể làm sai lệch số dư mà không để lại dấu vết.
- Không đáp ứng được yêu cầu kiểm toán, vốn cần truy vết được từng biến động số dư.

## 2. Lựa chọn

Sổ cái kế toán kép, chỉ ghi thêm (append-only double-entry ledger): mọi biến động số dư đều được biểu diễn bằng một cặp bút toán Nợ/Có cân bằng nhau, không bao giờ sửa hoặc xóa bản ghi đã ghi.

## 3. Lý do

- **Bảo toàn bất biến kế toán**: mỗi giao dịch luôn có tổng Nợ = tổng Có, kiểm tra được ngay ở tầng ứng dụng trước khi commit.
- **Số dư luôn tái lập được**: số dư tại bất kỳ thời điểm nào có thể tính lại từ tổng các bút toán lịch sử, thay vì phải tin tưởng tuyệt đối vào một cột `balance` có thể bị sửa sai.
- **Sửa sai bằng bút toán đảo, không sửa dữ liệu**: khi cần hủy một giao dịch, hệ thống ghi thêm một bút toán bù trừ (reversal entry) thay vì xóa/sửa bút toán gốc — giữ nguyên toàn bộ lịch sử cho mục đích audit.

## 4. Đánh đổi

- Bảng `journal_entries` tăng kích thước liên tục theo thời gian vì không bao giờ xóa dữ liệu.
- Truy vấn số dư "hiện tại" phức tạp hơn so với đọc thẳng một cột `balance` — cần cân nhắc giữ thêm cột số dư đã tính sẵn (materialized balance) song song với sổ cái, miễn là luôn có thể đối chiếu lại từ lịch sử bút toán khi cần.
