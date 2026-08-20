# ADR-001: Saga Orchestration vs Choreography cho Giao dịch Liên ngân hàng

## 1. Vấn đề

Một giao dịch chuyển tiền liên ngân hàng gồm nhiều bước độc lập, chạy trên các service khác nhau (Payment Gateway, Core Banking, đối tác bên ngoài):

1. Hold tiền tại Core Banking của ngân hàng gửi.
2. Gửi điện ISO 20022 (`pacs.008`) sang phía nhận.
3. Chờ phản hồi trạng thái (`pacs.002`) từ ngân hàng nhận.
4. Trừ tiền chính thức nếu thành công, hoặc giải tỏa (release) nếu bị từ chối.

Không thể dùng 2PC (Two-Phase Commit) vì các bên tham gia thuộc các hệ thống khác nhau, không chia sẻ transaction manager và không chấp nhận khóa tài nguyên kéo dài qua mạng. Cần một mô hình Saga — nhưng theo hướng nào: **Choreography** (các service tự lắng nghe sự kiện và tự quyết định bước kế tiếp) hay **Orchestration** (một thành phần trung tâm điều phối, ra lệnh cho từng bước)?

## 2. Lựa chọn

**Saga Orchestration**: một Orchestrator giữ state machine của giao dịch, chủ động gọi từng service tham gia và quyết định bước bù trừ khi có lỗi.

## 3. Lý do

- **Khả năng quan sát & audit**: chỉ cần một truy vấn để biết giao dịch đang ở bước nào — quan trọng với nghiệp vụ ngân hàng, nơi đội vận hành thường xuyên phải tra soát trạng thái giao dịch.
- **Luồng bù trừ tường minh**: khi một bước thất bại, Orchestrator biết chính xác cần gọi bước bù trừ nào (ví dụ `RELEASE_HOLD`), thay vì phải suy luận từ chuỗi sự kiện rải rác giữa nhiều service.
- **Kiểm soát timeout tập trung**: một nơi duy nhất quản lý timer chờ phản hồi, dễ áp dụng chính sách retry/timeout nhất quán.

## 4. Đánh đổi

- Orchestrator có thể trở thành điểm nghẽn hoặc single point of failure nếu không được thiết kế cẩn thận.
- Giảm giảm bớt tính loose-coupling so với Choreography — các service phải "biết" và tuân theo lệnh của Orchestrator thay vì hoàn toàn độc lập.
- Hướng khắc phục dự kiến: giữ Orchestrator ở dạng stateless (state machine lưu trong DB, không giữ trong bộ nhớ tiến trình), để có thể chạy nhiều instance song song mà không mất trạng thái khi một instance chết.
