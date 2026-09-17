---
title: Trạng thái dự án
description: Tóm tắt năng lực nghiệp vụ của Core Banking System theo ngôn ngữ phi kỹ thuật
---

# Trạng thái dự án

> Trang này tóm tắt Core Banking System đã làm được gì, trình bày theo **năng lực nghiệp vụ** thay vì thuật ngữ kỹ thuật — dành cho người đọc không chuyên sâu kỹ thuật. Thông tin dưới đây phản ánh đúng tiến độ thực tế tại thời điểm cập nhật, không phải kế hoạch. Chi tiết kỹ thuật xem tại [Devlog](/devlog/) và [ADR](/adr/).

| Năng lực nghiệp vụ | Trạng thái | Mô tả giá trị mang lại |
|---|---|---|
| Quản lý tài khoản khách hàng | <span class="status-badge done">Hoàn thành</span> | Hệ thống có thể tạo và theo dõi tài khoản của khách hàng |
| Ghi nhận giao dịch tài chính chính xác | <span class="status-badge done">Hoàn thành</span> | Mọi giao dịch được ghi sổ kép — đảm bảo tiền vào/ra luôn cân đối, không thể sai lệch số liệu |
| Đảm bảo tính toàn vẹn dữ liệu đa tiền tệ | <span class="status-badge done">Hoàn thành</span> | Hệ thống tự động ngăn chặn việc trộn lẫn nhiều loại tiền tệ trong cùng một giao dịch, tránh sai sót tài chính nghiêm trọng |
| Quản lý giao dịch như một đơn vị nghiệp vụ hoàn chỉnh | <span class="status-badge done">Hoàn thành</span> | Mỗi giao dịch được xử lý như một khối thống nhất, đảm bảo luôn cân đối thu-chi trước khi được chấp nhận vào hệ thống |
| Tính số dư tài khoản theo thời gian thực | <span class="status-badge done">Hoàn thành</span> | Khách hàng luôn xem được số dư chính xác tại mọi thời điểm |
| Ngăn chặn gian lận khi rút tiền đồng thời | <span class="status-badge done">Hoàn thành</span> | Hệ thống chống được tình huống 2 giao dịch rút tiền cùng lúc gây sai lệch số dư |
| Thông báo sự kiện giao dịch theo thời gian thực | <span class="status-badge done">Hoàn thành</span> | Hệ thống tự động thông báo cho các bộ phận liên quan ngay khi có giao dịch mới hoặc bị hoàn tác, không làm chậm quá trình xử lý giao dịch chính |
| Ghi nhận dữ liệu phục vụ kiểm toán/tuân thủ quy định | <span class="status-badge done">Hoàn thành</span> | Mọi giao dịch được tự động sao lưu chi tiết sang hệ thống lưu trữ riêng phục vụ thanh tra, kiểm toán, không cần truy vấn trực tiếp vào hệ thống giao dịch |
| Tối ưu tốc độ truy vấn số dư khi có nhiều người dùng cùng lúc | <span class="status-badge done">Hoàn thành</span> | Hệ thống lưu tạm kết quả tính toán số dư để phản hồi nhanh hơn, đồng thời đảm bảo dữ liệu luôn được cập nhật ngay khi có giao dịch mới, không hiển thị số liệu cũ |
| Vận hành trên hạ tầng cơ sở dữ liệu doanh nghiệp | <span class="status-badge done">Hoàn thành</span> | Hệ thống được thiết kế để chạy được trên cả 2 nền tảng cơ sở dữ liệu phổ biến trong ngành ngân hàng, minh chứng bằng bộ kiểm thử tự động chạy thành công trên cả hai |
| Triển khai tự động, dễ mở rộng, chịu tải cao | <span class="status-badge done">Hoàn thành</span> | Hệ thống được kiểm chứng hoạt động đúng khi chạy nhiều bản sao song song, đảm bảo không xảy ra sai sót tài chính dù có nhiều giao dịch đồng thời |
| Truy vết lịch sử thay đổi & hoàn tác giao dịch | <span class="status-badge todo">Chưa triển khai</span> | Sẽ cho phép xác định ai thực hiện giao dịch và hoàn tác khi cần, phục vụ kiểm toán |
| Xử lý khối lượng giao dịch lớn không làm chậm hệ thống | <span class="status-badge todo">Chưa triển khai</span> | Sẽ tách các tác vụ nặng ra xử lý nền, giúp hệ thống phản hồi nhanh dù giao dịch tăng đột biến |
| Tăng tốc độ truy vấn khi có nhiều người dùng cùng lúc | <span class="status-badge todo">Chưa triển khai</span> | Sẽ giảm tải cho cơ sở dữ liệu chính, phù hợp khi mở rộng quy mô |

<small>Cập nhật lần cuối theo commit ngày 2026-09-17: nền tảng Account/Ledger/Transaction đã hoàn thành và có test tự động, bổ sung Money value object (đa tiền tệ an toàn, scale chuẩn hóa xuyên suốt), Transaction aggregate root (đảm bảo bất biến Nợ=Có ở tầng domain), Outbox Pattern + Kafka event publishing (thông báo sự kiện giao dịch cho Audit/Compliance, Fraud Detection, Notification, Reporting), Redis cache cho truy vấn số dư (invalidation ngay khi có giao dịch mới), hỗ trợ chạy song song 2 nền tảng CSDL PostgreSQL/Oracle (45/45 test pass trên cả hai), và triển khai lên Kubernetes (verify Pessimistic Locking giữ vững qua 3 Pod chạy song song); năng lực nâng cao còn lại (xử lý bất đồng bộ khối lượng giao dịch lớn) đang trong kế hoạch, chưa bắt đầu triển khai.</small>
