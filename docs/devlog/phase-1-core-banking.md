# Giai đoạn 1 — Core Banking (Sub-project B)

**Trạng thái:** [Đang triển khai]

Xem mục tiêu đầy đủ của giai đoạn này tại [Lộ trình — Giai đoạn 1](/roadmap#giai-doan-1).

## Công việc đã hoàn thành

- Thiết lập môi trường dev ban đầu (Java, Maven, Docker Postgres, Flyway) — chi tiết ở mục [Thiết lập môi trường](#thiết-lập-môi-trường) bên dưới.
- Build Maven thành công (BUILD SUCCESS).
- Flyway migration chạy thành công, tạo bảng `accounts` và `ledger_entries`.

## Thiết lập môi trường

Log lại theo đúng thứ tự thời gian các vấn đề gặp phải khi setup môi trường dev lần đầu cho project.

### 1. Java version mismatch

- **Vấn đề:** `pom.xml` do Spring Initializr sinh ra mặc định yêu cầu Java 21, nhưng máy dev chỉ có sẵn JDK 17.
- **Nguyên nhân:** chọn sai target Java version lúc khởi tạo project trên Spring Initializr.
- **Xử lý:** hạ `java.version` trong `pom.xml` xuống `17`.

### 2. Maven local cache hỏng

- **Vấn đề:** build lỗi `zip file is empty` với file `objenesis-3.3.jar` trong `~/.m2/repository`.
- **Nguyên nhân:** artifact bị tải dở/hỏng trong cache local của Maven từ lần trước.
- **Xử lý:** xóa thư mục cache của package `objenesis` trong `~/.m2/repository`, để Maven tải lại từ remote repository.

### 3. Thiếu cấu hình DataSource

- **Vấn đề:** sau khi qua lỗi Java version, Spring Boot báo lỗi khởi động `Failed to determine a suitable driver class`.
- **Nguyên nhân:** `application.properties` chưa có cấu hình datasource nên Spring Boot không xác định được driver JDBC cần dùng.
- **Xử lý:** thêm `spring.datasource.url`, `spring.datasource.username`, `spring.datasource.password` trỏ tới PostgreSQL.

### 4. Xung đột port Docker

- **Vấn đề:** container Postgres của project không start được / xung đột port.
- **Nguyên nhân:** máy dev đã có sẵn một container Postgres khác (dùng cho công việc, chiếm port 5432 mặc định), đồng thời Windows cũng có PostgreSQL 17 cài dạng Service — cả hai cùng tranh chấp port 5432/5433.
- **Xử lý:** đổi port container Postgres của project sang port riêng 5434 trong `docker-compose.yml`.

### 5. Breaking change của Spring Boot 4.x với Flyway

- **Vấn đề:** có `flyway-core` trên classpath nhưng Flyway không tự chạy migration khi khởi động app.
- **Nguyên nhân:** Spring Boot 4.x đã tách auto-configuration của Flyway ra một module riêng; chỉ có `flyway-core` trên classpath không còn đủ để kích hoạt tự động như các bản Spring Boot trước.
- **Xử lý:** đổi dependency từ `flyway-core` sang `spring-boot-starter-flyway`.

### 6. Password authentication failed do volume Docker cũ

- **Vấn đề:** sau khi đổi port ở bước 4, Postgres vẫn báo `password authentication failed` dù password khai báo trong `docker-compose.yml` đã đúng.
- **Nguyên nhân:** volume Docker cũ đã được khởi tạo (init) với password từ lần chạy trước đó; Postgres chỉ áp dụng biến môi trường password khi khởi tạo volume lần đầu, không áp dụng lại cho volume đã tồn tại.
- **Xử lý:** chạy `docker compose down -v` để xóa volume cũ, khởi tạo lại container sạch từ đầu.

### 7. Lỗi timezone "Asia/Saigon" không hợp lệ

- **Vấn đề:** Postgres báo lỗi khởi động kết nối `FATAL: invalid value for parameter "TimeZone": "Asia/Saigon"`.
- **Nguyên nhân:** JDBC driver tự gửi tên timezone của hệ thống Windows (tên legacy `Asia/Saigon`) lên server, trong khi bản tzdata đóng gói trong image `postgres:16` không nhận diện tên này.
- **Xử lý:** hạ image Postgres xuống `postgres:15`, có bản tzdata nhận diện được tên `Asia/Saigon`.

### Kết quả

Sau khi xử lý đủ 7 vấn đề trên: build Maven thành công (BUILD SUCCESS), Flyway migration chạy và tạo thành công bảng `accounts`, `ledger_entries`.

## Khó khăn & giải pháp

_Sẽ cập nhật khi gặp vấn đề thực tế phát sinh trong quá trình xây dựng nghiệp vụ (ngoài phạm vi setup môi trường)._

## Khái niệm học được

_Ghi lại các khái niệm tổng quát (ACID, locking, audit trail...) có thể tái dùng về sau._
