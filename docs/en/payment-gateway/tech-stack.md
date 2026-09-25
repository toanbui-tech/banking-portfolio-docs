# Tech Stack & Architecture Components

> **[Not implemented yet]** — the table below is the planned stack, following the "Read first" part of [Phase 2](/en/roadmap#phase-2).

## 1. Tech stack breakdown (planned)

| Component | Technology / Library | Why |
| :--- | :--- | :--- |
| **Backend core** | Java, Spring Boot | Main platform of both sub-projects |
| **Data access** | Spring Data JPA, Hibernate, Flyway | Version control for the DB schema |
| **Database** | PostgreSQL | Shared with Sub-project B, easier integration |
| **Orchestration** | Spring State Machine | State machine for the Saga Orchestrator |
| **Batch processing** | Spring Batch | Chunk-oriented EOD settlement |
| **XML processing** | JAXB | Parse & validate ISO 20022 messages (`pain.001`, `pacs.008`) |
| **Testing** | JUnit, Spring Boot Test | Unit & integration tests for the business flows |

---

## 2. Spring Batch configuration for EOD settlement (planned)

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

Why chunk-oriented processing: [ADR-005](/en/adr/ADR-005-spring-batch-chunk-vs-tasklet-eod).
