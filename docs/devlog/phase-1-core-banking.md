# Giai đoạn 1 — Core Banking (Sub-project B)

**Trạng thái:** [Đang triển khai]

Xem mục tiêu đầy đủ của giai đoạn này tại [Lộ trình — Giai đoạn 1](/roadmap#giai-doan-1).

## Công việc đã hoàn thành

- Thiết lập môi trường dev ban đầu (Java, Maven, Docker Postgres, Flyway) — chi tiết ở mục [Thiết lập môi trường](#thiết-lập-môi-trường) bên dưới.
- Build Maven thành công (BUILD SUCCESS).
- Flyway migration chạy thành công, tạo bảng `accounts` và `ledger_entries`.
- Entity layer: `Account`, `LedgerEntry` map đúng schema migration V1 — chi tiết ở mục [Entity layer đã hoàn thành](#entity-layer-đã-hoàn-thành).
- `LedgerService.recordTransaction()` — validate cân bằng Nợ/Có trước khi lưu, chạy atomic trong 1 transaction.
- Unit test `LedgerServiceTest` (3 test case) — BUILD SUCCESS, Tests run: 3, Failures: 0, Errors: 0.
- `AccountService.getBalance()` — tính số dư động từ ledger thay vì lưu trực tiếp — chi tiết ở mục [AccountService — tính balance từ ledger](#accountservice--tính-balance-từ-ledger) bên dưới.
- Unit test `AccountServiceTest` (1 test case) — BUILD SUCCESS, Tests run: 4, Failures: 0, Errors: 0.
- `AccountService.withdraw()` — Pessimistic Locking (`SELECT ... FOR UPDATE`) ngăn race condition khi rút tiền đồng thời — chi tiết ở mục [Pessimistic Locking — ngăn race condition khi rút tiền](#pessimistic-locking--ngăn-race-condition-khi-rút-tiền) bên dưới.
- Unit test race condition `withdraw_shouldPreventOverdraft_whenConcurrentRequests` — BUILD SUCCESS, Tests run: 5, Failures: 0, Errors: 0.

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

## Entity layer đã hoàn thành

- `Account` entity (package `account/`): `id` (UUID), `accountNumber`, `accountType`, `currency`, `status`, `createdAt` — map đúng bảng `accounts` trong migration V1.
- `LedgerEntry` entity (package `ledger/`): `id`, `accountId`, `transactionId`, `entryType` (enum `DEBIT`/`CREDIT`), `amount` (`BigDecimal`), `createdAt` — map đúng bảng `ledger_entries`.
- Dùng enum `EntryType` thay vì `String` thô cho `entryType` — validate ở compile-time, khớp với CHECK constraint trong migration SQL. `@Enumerated(EnumType.STRING)` đảm bảo lưu tên chữ, không lưu index số.
- Dùng `BigDecimal` cho `amount`, không dùng `double`/`float` — tránh sai số làm tròn số thực trong hệ thống tài chính.

## LedgerService — logic validate cân bằng Nợ/Có

- Method `recordTransaction(List<LedgerEntry>)` — validate tổng Debit = tổng Credit trước khi lưu, throw `IllegalStateException` nếu lệch.
- `@Transactional` đảm bảo toàn bộ danh sách `LedgerEntry` được lưu atomic (tất cả hoặc không gì cả).
- `transactionId` được sinh trong service (không nhận từ ngoài) — đảm bảo mọi entry trong 1 lần gọi thuộc cùng 1 giao dịch logic.
- Dùng `BigDecimal.compareTo()` thay vì `equals()` khi so sánh tổng Nợ/Có — `equals()` coi `100.0` và `100.00` là khác nhau do khác scale, `compareTo()` so sánh đúng giá trị số học.

## Unit test và các lỗi phát hiện qua test

Viết `LedgerServiceTest` với 2 test case: giao dịch cân bằng phải thành công, giao dịch lệch phải throw exception. Trong quá trình chạy test phát hiện 2 lỗi, cả hai đều do dữ liệu test chưa hợp lệ, không phải lỗi logic nghiệp vụ:

1. **Foreign key constraint violation:** test ban đầu dùng UUID ngẫu nhiên làm `accountId` mà không tạo `Account` thật trước — Postgres từ chối vì `ledger_entries.account_id` có ràng buộc `REFERENCES accounts(id)`. Đây là bằng chứng cho thấy ràng buộc toàn vẹn dữ liệu ở tầng database hoạt động đúng như thiết kế. Sửa bằng cách thêm helper method tạo `Account` thật trong test trước khi test `LedgerEntry`.
2. **Value too long for varchar(20):** sau khi sửa lỗi 1, helper tạo `accountNumber` bằng cách nối UUID đầy đủ (36 ký tự) trong khi cột `account_number` giới hạn `VARCHAR(20)`. Sửa bằng cách rút gọn UUID xuống 8 ký tự đầu khi tạo `accountNumber` cho test.

Kết quả cuối: `Tests run: 3, Failures: 0, Errors: 0` — BUILD SUCCESS.

## AccountService — tính balance từ ledger

- Thêm 2 query vào `LedgerEntryRepository`: `sumDebitByAccountId`, `sumCreditByAccountId` — dùng JPQL với `COALESCE(SUM(...), 0)` để tránh `NULL` khi tài khoản chưa có giao dịch nào.
- `AccountService.getBalance(accountId)` = Tổng Credit - Tổng Debit, đúng quy tắc kế toán cho tài khoản khách hàng (nhóm Nợ phải trả): tăng ghi Có, giảm ghi Nợ.
- Viết `AccountServiceTest`: tạo 2 account, ghi 1 giao dịch qua `LedgerService` (100.00 CREDIT cho account, 100.00 DEBIT cho counterparty), xác nhận `getBalance()` trả về đúng 100.00.
- Kết quả: `Tests run: 4, Failures: 0, Errors: 0` — BUILD SUCCESS. Toàn bộ nền tảng Account/Ledger/Balance của Giai đoạn 1 đã hoạt động đúng.
- Đã viết ADR ghi lại quyết định thiết kế: ledger bất biến, balance tính động thay vì lưu trực tiếp (xem [ADR-006](/adr/ADR-006-derived-balance-vs-stored-balance)).

## Pessimistic Locking — ngăn race condition khi rút tiền

- Đọc trước: Optimistic vs Pessimistic Locking trong Spring Data JPA.
- Thêm `AccountRepository.findByIdForUpdate()` dùng `@Lock(LockModeType.PESSIMISTIC_WRITE)` — sinh SQL `SELECT ... FOR UPDATE` (Postgres cụ thể hiển thị `FOR NO KEY UPDATE`).
- Thêm `AccountService.withdraw(accountId, counterpartyAccountId, amount)`: khóa account, kiểm tra đủ số dư, ghi cặp `LedgerEntry` (DEBIT cho account, CREDIT cho counterparty) qua `LedgerService`.
- Viết test `withdraw_shouldPreventOverdraft_whenConcurrentRequests`: giả lập 2 thread cùng rút 80.00 từ tài khoản có 100.00, dùng `ExecutorService` + `CountDownLatch` + `AtomicInteger` để đếm số giao dịch thành công. Xác nhận đúng 1 trong 2 thread thành công.
- Kết quả: `Tests run: 5, Failures: 0, Errors: 0` — BUILD SUCCESS. Log Hibernate xác nhận cơ chế khóa hoạt động đúng (2 thread được tuần tự hóa, không chạy song song trên cùng account).
- Đã viết ADR-007 ghi lại lý do chọn Pessimistic thay vì Optimistic Locking cho bài toán này (xem [docs/adr/](/adr/)).

## Khó khăn & giải pháp

_Sẽ cập nhật khi gặp vấn đề thực tế phát sinh trong quá trình xây dựng nghiệp vụ (ngoài phạm vi setup môi trường)._

## Khái niệm học được

_Ghi lại các khái niệm tổng quát (ACID, locking, audit trail...) có thể tái dùng về sau._
