# Công nghệ sử dụng & Stack kiến trúc

> **[Chưa triển khai]** — bảng dưới đây là stack dự kiến, bám theo phần "Đọc trước" của [Giai đoạn 2](/roadmap#giai-doan-2).

## 1. Bảng phân rã Tech Stack (dự kiến)

| Thành phần | Công nghệ / Thư viện | Lý do chọn lựa |
| :--- | :--- | :--- |
| **Backend Core** | Java, Spring Boot | Nền tảng chính của cả hai sub-project |
| **Data Access** | Spring Data JPA, Hibernate, Flyway | Version control cho DB schema |
| **Database** | PostgreSQL | Đã dùng chung với Sub-project B, thuận tiện tích hợp |
| **Orchestration** | Spring State Machine | Quản lý state machine cho Saga Orchestrator |
| **Batch Processing** | Spring Batch | Xử lý EOD Settlement theo mô hình chunk-oriented |
| **XML Processing** | JAXB | Parse & validate message ISO 20022 (`pain.001`, `pacs.008`) |
| **Testing** | JUnit, Spring Boot Test | Unit test & integration test cho các luồng nghiệp vụ |

---

## 2. Cấu hình Spring Batch cho EOD Settlement (dự kiến)

```java
@Bean
public Step settlementStep(JobRepository jobRepository,
                          PlatformTransactionManager txManager,
                          ItemReader<PendingSettlementRecord> reader,
                          ItemProcessor<PendingSettlementRecord, SettledTransaction> processor,
                          ItemWriter<SettledTransaction> writer) {
    return new StepBuilder("eodSettlementStep", jobRepository)
        .<PendingSettlementRecord, SettledTransaction>chunk(500, txManager)
        .reader(reader)
        .processor(processor)
        .writer(writer)
        .faultTolerant()
        .skip(CorruptedRecordException.class)
        .skipLimit(10)
        .retry(TransientDatabaseException.class)
        .retryLimit(3)
        .build();
}
```

Xem lý do chọn chunk-oriented tại [ADR-005](/adr/ADR-005-spring-batch-chunk-vs-tasklet-eod).
