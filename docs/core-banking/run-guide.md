# Khởi chạy & Kịch bản Kiểm thử (dự kiến)

> **[Chưa triển khai]** — các bước và kịch bản dưới đây là kế hoạch, sẽ cập nhật lại theo đúng thực tế khi service đã chạy được.

## 1. Khởi chạy hệ thống (dự kiến)
```bash
cd subproject-b-core-banking
docker-compose up -d postgres-core
mvn clean spring-boot:run
```

## 2. Kịch bản kiểm thử: tính toàn vẹn số dư dưới tải đồng thời

Mục tiêu: xác nhận khi nhiều luồng cùng rút tiền từ một tài khoản, số dư cuối cùng và tổng số bút toán trong sổ cái vẫn chính xác tuyệt đối — không có lost update.

```java
@Test
void testConcurrentWithdrawals_ShouldMaintainBalanceIntegrity() throws Exception {
    String accNo = "TEST_ACC_001";
    int threadCount = 100;
    BigDecimal withdrawAmount = new BigDecimal("100000");

    ExecutorService executor = Executors.newFixedThreadPool(20);
    CountDownLatch latch = new CountDownLatch(threadCount);

    for (int i = 0; i < threadCount; i++) {
        executor.submit(() -> {
            try {
                ledgerService.withdraw(accNo, withdrawAmount);
            } finally {
                latch.countDown();
            }
        });
    }

    latch.await(30, TimeUnit.SECONDS);

    // Kỳ vọng: số dư cuối cùng và số bút toán khớp chính xác với số luồng đã chạy thành công
    Account account = accountRepo.findByAccountNumber(accNo).orElseThrow();
    long entriesCount = journalRepo.countByAccountId(account.getId());
    assertThat(entriesCount).isEqualTo(threadCount);
}
```

Kết quả đo thực tế (throughput, độ trễ...) sẽ được ghi lại tại [Devlog — Giai đoạn 1](/devlog/phase-1-core-banking) khi có.
