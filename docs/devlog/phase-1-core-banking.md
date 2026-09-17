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
- **(2026-09-16)** DDD Refactor — `Money` value object, `Transaction` aggregate root, và ADR-008 — chi tiết ở mục [DDD Refactor](#ddd-refactor--money-value-object-và-transaction-aggregate-root) bên dưới.
- **(2026-09-17)** Outbox Pattern + Kafka event publishing — `Transaction` phát domain event, 4 consumer độc lập (Audit/Compliance, Fraud Detection, Notification, Reporting), và ADR-009 — chi tiết ở mục [Outbox Pattern & Kafka Event Publishing](#outbox-pattern--kafka-event-publishing) bên dưới.
- **(2026-09-17)** Redis cache cho `AccountService.getBalance()`, invalidation qua AFTER_COMMIT, và ADR-010 — chi tiết ở mục [Redis Cache cho Account Balance](#redis-cache-cho-account-balance) bên dưới.
- **(2026-09-17)** Oracle dual-profile support (45/45 test pass trên cả 2 database) và fix `Money` scale cố định — ADR-011, ADR-012 — chi tiết ở mục [Oracle Dual-Profile & Fix Money Scale](#oracle-dual-profile--fix-money-scale) bên dưới.

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

## DDD Refactor — Money value object và Transaction aggregate root

**(2026-09-16)** Refactor tầng domain theo hướng DDD, qua 3 bước liên tiếp trong ngày.

### Bước 1 — Money value object

- Thêm `Money` (package `shared/money`) — immutable, bọc `BigDecimal amount` + `Currency`; `add()`/`subtract()` throw `CurrencyMismatchException` nếu 2 `Money` khác loại tiền tệ.
- `LedgerEntry.amount` và `Account.currency` chuyển từ `BigDecimal`/`String` thô sang dùng `Money`/`Currency`.
- `LedgerService.validateBalanced()` giờ cộng tổng qua `Money` — một giao dịch trộn lẫn nhiều loại tiền tệ giữa các entry sẽ fail ngay (do `CurrencyMismatchException`) thay vì cộng sai lặng lẽ.
- Migration `V3__add_currency_to_ledger_entries.sql` thêm cột `ledger_entries.currency`, backfill từ `accounts.currency`.
- Test: `MoneyTest` (85 dòng), cập nhật `AccountServiceTest`, `LedgerServiceTest`.

### Bước 2 — Transaction aggregate root

- Thêm entity `Transaction` (package `ledger/`) làm Aggregate Root cho nhóm `LedgerEntry`: `Transaction.record(entries, createdBy)` validate cân bằng Nợ=Có ngay trong hàm dựng; `Transaction.reverse(reversedBy)` tạo giao dịch hoàn tác đối xứng. `Transaction.id` tự sinh (`UUID.randomUUID()`) ngay trong constructor thay vì để DB sinh qua `@GeneratedValue`, đúng nguyên tắc DDD — Aggregate tự chịu trách nhiệm tạo ra chính nó ở trạng thái hợp lệ.
- `LedgerService` được rút gọn, không còn tự validate cân bằng — trách nhiệm đó chuyển hẳn vào `Transaction`.
- Migration `V4__create_transactions_table.sql` tạo bảng `transactions`, backfill từ dữ liệu `ledger_entries` cũ.
- **Bug phát hiện khi debug:** sau khi implement, `Transaction` lưu được vào DB nhưng cascade sang `LedgerEntry` không chạy — sinh ra bản ghi rỗng, không đúng dữ liệu, không có exception nào được throw (lỗi "âm thầm sai"). Nguyên nhân: Spring Data JPA mặc định coi một entity là "đã tồn tại trong DB" nếu ID của nó khác `null` khi `save()` được gọi — vì `Transaction.id` được gán thủ công trong constructor, JPA hiểu nhầm đây là update (gọi `merge()`) thay vì insert mới (`persist()`), khiến cascade `PERSIST` không kích hoạt đúng.
- **Fix:** `Transaction` implement `Persistable<UUID>`, tự định nghĩa `isNew()` (qua trường `@Transient boolean isNew`, reset về `false` ở `@PostLoad`/`@PostPersist`) để báo cho JPA biết chính xác đây là entity mới, bất kể ID đã có giá trị hay chưa. Sau fix: 21/21 test pass, cascade hoạt động đúng.
- Test: `TransactionTest` (86 dòng).
- Quyết định thiết kế đầy đủ (phương án cân nhắc A/B, lý do chọn, 2 vấn đề kỹ thuật gặp phải — lỗi `MIN(uuid)` trên Postgres và `Persistable<UUID>` pitfall) đã ghi lại tại [ADR-008](/adr/ADR-008-transaction-aggregate-root).

### Bước 3 — Bổ sung test coverage cho lỗi phát hiện được

- Trong lúc build `Transaction` aggregate, phát hiện bug: `createdBy` không được set đúng trên một số đường đi — lỗi này trước đó chỉ bị chặn bởi ràng buộc `NOT NULL` của DB ở tầng integration test, không có assertion nào ở tầng unit test bắt được sớm hơn.
- Thêm assertion tường minh cho `createdBy` trên cả 2 happy path (`Transaction.record()` và `Transaction.reverse()`) trong `TransactionTest`, để một regression tương tự sau này fail ngay ở unit test, không cần chờ tới DB.

## Outbox Pattern & Kafka Event Publishing

**(2026-09-17)** Cần thông báo cho các hệ thống khác khi có `Transaction` mới hoặc bị hoàn tác, phục vụ 4 mục đích nghiệp vụ: Audit/Compliance, Notification, Fraud Detection, Reporting. Triển khai qua 3 bước.

### Bước 1 — Outbox Pattern

- `Transaction` (aggregate root) tự raise domain event (`TransactionPostedEvent`, `TransactionReversedEvent`) trong `record()`/`reverse()`, expose `pullDomainEvents()` — nhất quán với nguyên tắc DDD đã áp dụng ở [ADR-008](/adr/ADR-008-transaction-aggregate-root).
- `LedgerService` pull events sau khi `save()` thành công, map sang `OutboxEvent`, lưu vào bảng `outbox_events` trong **cùng transaction DB** với `Transaction`/`LedgerEntry` — tránh rủi ro Dual Write (ghi DB thành công nhưng gửi Kafka thất bại, hoặc ngược lại).
- `OutboxEventPublisher` (`@Scheduled`, mặc định 5s/lần) đọc các event chưa publish, gửi lên topic `transaction-posted-topic` (key = `transactionId` để giữ thứ tự), rồi đánh dấu `published_at`.
- Payload JSON self-contained: `eventId` (riêng biệt với `transactionId`, dùng cho idempotency), `transactionId`, `createdBy`, `occurredAt`, `entries[]`, `eventType` nhúng trực tiếp vào payload (không dùng Kafka header).
- Migration `V5__create_outbox_events_table.sql`.

### Bước 2 — Audit Compliance Consumer (idempotent)

- `AuditComplianceConsumer` lắng nghe `transaction-posted-topic` (groupId `audit-compliance-group`), ghi vào bảng `compliance_records` — **1 dòng cho mỗi `LedgerEntry`** (không gộp theo transaction), vì compliance/audit ngân hàng thật cần biết account cụ thể nào liên quan (debit/credit), không chỉ tổng giá trị giao dịch.
- Idempotent qua bảng `processed_events` (khóa theo `eventId`) — bắt buộc vì Kafka chỉ đảm bảo *at-least-once delivery*, message có thể bị gửi lại.
- Migration `V6__create_processed_events_table.sql`, `V7__create_compliance_records_table.sql`.
- Test: `AuditComplianceConsumerIntegrationTest`, `TransactionToComplianceEndToEndTest` (end-to-end thật, không mock Kafka).

### Bước 3 — 3 PoC Consumer

- `FraudDetectionConsumer`, `NotificationConsumer`, `ReportingConsumer` — mỗi consumer 1 `groupId` riêng (`fraud-detection-group`, `notification-group`, `reporting-group`) trên cùng topic, chỉ log để chứng minh kiến trúc publish/subscribe hoạt động đúng cho nhiều consumer độc lập — không có logic nghiệp vụ thật (không có rule phát hiện gian lận/gửi thông báo/tạo báo cáo thật).

### Vấn đề kỹ thuật gặp phải

1. **Jackson 3, không phải Jackson 2.** Spring Boot 4.1.1 dùng `tools.jackson.*` — phải dùng `JacksonJsonSerializer` thay vì `JsonSerializer`, thêm dependency `spring-boot-starter-json` riêng.
2. **Bẫy nghiêm trọng:** Spring Boot chỉ nạp 1 file `application.properties` đầu tiên tìm thấy, không merge main + test — nếu tạo file `application-test.properties` riêng, nó ghi đè toàn bộ cấu hình DB/Flyway thay vì bổ sung. Fix bằng `@SpringBootTest(properties = ...)` inline trong annotation.
3. **Phát hiện quan trọng nhất:** raw `spring-kafka` không đủ để Spring Boot 4 tự động cấu hình bean `KafkaTemplate` — cần thêm `spring-boot-starter-kafka`. Lỗi bị che giấu suốt Bước 1 vì `OutboxEventPublisher` luôn bị tắt trong test (`outbox.publisher.enabled=false`), chỉ lộ ra khi viết end-to-end test thật không mock.
4. **Testcontainers 2.x đổi tên artifact** `testcontainers-kafka` (khác tiền tố so với 1.x) — gây lỗi "version is missing" khó hiểu lúc đầu.

Quyết định thiết kế đầy đủ (Context, Options Considered A/B, Decision, Consequences kèm 4 vấn đề kỹ thuật trên) đã ghi lại tại [ADR-009](/adr/ADR-009-outbox-pattern-kafka-event-publishing).

## Redis Cache cho Account Balance

**(2026-09-17)** `AccountService.getBalance()` tính động qua `SUM()` toàn bộ `LedgerEntry` mỗi lần gọi — không hiệu quả khi account có nhiều giao dịch. Thêm Redis cache-aside, qua 4 bước.

### Bước 1 — Setup Redis

- Thêm service `redis` (`redis:7-alpine`) vào `docker-compose.yml`. Port 6379 bị 1 container Redis khác trên máy chiếm dụng → đổi host port sang `6380` (tương tự lý do trước đó Postgres phải đổi sang 5434).
- Thêm dependency `spring-boot-starter-data-redis`. Cấu hình `spring.data.redis.host`/`port` và `app.cache.balance.ttl-seconds` (mặc định 3600) trong `application.properties`.

### Bước 2 — Cache-aside

- `AccountBalanceCache` (dùng `StringRedisTemplate`) — chỉ cache số tiền dạng chuỗi (`BigDecimal.toPlainString()`), không cache `currency` vì đọc thẳng từ `Account`, không đổi theo thời gian.
- `AccountService.getBalance()` đọc cache trước, miss thì tính từ DB rồi ghi lại cache (cache-aside).
- **Không dùng cache trong `withdraw()`:** tách riêng method `private computeBalanceFromDb()` tính thẳng từ DB, dùng nội bộ cho bước kiểm tra đủ số dư trong `withdraw()` — vì bước này nằm trong pessimistic lock, đọc cache ở đây có thể trả về balance cũ và làm mất tác dụng của Pessimistic Locking (xem [ADR-007](/adr/ADR-007-pessimistic-locking-withdraw)).

### Bước 3 — AFTER_COMMIT invalidation

- `AccountBalanceCacheEvictionListener` lắng nghe `TransactionPostedEvent`/`TransactionReversedEvent` — cùng domain event đã dùng cho Outbox/Kafka ở [ADR-009](/adr/ADR-009-outbox-pattern-kafka-event-publishing) (`LedgerService` publish event này vừa làm nội dung Outbox, vừa làm Spring `ApplicationEvent` nội bộ), không tạo event class mới.
- Dùng `@TransactionalEventListener(phase = AFTER_COMMIT)` thay vì evict trực tiếp trong cùng `@Transactional` — nếu evict trước khi commit, một request đọc đồng thời có thể query DB (vẫn thấy balance cũ vì transaction ghi chưa commit) rồi ghi đè lại balance cũ vào cache ngay sau evict, kẹt lại đến hết TTL. Evict ở AFTER_COMMIT thu hẹp đáng kể cửa sổ race này.

### Bước 4 — Test

- `AccountBalanceCacheTest` (unit, 78 dòng), `AccountServiceCacheTest` (unit, 95 dòng), `AccountBalanceCacheIntegrationTest` (144 dòng, Redis thật qua Testcontainers).
- Testcontainers 2.x không có module `testcontainers-redis` riêng (khác Kafka có `testcontainers-kafka` riêng) → dùng `GenericContainer` với image `redis:7-alpine` trực tiếp.
- Test regression + concurrency test cũ của `withdraw()` vẫn pass — xác nhận cache không ảnh hưởng invariant chống overdraft. Integration test riêng xác nhận balance không stale sau giao dịch mới.

Quyết định thiết kế đầy đủ (Context, 2 Options Considered, Decision, Consequences kèm 2 vấn đề kỹ thuật trên) đã ghi lại tại [ADR-010](/adr/ADR-010-redis-cache-account-balance).

## Oracle Dual-Profile & Fix Money Scale

**(2026-09-17)** Cần chứng minh khả năng làm việc với hệ quản trị CSDL doanh nghiệp (Oracle phổ biến trong ngân hàng Việt Nam) mà không ảnh hưởng đến 45 test đang pass trên PostgreSQL. Triển khai qua 4 bước, phát sinh thêm 1 bug thật cần fix riêng.

### Bước 1 — Setup Oracle

- Thêm service `oracle` (`gvenzl/oracle-free:23-slim-faststart`) vào `docker-compose.yml`, host port 1522 (container port 1521 — cùng lý do đổi port như Postgres/Redis trước đó, tránh xung đột port mặc định trên máy dev). Container Oracle khởi động chậm hơn đáng kể so với Postgres/Kafka/Redis dù đã dùng bản `slim-faststart`.
- Thêm dependency `ojdbc11` (driver JDBC), `flyway-database-oracle`.
- `application-oracle.properties` (profile `oracle`, kích hoạt qua `--spring.profiles.active=oracle`) — override datasource/driver, trỏ `spring.flyway.locations=classpath:db/migration/oracle`. Chạy song song với profile mặc định (Postgres), không thay thế.
- Viết `README.md` mới, ghi lại port mapping, cách chạy app/test theo từng profile, cấu trúc migration.

### Bước 2 — Tách migration theo vendor & viết lại 7 file cho Oracle

- Tách `db/migration/` thành `db/migration/postgresql/` (V1-V7 cũ, chuyển nguyên vẹn) và `db/migration/oracle/` (V1-V7 viết lại theo dialect Oracle).
- 4 điểm khác biệt dialect chính:
  1. **UUID → `RAW(16)`** cho mọi cột id/khóa ngoại.
  2. **`UPDATE ... FROM`** (cú pháp riêng Postgres) → correlated subquery ở V3, → `MERGE INTO` ở V4 (backfill `reversal_of_transaction_id`).
  3. **`JSONB` → `JSON`** (kiểu JSON native của Oracle 23ai).
  4. **Partial index** (`CREATE INDEX ... WHERE published_at IS NULL`) → function-based index tương đương (`CASE WHEN published_at IS NULL THEN created_at END`), vì Oracle không hỗ trợ partial index.
- Phát hiện phụ: `columnDefinition = "jsonb"` khai báo trên `OutboxEvent.java` không cần sửa cho Oracle, vì `ddl-auto=validate` không dùng `columnDefinition` để validate thực tế — `@JdbcTypeCode(SqlTypes.JSON)` tự thích ứng theo dialect đang chạy.

### Bước 3 — Chạy test trên cả 2 profile, phát hiện bug Money

- Chạy 45 test hiện có trên Oracle (`./mvnw test -Dspring.profiles.active=oracle`) — phát hiện Oracle `NUMBER` không giữ scale cố định lúc đọc (khác Postgres `NUMERIC` giữ nguyên scale khai báo, hành vi chuẩn của Oracle, không phải bug CSDL).
- Thử fix bằng `Currency.getDefaultFractionDigits()` (chuẩn ISO 4217) thì phát hiện vấn đề sâu hơn: VND theo ISO 4217 có 0 chữ số thập phân, nhưng toàn bộ domain model project (từ Audit Trail đến Redis) đã ngầm định VND có 2 chữ số thập phân xuyên suốt — dùng đúng chuẩn ISO 4217 sẽ throw exception cho các giá trị VND có phần thập phân đã tồn tại trong test/dữ liệu từ 4 tính năng trước.
- Quyết định: cố định `scale = 2` cho mọi currency thay vì theo ISO 4217 tuyệt đối. Sửa `Money.java`: constructor riêng enforce `setScale(2, RoundingMode.UNNECESSARY)`, mọi đường tạo `Money` (`of`, `zero`, `add`, `subtract`) đều đi qua constructor này nên đều được chuẩn hóa tự động.
- Quyết định thiết kế đầy đủ (2 Options Considered, lý do chọn, rủi ro đã ghi nhận cho multi-currency thật sau này) đã ghi lại tại [ADR-012](/adr/ADR-012-money-fixed-scale).

### Bước 4 — Kết quả

- 45/45 test pass trên cả 2 database (Postgres và Oracle), không cần sửa test theo profile — khác biệt CSDL xử lý hoàn toàn ở tầng cấu hình/migration, không rò lên tầng test.
- Quyết định thiết kế Oracle dual-profile đầy đủ (Options Considered, 5 vấn đề kỹ thuật khi viết lại migration) đã ghi lại tại [ADR-011](/adr/ADR-011-oracle-dual-profile-support).

## Khó khăn & giải pháp

_Sẽ cập nhật khi gặp vấn đề thực tế phát sinh trong quá trình xây dựng nghiệp vụ (ngoài phạm vi setup môi trường)._

## Khái niệm học được

_Ghi lại các khái niệm tổng quát (ACID, locking, audit trail...) có thể tái dùng về sau._
